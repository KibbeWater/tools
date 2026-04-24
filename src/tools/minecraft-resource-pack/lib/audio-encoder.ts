// Bridge between the Rust-decoded PCM and the JS OGG Vorbis encoder.
import { createOggEncoder, type WasmMediaEncoder } from 'wasm-media-encoders';

let encoderPromise: Promise<WasmMediaEncoder<'audio/ogg'>> | null = null;

/**
 * Lazily instantiate (and cache) a single Ogg Vorbis encoder. The encoder
 * itself is reused across multiple encodings — we call `configure(...)` each
 * time with the target channels and sample rate.
 */
export function getOggEncoder(): Promise<WasmMediaEncoder<'audio/ogg'>> {
  if (!encoderPromise) encoderPromise = createOggEncoder();
  return encoderPromise;
}

export interface EncodeOptions {
  /** VBR quality, -1 .. 10. Default 5 (~128 kbps). */
  quality?: number;
}

/**
 * Encode planar PCM (as returned by the Rust `decode_audio`) to Ogg Vorbis.
 * Minecraft accepts up to 2 channels; Vorbis supports more but we clamp for safety.
 */
export async function encodePlanarToOgg(
  channels: Float32Array[],
  sampleRate: number,
  opts: EncodeOptions = {},
): Promise<Uint8Array> {
  const encoder = await getOggEncoder();
  const ch = Math.min(channels.length, 2) as 1 | 2;
  encoder.configure({
    sampleRate,
    channels: ch,
    vbrQuality: clamp(opts.quality ?? 5, -1, 10),
  });

  const head = encoder.encode(channels.slice(0, ch));
  const tail = encoder.finalize();
  const out = new Uint8Array(head.length + tail.length);
  out.set(head, 0);
  out.set(tail, head.length);
  return out;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
