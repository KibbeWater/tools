// minecraft-resource-pack — WASM helpers for the resource-pack builder tool.
//
// Responsibilities split with JS:
//   Rust (this crate):
//     - decode arbitrary audio (mp3/wav/flac/aac/m4a/ogg) → interleaved f32 PCM
//     - apply trim / gain / optional mono downmix / simple linear resample
//     - return PCM + channel/rate metadata to JS for OGG Vorbis encoding
//     - pack a set of (path, bytes) entries into a single zip blob
//
//   JS side:
//     - takes the decoded PCM and runs wasm-media-encoders to produce OGG Vorbis
//     - feeds the encoded OGG bytes back in via `build_zip`
//
// This split exists because no pure-Rust OGG Vorbis encoder cross-compiles
// cleanly to wasm32-unknown-unknown today.

use std::io::Cursor;

use serde::{Deserialize, Serialize};
use symphonia::core::audio::SampleBuffer;
use symphonia::core::codecs::{DecoderOptions, CODEC_TYPE_NULL};
use symphonia::core::formats::FormatOptions;
use symphonia::core::io::MediaSourceStream;
use symphonia::core::meta::MetadataOptions;
use symphonia::core::probe::Hint;
use wasm_bindgen::prelude::*;
use zip::write::SimpleFileOptions;
use zip::ZipWriter;

#[wasm_bindgen(start)]
pub fn start() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct DecodeOptions {
    /// Downmix to mono if true. Otherwise preserve original channels.
    #[serde(default)]
    pub mono: bool,
    /// Target sample rate. 0 means "keep source rate".
    #[serde(default)]
    pub target_sample_rate: u32,
    /// Trim: start offset in seconds.
    #[serde(default)]
    pub trim_start_sec: f32,
    /// Trim: end offset in seconds. 0 or negative means "end of file".
    #[serde(default)]
    pub trim_end_sec: f32,
    /// Linear gain multiplier (1.0 = unity). Computed from dB by JS.
    #[serde(default = "one")]
    pub gain: f32,
    /// Fade in/out in seconds. 0 disables.
    #[serde(default)]
    pub fade_in_sec: f32,
    #[serde(default)]
    pub fade_out_sec: f32,
}

fn one() -> f32 {
    1.0
}

impl Default for DecodeOptions {
    fn default() -> Self {
        Self {
            mono: false,
            target_sample_rate: 0,
            trim_start_sec: 0.0,
            trim_end_sec: 0.0,
            gain: 1.0,
            fade_in_sec: 0.0,
            fade_out_sec: 0.0,
        }
    }
}

#[derive(Debug, Serialize)]
pub struct DecodedAudio {
    /// Per-channel planar PCM (already trimmed/processed).
    pub channels: Vec<Vec<f32>>,
    pub sample_rate: u32,
    pub duration_sec: f32,
}

