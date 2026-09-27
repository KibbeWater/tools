// Browser-side image handling: measuring dropped files and keeping a
// downscaled bitmap of each source around for the live previews. The build
// itself re-decodes the original in Rust, so previews can be approximate.
import { loadBlob } from '@/tools/minecraft-pack/lib/storage';

/** Previews never need more than this many pixels on the long side. */
const PREVIEW_MAX = 1600;

/** Pixel size of an image as the browser shows it (EXIF rotation applied). */
export async function measureImage(file: Blob): Promise<{ width: number; height: number }> {
  const bmp = await createImageBitmap(file);
  const size = { width: bmp.width, height: bmp.height };
  bmp.close();
  return size;
}

const bitmaps = new Map<string, Promise<ImageBitmap>>();

/** A preview bitmap for an image id, decoded once and cached. */
export function previewBitmap(imageId: string): Promise<ImageBitmap> {
  let p = bitmaps.get(imageId);
  if (!p) {
    p = loadBlob(imageId).then(async (file) => {
      if (!file) throw new Error('missing image');
      const full = await createImageBitmap(file);
      const scale = PREVIEW_MAX / Math.max(full.width, full.height);
      if (scale >= 1) return full;
      const small = await createImageBitmap(full, {
        resizeWidth: Math.round(full.width * scale),
        resizeHeight: Math.round(full.height * scale),
        resizeQuality: 'high',
      });
      full.close();
      return small;
    });
    p.catch(() => bitmaps.delete(imageId));
    bitmaps.set(imageId, p);
  }
  return p;
}

/** Drop a cached preview once its image is gone. */
export function forgetBitmap(imageId: string): void {
  const p = bitmaps.get(imageId);
  bitmaps.delete(imageId);
  void p?.then((b) => b.close()).catch(() => {});
}
