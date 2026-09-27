// Paintings in a pack: everything needed to rebuild them, minus the image
// bytes themselves (those live in IndexedDB, keyed by `imageId`).
import type { Pack } from '@/tools/minecraft-pack/lib/pack';
import {
  getPainting,
  getVersion,
  MAX_CUSTOM_BLOCKS,
  supportsCustomPaintings,
  type McVersion,
} from './paintings';

export type Fit = 'crop' | 'stretch';
export type Filter = 'smooth' | 'sharp';

export interface ImageSettings {
  /** `crop` keeps proportions and cuts to the painting's shape; `stretch` squashes the whole image in. */
  fit: Fit;
  /** Crop centre, as a fraction of the image width and height. */
  cx: number;
  cy: number;
  /** 1 is the largest crop that fits the image; 2 is half that size. */
  zoom: number;
  /** Texture pixels per block. Vanilla uses 16. */
  pxPerBlock: number;
  /** `smooth` (Lanczos) suits photos; `sharp` (nearest) keeps pixel art crisp. */
  filter: Filter;
}

export const DEFAULT_SETTINGS: ImageSettings = {
  fit: 'crop',
  cx: 0.5,
  cy: 0.5,
  zoom: 1,
  pxPerBlock: 64,
  filter: 'smooth',
};

export const PX_PER_BLOCK_OPTIONS = [16, 32, 64, 128, 256] as const;
export const MAX_ZOOM = 8;

/** Images this small are probably pixel art, so default to sharp scaling. */
export function settingsForImage(width: number, height: number): ImageSettings {
  return Math.max(width, height) <= 256 ? { ...DEFAULT_SETTINGS, filter: 'sharp' } : { ...DEFAULT_SETTINGS };
}

interface ArtBase {
  key: string;
  imageId: string;
  fileName: string;
  fileSize: number;
  /** Pixel size of the source, after EXIF rotation. */
  imageWidth: number;
  imageHeight: number;
  settings: ImageSettings;
}

/** Replaces the texture of a vanilla painting. */
export interface VanillaArt extends ArtBase {
  kind: 'vanilla';
  paintingId: string;
}

/** A brand-new painting registered through a datapack `painting_variant` (1.21+). */
export interface CustomArt extends ArtBase {
  kind: 'custom';
  namespace: string;
  id: string;
  title: string;
  author: string;
  width: number; // blocks
  height: number; // blocks
  /** Add to `#minecraft:placeable`, so it turns up when placing a random painting. */
  placeable: boolean;
}

export type Art = VanillaArt | CustomArt;

/** The parts of a pack the painting helpers read. */
export type Project = Pick<Pack, 'name' | 'versionId' | 'art'>;

export { uid } from '@/tools/minecraft-pack/lib/pack';