#[derive(Debug, thiserror::Error)]
enum DecodeError {
    #[error("no default audio track found")]
    NoDefaultTrack,
    #[error("symphonia error: {0}")]
    Symphonia(#[from] symphonia::core::errors::Error),
}

impl From<DecodeError> for JsValue {
    fn from(e: DecodeError) -> Self {
        JsValue::from_str(&e.to_string())
    }
}

/// Decode any supported audio file to planar f32 PCM with optional processing.
/// Returns `{ channels: Float32Array[], sampleRate: number, durationSec: number }`.
#[wasm_bindgen]
pub fn decode_audio(bytes: &[u8], options: JsValue) -> Result<JsValue, JsValue> {
    let opts: DecodeOptions = if options.is_undefined() || options.is_null() {
        DecodeOptions::default()
    } else {
        serde_wasm_bindgen::from_value(options)
            .map_err(|e| JsValue::from_str(&format!("bad options: {e}")))?
    };
    let decoded = decode_audio_inner(bytes, opts).map_err(JsValue::from)?;
    serde_wasm_bindgen::to_value(&decoded)
        .map_err(|e| JsValue::from_str(&format!("serialize error: {e}")))
}

fn decode_audio_inner(bytes: &[u8], opts: DecodeOptions) -> Result<DecodedAudio, DecodeError> {
    let cursor = Cursor::new(bytes.to_vec());
    let mss = MediaSourceStream::new(Box::new(cursor), Default::default());

    let probed = symphonia::default::get_probe().format(
        &Hint::new(),
        mss,
        &FormatOptions {
            prebuild_seek_index: false,
            seek_index_fill_rate: 0,
            enable_gapless: true,
        },
        &MetadataOptions::default(),
    )?;
    let mut format = probed.format;

    let track = format
        .tracks()
        .iter()
        .find(|t| t.codec_params.codec != CODEC_TYPE_NULL)
        .ok_or(DecodeError::NoDefaultTrack)?;
    let track_id = track.id;
    let mut decoder =
        symphonia::default::get_codecs().make(&track.codec_params, &DecoderOptions::default())?;

    let src_rate = track.codec_params.sample_rate.unwrap_or(44_100);
    let src_channels = track
        .codec_params
        .channels
        .map(|c| c.count())
        .unwrap_or(2)
        .max(1);

    let mut planar: Vec<Vec<f32>> = vec![Vec::new(); src_channels];

    loop {
        match format.next_packet() {
            Ok(packet) if packet.track_id() == track_id => match decoder.decode(&packet) {
                Ok(audio_buf) => {
                    let spec = *audio_buf.spec();
                    let mut buf = SampleBuffer::<f32>::new(audio_buf.capacity() as u64, spec);
                    buf.copy_interleaved_ref(audio_buf);
                    let interleaved = buf.samples();
                    let ch = spec.channels.count().max(1);
                    let frames = interleaved.len() / ch;
                    for i in 0..frames {
                        for c in 0..ch.min(src_channels) {
                            planar[c].push(interleaved[i * ch + c]);
                        }
                    }
                }
                Err(symphonia::core::errors::Error::DecodeError(_)) => continue,
                Err(e) => return Err(DecodeError::Symphonia(e)),
            },
            Ok(_) => continue,
            Err(symphonia::core::errors::Error::IoError(ref e))
                if e.kind() == std::io::ErrorKind::UnexpectedEof =>
            {
                break;
            }
            Err(symphonia::core::errors::Error::ResetRequired) => {
                break;
            }
            Err(e) => return Err(DecodeError::Symphonia(e)),
        }
    }

    // Trim.
    let total_frames = planar.iter().map(|c| c.len()).min().unwrap_or(0);
    let start_frame = ((opts.trim_start_sec.max(0.0)) * src_rate as f32) as usize;
    let end_frame = if opts.trim_end_sec > 0.0 {
        ((opts.trim_end_sec) * src_rate as f32) as usize
    } else {
        total_frames
    };
    let (start_frame, end_frame) = (
        start_frame.min(total_frames),
        end_frame.min(total_frames).max(start_frame),
    );
    for ch in planar.iter_mut() {
        *ch = ch[start_frame..end_frame].to_vec();
    }

    // Optional mono downmix.
    if opts.mono && planar.len() > 1 {
        let len = planar[0].len();
        let mut mono = Vec::with_capacity(len);
        for i in 0..len {
            let mut sum = 0.0;
            for ch in planar.iter() {
                sum += ch[i];
            }
            mono.push(sum / planar.len() as f32);
        }
        planar = vec![mono];
    }

    // Resample (simple linear) if requested and differs.
    let mut out_rate = src_rate;
    if opts.target_sample_rate > 0 && opts.target_sample_rate != src_rate {
        let target = opts.target_sample_rate;
        let ratio = target as f64 / src_rate as f64;
        for ch in planar.iter_mut() {
            let old = std::mem::take(ch);
            let new_len = (old.len() as f64 * ratio).round() as usize;
            let mut new_samples = Vec::with_capacity(new_len);
            for i in 0..new_len {
                let src_idx = i as f64 / ratio;
                let i0 = src_idx.floor() as usize;
                let i1 = (i0 + 1).min(old.len().saturating_sub(1));
                let frac = (src_idx - i0 as f64) as f32;
                let a = *old.get(i0).unwrap_or(&0.0);
                let b = *old.get(i1).unwrap_or(&0.0);
                new_samples.push(a + (b - a) * frac);
            }
            *ch = new_samples;
        }
        out_rate = target;
    }

    // Apply gain + fades.
    let gain = opts.gain;
    let fade_in_frames = ((opts.fade_in_sec.max(0.0)) * out_rate as f32) as usize;
    let fade_out_frames = ((opts.fade_out_sec.max(0.0)) * out_rate as f32) as usize;
    for ch in planar.iter_mut() {
        let len = ch.len();
        for (i, s) in ch.iter_mut().enumerate() {
            let mut g = gain;
            if fade_in_frames > 0 && i < fade_in_frames {
                g *= i as f32 / fade_in_frames as f32;
            }
            if fade_out_frames > 0 && i + fade_out_frames > len {
                let remaining = len.saturating_sub(i);
                g *= remaining as f32 / fade_out_frames as f32;
            }
            *s *= g;
        }
    }

    let frames = planar.first().map(|c| c.len()).unwrap_or(0);
    Ok(DecodedAudio {
        channels: planar,
        sample_rate: out_rate,
        duration_sec: frames as f32 / out_rate.max(1) as f32,
    })
}

// ---------- Zip building ----------

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ZipEntryInput {
    pub path: String,
    pub bytes: Vec<u8>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BuildZipInput {
    pub entries: Vec<ZipEntryInput>,
}

/// Build a zip archive from a list of `{ path, bytes }` entries.
/// Returns the raw zip bytes as a `Uint8Array`.
#[wasm_bindgen]
pub fn build_zip(input: JsValue) -> Result<js_sys::Uint8Array, JsValue> {
    let input: BuildZipInput = serde_wasm_bindgen::from_value(input)
        .map_err(|e| JsValue::from_str(&format!("bad zip input: {e}")))?;

    let mut buf = Cursor::new(Vec::<u8>::new());
    {
        let mut zip = ZipWriter::new(&mut buf);
        let options = SimpleFileOptions::default()
            .compression_method(zip::CompressionMethod::Deflated)
            .unix_permissions(0o644);
        for e in input.entries {
            zip.start_file(&e.path, options)
                .map_err(|err| JsValue::from_str(&format!("zip start {}: {err}", e.path)))?;
            use std::io::Write;
            zip.write_all(&e.bytes)
                .map_err(|err| JsValue::from_str(&format!("zip write {}: {err}", e.path)))?;
        }
        zip.finish()
            .map_err(|err| JsValue::from_str(&format!("zip finish: {err}")))?;
    }

    let bytes = buf.into_inner();
    Ok(js_sys::Uint8Array::from(bytes.as_slice()))
}
