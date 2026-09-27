// minecraft-server-icon — WASM helpers for the server icon tool.
//
// Responsibilities split with JS:
//   Rust (this crate):
//     - decode an image (png/jpeg/webp/gif/bmp/ico) once, honouring
//       EXIF orientation, and keep it around while the user tweaks the crop
//     - crop it, fit it into a 64×64 square and resample
//     - encode the result as a small PNG
//
//   JS side:
//     - works out the crop rectangle from the crop editor
//     - rasterises formats this crate can't read (SVG, AVIF, HEIC…) to PNG first
//
// Resampling happens here rather than on a canvas because browsers downscale
// very differently; Lanczos in Rust gives the same result everywhere.

use std::io::Cursor;

use image::codecs::png::{CompressionType, FilterType as PngFilter, PngEncoder};
use image::imageops::FilterType;
use image::{DynamicImage, ImageDecoder, ImageEncoder, ImageReader, Rgba, RgbaImage};
use serde::Deserialize;
use wasm_bindgen::prelude::*;

/// Minecraft only accepts a 64×64 PNG as `server-icon.png`.
pub const ICON_SIZE: u32 = 64;

/// The crop editor zooms in up to 8×, so the smallest crop is an eighth of the
/// short side. Sources are shrunk once on load until the short side is this
/// big: every re-render stays quick and the crop never drops below 64 px.
const WORKING_SHORT_SIDE: u32 = ICON_SIZE * 8;

#[wasm_bindgen(start)]
pub fn start() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}

#[derive(Debug, Clone, Copy, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Filter {
    /// Lanczos3, for photos and logos.
    Smooth,
    /// Nearest neighbour, keeps hard pixel edges for pixel art.
    Sharp,
}

#[derive(Debug, Clone, Copy, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Fit {
    /// Fill the square with the crop, stretching it if it isn't square.
    Fill,
    /// Scale the crop to fit inside the square and pad the rest with `background`.
    Contain,
}

#[derive(Debug, Clone, Copy, Deserialize)]
pub struct RenderOptions {
    /// Crop rectangle in source pixels, after EXIF orientation is applied.
    pub crop_x: u32,
    pub crop_y: u32,
    pub crop_w: u32,
    pub crop_h: u32,
    pub fit: Fit,
    pub filter: Filter,
    /// RGBA fill behind the image. Alpha 0 keeps it transparent.
    pub background: [u8; 4],
}

/// A decoded source image, kept in WASM memory between renders.
#[wasm_bindgen]
pub struct IconSource {
    img: RgbaImage,
    /// Size before any working downscale; crops come in these coordinates.
    width: u32,
    height: u32,
}

#[wasm_bindgen]
impl IconSource {
    /// Decode an image file. Fails on formats this crate can't read.
    #[wasm_bindgen(constructor)]
    pub fn new(bytes: &[u8]) -> Result<IconSource, JsValue> {
        Self::decode(bytes).map_err(|e| JsValue::from_str(&e))
    }

    #[wasm_bindgen(getter)]
    pub fn width(&self) -> u32 {
        self.width
    }

    #[wasm_bindgen(getter)]
    pub fn height(&self) -> u32 {
        self.height
    }

    /// Render the 64×64 icon and return it PNG-encoded.
    pub fn render(&self, options: JsValue) -> Result<js_sys::Uint8Array, JsValue> {
        let opts: RenderOptions = serde_wasm_bindgen::from_value(options)
            .map_err(|e| JsValue::from_str(&format!("bad options: {e}")))?;
        let png = self.render_png(opts).map_err(|e| JsValue::from_str(&e))?;
        Ok(js_sys::Uint8Array::from(png.as_slice()))
    }
}

impl IconSource {
    fn decode(bytes: &[u8]) -> Result<IconSource, String> {
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

        let (width, height) = (img.width(), img.height());
        if width == 0 || height == 0 {
            return Err("image is empty".into());
        }
        let short = width.min(height);
        let img = if short > WORKING_SHORT_SIDE {
            let k = WORKING_SHORT_SIDE as f64 / short as f64;
            let w = ((width as f64 * k).round() as u32).max(1);
            let h = ((height as f64 * k).round() as u32).max(1);
            img.resize_exact(w, h, FilterType::Lanczos3).into_rgba8()
        } else {
            img.into_rgba8()
        };
        Ok(IconSource { img, width, height })
    }

    fn render_png(&self, o: RenderOptions) -> Result<Vec<u8>, String> {
        let icon = self.render_rgba(o);
        let mut buf = Vec::new();
        PngEncoder::new_with_quality(&mut buf, CompressionType::Best, PngFilter::Adaptive)
            .write_image(icon.as_raw(), ICON_SIZE, ICON_SIZE, image::ExtendedColorType::Rgba8)
            .map_err(|e| format!("png encode: {e}"))?;
        Ok(buf)
    }