/** Lowercase `[a-z0-9_]`, the only characters Minecraft allows in ids. */
export function sanitizeId(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export const isValidId = (s: string) => /^[a-z0-9_]+$/.test(s);

export const stripExtension = (name: string) => name.replace(/\.[^.]+$/, '');

/** Size in blocks. */
export function artSize(a: Art): { width: number; height: number } {
  if (a.kind === 'custom') return { width: a.width, height: a.height };
  const meta = getPainting(a.paintingId);
  return { width: meta?.width ?? 1, height: meta?.height ?? 1 };
}

export const artLabel = (a: Art): string =>
  a.kind === 'vanilla' ? (getPainting(a.paintingId)?.title ?? a.paintingId) : a.title || 'Untitled painting';

/** Output texture size in pixels. */
export function outputSize(a: Art): { width: number; height: number } {
  const { width, height } = artSize(a);
  return { width: width * a.settings.pxPerBlock, height: height * a.settings.pxPerBlock };
}

/**
 * The part of the source image that ends up on the painting, in source
 * pixels. The live preview and the Rust renderer both crop with this.
 */
export function cropRect(a: Art): { x: number; y: number; w: number; h: number } {
  const W = a.imageWidth;
  const H = a.imageHeight;
  const s = a.settings;
  if (s.fit === 'stretch') return { x: 0, y: 0, w: W, h: H };
  const { width, height } = artSize(a);
  const aspect = width / height;
  // Largest rectangle of the painting's shape that fits the image, then zoomed.
  const [baseW, baseH] = W / H > aspect ? [H * aspect, H] : [W, W / aspect];
  const zoom = Math.min(Math.max(s.zoom, 1), MAX_ZOOM);
  const w = baseW / zoom;
  const h = baseH / zoom;
  const x = clamp(s.cx * W - w / 2, 0, W - w);
  const y = clamp(s.cy * H - h / 2, 0, H - h);
  return { x, y, w, h };
}

/** Problems that would stop this painting from building, or `null` if it's fine. */
export function artProblem(a: Art, version: McVersion): string | null {
  if (a.kind === 'vanilla') {
    if (!version.paintings.includes(a.paintingId)) return `Not a painting in Minecraft ${version.id}`;
    return null;
  }
  if (!supportsCustomPaintings(version)) return 'Custom paintings need Minecraft 1.21 or newer';
  if (!isValidId(a.namespace)) return 'Namespace can only use a–z, 0–9 and _';
  if (!isValidId(a.id)) return 'Id can only use a–z, 0–9 and _';
  if (!isBlockCount(a.width) || !isBlockCount(a.height)) return `Size must be 1 to ${MAX_CUSTOM_BLOCKS} blocks each way`;
  return null;
}

const isBlockCount = (n: number) => Number.isInteger(n) && n >= 1 && n <= MAX_CUSTOM_BLOCKS;

/** Custom paintings whose `namespace:id` collides with another custom painting. */
export function duplicateCustomIds(art: Art[]): Set<string> {
  const seen = new Map<string, number>();
  for (const a of art) {
    if (a.kind !== 'custom') continue;
    const k = `${a.namespace}:${a.id}`;
    seen.set(k, (seen.get(k) ?? 0) + 1);
  }
  return new Set([...seen].filter(([, n]) => n > 1).map(([k]) => k));
}

/**
 * Guess which vanilla painting a file is meant for from its name, e.g.
 * `kebab.png`, `painting_skull_and_roses.jpg` or `Skull On Fire (hd).webp`.
 * Matches whole words only, so `seashell.png` doesn't land on "sea".
 */
export function matchPaintingByFileName(fileName: string, available: string[]): string | undefined {
  const words = stripExtension(fileName).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const joined = `_${words.join('_')}_`;
  // Longest forms first so "aztec2" wins over "aztec" and "skull_and_roses" over "skull".
  const forms = available
    .flatMap((id) => {
      const meta = getPainting(id);
      return [id, meta ? sanitizeId(meta.title) : id].map((form) => ({ id, form }));
    })
    .sort((a, b) => b.form.length - a.form.length);
  for (const { id, form } of forms) {
    if (joined.includes(`_painting_${form}_`) || joined.includes(`_${form}_`)) return id;
  }
  return undefined;
}

/** How far apart two aspect ratios are, symmetric in wide vs tall. */
const aspectDistance = (a: number, b: number) => Math.abs(Math.log(a / b));

/** The free vanilla painting whose shape best fits an image; bigger wins ties. */
export function bestFitPainting(imageAspect: number, free: string[]): string | undefined {
  let best: { id: string; d: number; area: number } | undefined;
  for (const id of free) {
    const m = getPainting(id);
    if (!m || m.unused) continue;
    const d = aspectDistance(m.width / m.height, imageAspect);
    const area = m.width * m.height;
    if (!best || d < best.d - 1e-9 || (Math.abs(d - best.d) < 1e-9 && area > best.area)) best = { id, d, area };
  }
  return best?.id;
}

/** A block size for a new custom painting that matches an image's shape, at most 4 blocks a side. */
export function sizeForAspect(imageAspect: number): { width: number; height: number } {
  let best = { width: 1, height: 1, d: Infinity };
  for (let w = 1; w <= 4; w++) {
    for (let h = 1; h <= 4; h++) {
      const d = aspectDistance(w / h, imageAspect);
      // Prefer the bigger canvas when shapes tie (2×2 over 1×1).
      if (d < best.d - 1e-9 || (Math.abs(d - best.d) < 1e-9 && w * h > best.width * best.height)) best = { width: w, height: h, d };
    }
  }
  return { width: best.width, height: best.height };
}

export interface MeasuredFile {
  file: File;
  width: number;
  height: number;
}

export interface Assignment {
  item: MeasuredFile;
  target: { kind: 'vanilla'; paintingId: string } | { kind: 'custom' };
}

/**
 * Decide where each dropped image goes: a vanilla painting named in the file
 * name, otherwise the free painting closest in shape, otherwise (on 1.21+) a
 * new custom painting.
 */
export function planDrop(items: MeasuredFile[], project: Project): { assignments: Assignment[]; skipped: File[] } {
  const version = getVersion(project.versionId);
  const taken = new Set(
    project.art.filter((a): a is VanillaArt => a.kind === 'vanilla').map((a) => a.paintingId),
  );
  const free = () => version.paintings.filter((id) => !taken.has(id));
  const assignments: Assignment[] = [];
  const skipped: File[] = [];
  const unmatched: MeasuredFile[] = [];

  for (const item of items) {
    const id = matchPaintingByFileName(item.file.name, free());
    if (id) {
      taken.add(id);
      assignments.push({ item, target: { kind: 'vanilla', paintingId: id } });
    } else {
      unmatched.push(item);
    }
  }
  for (const item of unmatched) {
    const id = bestFitPainting(item.width / item.height, free());
    if (id) {
      taken.add(id);
      assignments.push({ item, target: { kind: 'vanilla', paintingId: id } });
    } else if (supportsCustomPaintings(version)) {
      assignments.push({ item, target: { kind: 'custom' } });
    } else {
      skipped.push(item.file);
    }
  }
  return { assignments, skipped };
}

export function defaultNamespace(project: Project): string {
  return sanitizeId(project.name) || 'custom';
}

/** A custom id derived from the file name that doesn't clash with existing ones. */
export function uniqueCustomId(fileName: string, namespace: string, art: Art[]): string {
  const base = sanitizeId(stripExtension(fileName)) || 'painting';
  const used = new Set(
    art.filter((a): a is CustomArt => a.kind === 'custom' && a.namespace === namespace).map((a) => a.id),
  );
  if (!used.has(base)) return base;
  for (let n = 2; ; n++) if (!used.has(`${base}_${n}`)) return `${base}_${n}`;
}

export const IMAGE_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif,image/bmp,.png,.jpg,.jpeg,.webp,.gif,.bmp';

export const isImageFile = (f: File) =>
  /^image\/(png|jpeg|webp|gif|bmp)$/.test(f.type) || /\.(png|jpe?g|webp|gif|bmp)$/i.test(f.name);

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
