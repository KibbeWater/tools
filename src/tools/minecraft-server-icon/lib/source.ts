// Opening a dropped file: decode it in Rust for the render, and keep a
// downscaled browser bitmap around for the crop editor. Files Rust can't read
// (SVG, AVIF, HEIC in Safari, TIFF…) are rasterised to PNG by the browser first.
import type { IconSource } from '../wasm/minecraft_server_icon';
import { loadServerIconWasm } from '../hooks/useServerIconWasm';

/** The crop editor never needs more than this many pixels on the long side. */
const PREVIEW_MAX = 1600;
/** Vector images are drawn this big on the long side before they're resampled. */
const VECTOR_SIZE = 1024;

export interface LoadedImage {
  fileName: string;
  /** Decoded image in WASM memory. Call `free()` once it's replaced. */
  source: IconSource;
  /** Pixel size of the source, after EXIF rotation. */
  width: number;
  height: number;
  preview: ImageBitmap;
  /** The browser converted the file before Rust could read it. */
  converted: boolean;
}

export async function loadImage(file: File): Promise<LoadedImage> {
  const { IconSource } = await loadServerIconWasm();
  let blob: Blob = file;
  let converted = false;
  let source: IconSource;
  try {
    source = new IconSource(new Uint8Array(await file.arrayBuffer()));
  } catch {
    blob = await rasterize(file);
    converted = true;
    source = new IconSource(new Uint8Array(await blob.arrayBuffer()));
  }
  try {
    const preview = await previewBitmap(blob);
    return { fileName: file.name, source, width: source.width, height: source.height, preview, converted };
  } catch {
    source.free();
    throw new Error(`Couldn't show ${file.name} in this browser.`);
  }
}

async function previewBitmap(blob: Blob): Promise<ImageBitmap> {
  const full = await createImageBitmap(blob);
  const scale = PREVIEW_MAX / Math.max(full.width, full.height);
  if (scale >= 1) return full;
  const small = await createImageBitmap(full, {
    resizeWidth: Math.round(full.width * scale),
    resizeHeight: Math.round(full.height * scale),
    resizeQuality: 'high',
  });
  full.close();
  return small;
}

/** Let the browser decode anything it can show in an <img>, and re-encode it as PNG. */
async function rasterize(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    try {
      await img.decode();
    } catch {
      throw new Error(`${file.name} isn't an image this browser can open.`);
    }
    const isVector = file.type === 'image/svg+xml' || /\.svg$/i.test(file.name);
    // SVGs without a width and height report 0 in some browsers.
    let w = img.naturalWidth || VECTOR_SIZE;
    let h = img.naturalHeight || VECTOR_SIZE;
    if (isVector) {
      const k = VECTOR_SIZE / Math.max(w, h);
      w = Math.round(w * k);
      h = Math.round(h * k);
    }
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
    const png = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!png) throw new Error(`Couldn't convert ${file.name}.`);
    return png;
  } finally {
    URL.revokeObjectURL(url);
  }
}
