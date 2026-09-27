// Settings for a server icon and the maths that turns them into a crop.
// The same crop drives the live crop editor and the Rust render.

export const ICON_SIZE = 64;
export const MAX_ZOOM = 8;

/**
 * `crop` cuts a square out of the image; `fit` shows the whole image and pads
 * the rest with the background; `stretch` squashes the whole image square.
 */
export type Fit = 'crop' | 'fit' | 'stretch';
export type Filter = 'smooth' | 'sharp';

export interface IconSettings {
  fit: Fit;
  /** Crop centre, as a fraction of the image width and height. */
  cx: number;
  cy: number;
  /** 1 is the largest square that fits the image; 2 is half that size. */
  zoom: number;
  /** `smooth` (Lanczos) suits photos and logos; `sharp` (nearest) keeps pixel art crisp. */
  filter: Filter;
  /** `#rrggbb`, or null for transparent. */
  background: string | null;
}

export const DEFAULT_SETTINGS: IconSettings = {
  fit: 'crop',
  cx: 0.5,
  cy: 0.5,
  zoom: 1,
  filter: 'smooth',
  background: null,
};

/** Images this small are probably pixel art, so default to sharp scaling. */
export function settingsForImage(width: number, height: number): IconSettings {
  return Math.max(width, height) <= 256 ? { ...DEFAULT_SETTINGS, filter: 'sharp' } : { ...DEFAULT_SETTINGS };
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The part of the source that ends up in the icon, in whole source pixels. */
export function cropRect(width: number, height: number, s: IconSettings): Rect {
  if (s.fit !== 'crop') return { x: 0, y: 0, w: width, h: height };
  const side = Math.max(1, Math.round(Math.min(width, height) / s.zoom));
  const x = Math.round(clamp(s.cx * width - side / 2, 0, width - side));
  const y = Math.round(clamp(s.cy * height - side / 2, 0, height - side));
  return { x, y, w: side, h: side };
}

/** Options for `IconSource.render` in the WASM module. */
export function renderOptions(width: number, height: number, s: IconSettings) {
  const r = cropRect(width, height, s);
  return {
    crop_x: r.x,
    crop_y: r.y,
    crop_w: r.w,
    crop_h: r.h,
    fit: s.fit === 'fit' ? 'contain' : 'fill',
    filter: s.filter,
    background: s.background ? [...hexToRgb(s.background), 255] : [0, 0, 0, 0],
  };
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/** The file picker takes anything; formats Rust can't read are rasterised by the browser first. */
export const IMAGE_ACCEPT = 'image/*,.svg,.ico,.avif,.heic,.heif';

/** `data:` URI, for the `favicon` field of a server status response. */
export function dataUri(png: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < png.length; i += 0x8000) {
    bin += String.fromCharCode(...png.subarray(i, i + 0x8000));
  }
  return `data:image/png;base64,${btoa(bin)}`;
}

export function formatBytes(n: number): string {
  return n < 1024 ? `${n} B` : `${(n / 1024).toFixed(1)} KB`;
}