    fn render_rgba(&self, o: RenderOptions) -> RgbaImage {
        // Map the crop from original pixels onto the working copy, and clamp it
        // so rounding on the JS side can't overrun the image.
        let (w, h) = self.img.dimensions();
        let kx = w as f64 / self.width as f64;
        let ky = h as f64 / self.height as f64;
        let x = ((o.crop_x as f64 * kx).round() as u32).min(w - 1);
        let y = ((o.crop_y as f64 * ky).round() as u32).min(h - 1);
        let cw = ((o.crop_w as f64 * kx).round() as u32).clamp(1, w - x);
        let ch = ((o.crop_h as f64 * ky).round() as u32).clamp(1, h - y);

        let filter = match o.filter {
            Filter::Smooth => FilterType::Lanczos3,
            Filter::Sharp => FilterType::Nearest,
        };
        let crop = image::imageops::crop_imm(&self.img, x, y, cw, ch).to_image();

        let (tw, th) = match o.fit {
            Fit::Fill => (ICON_SIZE, ICON_SIZE),
            Fit::Contain => {
                let k = ICON_SIZE as f64 / cw.max(ch) as f64;
                (
                    ((cw as f64 * k).round() as u32).clamp(1, ICON_SIZE),
                    ((ch as f64 * k).round() as u32).clamp(1, ICON_SIZE),
                )
            }
        };
        let scaled = image::imageops::resize(&crop, tw, th, filter);

        let mut out = RgbaImage::from_pixel(ICON_SIZE, ICON_SIZE, Rgba(o.background));
        let ox = (ICON_SIZE - tw) / 2;
        let oy = (ICON_SIZE - th) / 2;
        image::imageops::overlay(&mut out, &scaled, ox as i64, oy as i64);
        out
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use image::ImageFormat;

    fn png(w: u32, h: u32) -> Vec<u8> {
        let img = RgbaImage::from_fn(w, h, |x, y| Rgba([(x * 10) as u8, (y * 10) as u8, 0, 255]));
        let mut buf = Cursor::new(Vec::new());
        img.write_to(&mut buf, ImageFormat::Png).unwrap();
        buf.into_inner()
    }

    fn opts(x: u32, y: u32, w: u32, h: u32, fit: Fit) -> RenderOptions {
        RenderOptions { crop_x: x, crop_y: y, crop_w: w, crop_h: h, fit, filter: Filter::Smooth, background: [0, 0, 0, 0] }
    }

    #[test]
    fn always_renders_64_square_png() {
        let src = IconSource::decode(&png(20, 10)).unwrap();
        let out = src.render_png(opts(5, 0, 10, 10, Fit::Fill)).unwrap();
        let img = image::load_from_memory(&out).unwrap();
        assert_eq!((img.width(), img.height()), (64, 64));
    }

    #[test]
    fn contain_pads_with_background() {
        let src = IconSource::decode(&png(20, 10)).unwrap();
        let mut o = opts(0, 0, 20, 10, Fit::Contain);
        o.background = [1, 2, 3, 255];
        let img = src.render_rgba(o);
        assert_eq!(img.get_pixel(0, 0), &Rgba([1, 2, 3, 255]));
        assert_eq!(img.get_pixel(32, 32)[3], 255);
        assert_ne!(img.get_pixel(32, 32), &Rgba([1, 2, 3, 255]));
    }

    #[test]
    fn transparent_background_stays_transparent() {
        let src = IconSource::decode(&png(20, 10)).unwrap();
        let img = src.render_rgba(opts(0, 0, 20, 10, Fit::Contain));
        assert_eq!(img.get_pixel(0, 0)[3], 0);
    }

    #[test]
    fn sharp_filter_keeps_source_pixels() {
        let src = IconSource::decode(&png(2, 2)).unwrap();
        let mut o = opts(0, 0, 2, 2, Fit::Fill);
        o.filter = Filter::Sharp;
        let img = src.render_rgba(o);
        assert_eq!(img.get_pixel(0, 0), &Rgba([0, 0, 0, 255]));
        assert_eq!(img.get_pixel(63, 0), &Rgba([10, 0, 0, 255]));
    }

    #[test]
    fn clamps_an_overrunning_crop() {
        let src = IconSource::decode(&png(8, 8)).unwrap();
        assert!(src.render_png(opts(6, 6, 10, 10, Fit::Fill)).is_ok());
    }

    #[test]
    fn big_sources_keep_their_original_size() {
        let src = IconSource::decode(&png(3000, 1500)).unwrap();
        assert_eq!((src.width, src.height), (3000, 1500));
        assert_eq!(src.img.dimensions(), (1024, 512));
        assert!(src.render_png(opts(2000, 0, 1500, 1500, Fit::Fill)).is_ok());
    }

    #[test]
    fn rejects_garbage() {
        assert!(IconSource::decode(b"not an image").is_err());
    }
}
