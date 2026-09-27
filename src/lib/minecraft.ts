// Minecraft Java releases and their pack formats, shared by the Minecraft tools.
// Values verified against https://minecraft.wiki/w/Pack_format (September 2026).

/** A pack format. Since 1.21.9 formats have a minor part, written `[major, minor]`. */
export type PackFormat = number | [number, number];

export interface McRelease {
  id: string; // user-facing label
  resourceFormat: PackFormat;
  /** Data pack format. Only listed from 1.21, the first version with data-driven jukebox songs and paintings. */
  dataFormat?: PackFormat;
  /** Position in MC_RELEASES; higher is newer. */
  order: number;
}

const RELEASES: Omit<McRelease, 'order'>[] = [
  { id: '1.16 – 1.16.1', resourceFormat: 5 },
  { id: '1.16.2 – 1.16.5', resourceFormat: 6 },
  { id: '1.17.x', resourceFormat: 7 },
  { id: '1.18.x', resourceFormat: 8 },
  { id: '1.19 – 1.19.2', resourceFormat: 9 },
  { id: '1.19.3', resourceFormat: 12 },
  { id: '1.19.4', resourceFormat: 13 },
  { id: '1.20 – 1.20.1', resourceFormat: 15 },
  { id: '1.20.2', resourceFormat: 18 },
  { id: '1.20.3 – 1.20.4', resourceFormat: 22 },
  { id: '1.20.5 – 1.20.6', resourceFormat: 32 },
  { id: '1.21 – 1.21.1', resourceFormat: 34, dataFormat: 48 },
  { id: '1.21.2 – 1.21.3', resourceFormat: 42, dataFormat: 57 },
  { id: '1.21.4', resourceFormat: 46, dataFormat: 61 },
  { id: '1.21.5', resourceFormat: 55, dataFormat: 71 },
  { id: '1.21.6', resourceFormat: 63, dataFormat: 80 },
  { id: '1.21.7 – 1.21.8', resourceFormat: 64, dataFormat: 81 },
  { id: '1.21.9 – 1.21.10', resourceFormat: [69, 0], dataFormat: [88, 0] },
  { id: '1.21.11', resourceFormat: [75, 0], dataFormat: [94, 1] },
  { id: '26.1 – 26.1.2', resourceFormat: [84, 0], dataFormat: [101, 1] },
  { id: '26.2', resourceFormat: [88, 0], dataFormat: [107, 1] },
  { id: '26.3', resourceFormat: [97, 1], dataFormat: [121, 0] },
];

export const MC_RELEASES: McRelease[] = RELEASES.map((r, order) => ({ ...r, order }));

export const FIRST_RELEASE = MC_RELEASES[0]!;
export const LATEST_RELEASE = MC_RELEASES[MC_RELEASES.length - 1]!;

/** The release labelled `id`, or the latest if it's unknown. */
export const getRelease = (id: string): McRelease => MC_RELEASES.find((r) => r.id === id) ?? LATEST_RELEASE;

/** Position of a release id in MC_RELEASES, or -1 if unknown. */
export const releaseOrder = (id: string) => MC_RELEASES.findIndex((r) => r.id === id);

/** Whether `v` is the release labelled `id` or newer. */
export const isAtLeast = (v: { order: number }, id: string) => v.order >= releaseOrder(id);

/** Newest first, since that's what most people are on. */
export const releaseOptions = [...MC_RELEASES].reverse().map((r) => ({ value: r.id, label: r.id }));

/** Data packs can add registry entries (jukebox songs, painting variants) from 1.21. */
export const supportsDataRegistries = (v: { dataFormat?: PackFormat }): boolean => v.dataFormat !== undefined;

/** `pack` section for pack.mcmeta. 1.21.9+ uses min/max formats instead of `pack_format`. */
export function packMeta(format: PackFormat, description: string): Record<string, unknown> {
  if (Array.isArray(format)) {
    return { description, min_format: format, max_format: format };
  }
  return { description, pack_format: format };
}

/** Newest release whose resource format matches a pack.mcmeta `pack` section, else the latest. */
export function releaseForPackMeta(pack: { pack_format?: number; min_format?: PackFormat; max_format?: PackFormat }) {
  const major = (f: PackFormat | undefined) => (Array.isArray(f) ? f[0] : f);
  const want = major(pack.max_format) ?? pack.pack_format;
  const match = [...MC_RELEASES].reverse().find((r) => major(r.resourceFormat) === want);
  return match ?? LATEST_RELEASE;
}

/** A file name that's safe on every OS, from a pack name. */
export const safeFileName = (name: string, fallback: string) =>
  name.replace(/[^a-z0-9_\- ]+/gi, '').trim() || fallback;

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5_000);
}
