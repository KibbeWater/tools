// minecraft-paintings — WASM helpers for the painting pack builder tool.
//
// Responsibilities split with JS:
//   Rust (this crate):
//     - decode an image (png/jpeg/webp/gif/bmp), honouring EXIF orientation
//     - crop it and resample to the painting's exact pixel size
//     - encode the result as PNG
//     - pack a set of (path, bytes) entries into a single zip blob, and read one back
//
//   JS side:
//     - works out the crop rectangle and output size from the project settings
//       (the same maths drives the live canvas preview)
//     - lays out the pack files and feeds them to `build_zip`
//
// Resampling happens here rather than on a canvas because browsers downscale
// very differently; Lanczos in Rust gives the same result everywhere.

use std::io::Cursor;

use image::imageops::FilterType;
use image::{DynamicImage, ImageDecoder, ImageFormat, ImageReader};
use serde::Deserialize;
use wasm_bindgen::prelude::*;
use zip::write::SimpleFileOptions;
use zip::ZipWriter;

#[wasm_bindgen(start)]
pub fn start() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}

#[derive(Debug, Clone, Copy, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Filter {
    /// Lanczos3, for photos and paintings.
    Smooth,
    /// Nearest neighbour, keeps hard pixel edges for pixel art.
    Sharp,
}

#[derive(Debug, Clone, Copy, Deserialize)]
pub struct RenderOptions {
    /// Crop rectangle in source pixels, after EXIF orientation is applied.
    pub crop_x: u32,
    pub crop_y: u32,
    pub crop_w: u32,
    pub crop_h: u32,
    /// Output size in pixels.
    pub out_w: u32,
    pub out_h: u32,
    pub filter: Filter,
}

/// The upper bound on each output side: 16 blocks at 256 px per block.
const MAX_SIDE: u32 = 4096;

/// Crop, resample and PNG-encode an image. Returns the PNG bytes.
#[wasm_bindgen]
pub fn render_painting(bytes: &[u8], options: JsValue) -> Result<js_sys::Uint8Array, JsValue> {
    let opts: RenderOptions = serde_wasm_bindgen::from_value(options)
        .map_err(|e| JsValue::from_str(&format!("bad options: {e}")))?;
    let png = render_inner(bytes, opts).map_err(|e| JsValue::from_str(&e))?;
    Ok(js_sys::Uint8Array::from(png.as_slice()))
}

fn render_inner(bytes: &[u8], o: RenderOptions) -> Result<Vec<u8>, String> {
    if o.out_w == 0 || o.out_h == 0 || o.out_w > MAX_SIDE || o.out_h > MAX_SIDE {
        return Err(format!("output size {}×{} is out of range", o.out_w, o.out_h));
    }
    let img = decode(bytes)?;

    // Clamp the crop into the image so rounding on the JS side can't overrun it.
    let (w, h) = (img.width(), img.height());
    let x = o.crop_x.min(w.saturating_sub(1));
    let y = o.crop_y.min(h.saturating_sub(1));
    let cw = o.crop_w.clamp(1, w - x);
    let ch = o.crop_h.clamp(1, h - y);

    let filter = match o.filter {
        Filter::Smooth => FilterType::Lanczos3,
        Filter::Sharp => FilterType::Nearest,
    };
    let out = img
        .crop_imm(x, y, cw, ch)
        .resize_exact(o.out_w, o.out_h, filter)
        .into_rgba8();

    let mut buf = Cursor::new(Vec::new());
    out.write_to(&mut buf, ImageFormat::Png)
        .map_err(|e| format!("png encode: {e}"))?;
    Ok(buf.into_inner())
}

fn decode(bytes: &[u8]) -> Result<DynamicImage, String> {
    let reader = ImageReader::new(Cursor::new(bytes))
        .with_guessed_format()
        .map_err(|e| format!("read image: {e}"))?;
    if reader.format().is_none() {
        return Err("unsupported image format".into());
    }
    let mut decoder = reader
        .into_decoder()
        .map_err(|e| format!("decode image: {e}"))?;
    // Browsers rotate photos by their EXIF orientation, so the crop the user
    // picked is in rotated coordinates. Match that.
    let orientation = decoder.orientation().map_err(|e| format!("decode image: {e}"))?;
    let mut img = DynamicImage::from_decoder(decoder).map_err(|e| format!("decode image: {e}"))?;
    img.apply_orientation(orientation);
    Ok(img)
}

// ---------- Zip building ----------
// Same as the resource-pack crate; each tool ships its own WASM module.

/// Build a zip archive. `paths[i]` is the archive path of `files[i]` (a `Uint8Array`).
/// Returns the raw zip bytes as a `Uint8Array`.
#[wasm_bindgen]
pub fn build_zip(paths: Vec<String>, files: js_sys::Array) -> Result<js_sys::Uint8Array, JsValue> {
    if paths.len() != files.length() as usize {
        return Err(JsValue::from_str("build_zip: paths and files differ in length"));
    }
    let mut buf = Cursor::new(Vec::<u8>::new());
    {
        let mut zip = ZipWriter::new(&mut buf);
        let options = SimpleFileOptions::default()
            .compression_method(zip::CompressionMethod::Deflated)
            .unix_permissions(0o644);
        for (i, path) in paths.iter().enumerate() {
            let bytes = js_sys::Uint8Array::new(&files.get(i as u32)).to_vec();
            zip.start_file(path.as_str(), options)
                .map_err(|err| JsValue::from_str(&format!("zip start {path}: {err}")))?;
            use std::io::Write;
            zip.write_all(&bytes)
                .map_err(|err| JsValue::from_str(&format!("zip write {path}: {err}")))?;
        }
        zip.finish()
            .map_err(|err| JsValue::from_str(&format!("zip finish: {err}")))?;
    }
    Ok(js_sys::Uint8Array::from(buf.into_inner().as_slice()))
}

/// Read every file out of a zip archive.
/// Returns `{ path: string, bytes: Uint8Array }[]`, skipping directory entries.
#[wasm_bindgen]
pub fn read_zip(bytes: &[u8]) -> Result<js_sys::Array, JsValue> {
    let mut archive = zip::ZipArchive::new(Cursor::new(bytes))
        .map_err(|err| JsValue::from_str(&format!("not a zip file: {err}")))?;
    let out = js_sys::Array::new();
    for i in 0..archive.len() {
        let mut file = archive
            .by_index(i)
            .map_err(|err| JsValue::from_str(&format!("zip entry {i}: {err}")))?;
        if file.is_dir() {
            continue;
        }
        let mut data = Vec::with_capacity(file.size() as usize);
        use std::io::Read;
        file.read_to_end(&mut data)
            .map_err(|err| JsValue::from_str(&format!("zip read {}: {err}", file.name())))?;
        let entry = js_sys::Object::new();
        js_sys::Reflect::set(&entry, &"path".into(), &file.name().into())?;
        js_sys::Reflect::set(&entry, &"bytes".into(), &js_sys::Uint8Array::from(data.as_slice()))?;
        out.push(&entry);
    }
    Ok(out)
}

#[cfg(test)]
mod tests {
    use super::*;
    use image::{Rgba, RgbaImage};

    fn png(w: u32, h: u32) -> Vec<u8> {
        let img = RgbaImage::from_fn(w, h, |x, y| Rgba([(x * 10) as u8, (y * 10) as u8, 0, 255]));
        let mut buf = Cursor::new(Vec::new());
        img.write_to(&mut buf, ImageFormat::Png).unwrap();
        buf.into_inner()
    }

    #[test]
    fn crops_and_resizes_to_exact_size() {
        let out = render_inner(
            &png(20, 10),
            RenderOptions { crop_x: 5, crop_y: 0, crop_w: 10, crop_h: 10, out_w: 32, out_h: 32, filter: Filter::Smooth },
        )
        .unwrap();
        let img = image::load_from_memory(&out).unwrap();
        assert_eq!((img.width(), img.height()), (32, 32));
    }

    #[test]
    fn sharp_filter_keeps_source_pixels() {
        let out = render_inner(
            &png(2, 1),
            RenderOptions { crop_x: 0, crop_y: 0, crop_w: 2, crop_h: 1, out_w: 4, out_h: 2, filter: Filter::Sharp },
        )
        .unwrap();
        let img = image::load_from_memory(&out).unwrap().into_rgba8();
        assert_eq!(img.get_pixel(0, 0), img.get_pixel(1, 1));
        assert_eq!(img.get_pixel(3, 0), &Rgba([10, 0, 0, 255]));
    }

    #[test]
    fn clamps_an_overrunning_crop() {
        let out = render_inner(
            &png(8, 8),
            RenderOptions { crop_x: 6, crop_y: 6, crop_w: 10, crop_h: 10, out_w: 16, out_h: 16, filter: Filter::Smooth },
        );
        assert!(out.is_ok());
    }
}
