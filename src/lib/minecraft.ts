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

/** The oldest and newest release a pack targets. */
export interface VersionRange<V extends McRelease = McRelease> {
  from: V;
  to: V;
}

/**
 * The range a pack targets. `versionId` is the newest version; `minVersionId`
 * the oldest, missing on packs made before ranges existed (then it's just the one).
 */
export function packRange<V extends McRelease>(
  p: { versionId: string; minVersionId?: string },
  get: (id: string) => V,
): VersionRange<V> {
  const to = get(p.versionId);
  const from = p.minVersionId ? get(p.minVersionId) : to;
  return from.order <= to.order ? { from, to } : { from: to, to };
}

export const isSingleVersion = (r: VersionRange) => r.from.order === r.to.order;

/** A release id or "1.20 – 1.21.4" for a range, joining the first and last versions it covers. */
export function rangeLabel(r: VersionRange): string {
  if (isSingleVersion(r)) return r.to.id;
  const first = r.from.id.split(' – ')[0];
  const last = r.to.id.split(' – ').pop();
  return `${first} – ${last}`;
}

/** Whether every release in `r` is `id` or newer. */
export const rangeIsAtLeast = (r: VersionRange, id: string) => isAtLeast(r.from, id);

/** Whether any release in `r` is `id` or newer. */
export const rangeReaches = (r: VersionRange, id: string) => isAtLeast(r.to, id);

/** `r` split into the releases before `id` and those from `id` on; either can be `null`. */
export function splitRange<V extends McRelease>(r: VersionRange<V>, id: string, all: V[]) {
  const at = releaseOrder(id);
  const before = r.from.order < at ? { from: r.from, to: r.to.order < at ? r.to : all[at - 1]! } : null;
  const after = r.to.order >= at ? { from: r.from.order >= at ? r.from : all[at]!, to: r.to } : null;
  return { before, after };
}

/** A command that only works on some of a pack's versions, labelled with them (`null` when it's all of them). */
export interface VersionedCommand {
  versions: string | null;
  command: string;
}

/**
 * One command per part of `r` split at `id`, e.g. for syntax that changed in
 * that version. A single command when the whole range is on one side.
 */
export function commandsAcross<V extends McRelease>(
  r: VersionRange<V>,
  id: string,
  all: V[],
  make: (v: V) => string,
): VersionedCommand[] {
  const { before, after } = splitRange(r, id, all);
  if (!before || !after) return [{ versions: null, command: make(r.to) }];
  return [
    { versions: rangeLabel(after), command: make(after.to) },
    { versions: rangeLabel(before), command: make(before.to) },
  ];
}

/**
 * The part of `r` whose releases have data pack registries (1.21+), or `null`
 * if none do. Datapacks are only built for that part.
 */
export function dataRange(r: VersionRange): VersionRange | null {
  if (!supportsDataRegistries(r.to)) return null;
  const from = supportsDataRegistries(r.from) ? r.from : MC_RELEASES.find(supportsDataRegistries)!;
  return { from, to: r.to };
}

const major = (f: PackFormat) => (Array.isArray(f) ? f[0] : f);

/**
 * First format that reads `min_format`/`max_format` (1.21.9). A pack that also
 * supports older formats must keep `pack_format` and `supported_formats`;
 * one that doesn't must leave `supported_formats` out.
 */
const MIN_MAX_SINCE = { resource: 65, data: 82 } as const;

/** First format that reads `supported_formats` (1.20.2), for both pack kinds. */
const SUPPORTED_FORMATS_SINCE = 18;

/** Which pack format a release uses for `kind`. */
const formatOf = (r: McRelease, kind: 'resource' | 'data'): PackFormat => {
  const f = kind === 'resource' ? r.resourceFormat : r.dataFormat;
  if (f === undefined) throw new Error(`Minecraft ${r.id} has no ${kind} pack format`);
  return f;
};

/**
 * `pack` section for pack.mcmeta covering every release in `range`. Writes the
 * fields each generation of the game reads: `pack_format` (all), then
 * `supported_formats` (1.20.2 – 1.21.8), then `min_format`/`max_format` (1.21.9+).
 */
export function packMeta(range: VersionRange, kind: 'resource' | 'data', description: string): Record<string, unknown> {
  const lo = formatOf(range.from, kind);
  const hi = formatOf(range.to, kind);
  const threshold = MIN_MAX_SINCE[kind];
  const out: Record<string, unknown> = { description };
  if (major(lo) < threshold) {
    out.pack_format = major(lo);
    if (major(hi) >= SUPPORTED_FORMATS_SINCE && major(lo) !== major(hi)) {
      out.supported_formats = [major(lo), major(hi)];
    }
  }
  if (major(hi) >= threshold) {
    // Old formats have no minor part, so the lower bound is a plain number there.
    out.min_format = major(lo) < threshold ? major(lo) : lo;
    out.max_format = hi;
    // Once min/max are read, supported_formats must be there whenever pack_format is.
    if (major(lo) < threshold) out.supported_formats = [major(lo), major(hi)];
  }
  return out;
}

type PackSection = {
  pack_format?: number;
  supported_formats?: number | number[] | { min_inclusive?: number; max_inclusive?: number };
  min_format?: PackFormat | [number];
  max_format?: PackFormat | [number];
};

/**
 * The releases a pack.mcmeta `pack` section says it supports, matched on
 * resource format. Falls back to the latest release for formats we don't know.
 */
export function rangeForPackMeta(pack: PackSection): VersionRange {
  const num = (f: unknown) => (Array.isArray(f) ? f[0] : f);
  const sf = pack.supported_formats;
  const [sfLo, sfHi] =
    typeof sf === 'number' ? [sf, sf] : Array.isArray(sf) ? [sf[0], sf[1] ?? sf[0]] : [sf?.min_inclusive, sf?.max_inclusive];
  const lo = num(pack.min_format) ?? sfLo ?? pack.pack_format;
  const hi = num(pack.max_format) ?? sfHi ?? pack.pack_format;
  const known = (f: unknown, pick: 'first' | 'last') => {
    const hits = MC_RELEASES.filter((r) => major(r.resourceFormat) === f);
    return pick === 'first' ? hits[0] : hits[hits.length - 1];
  };
  const to = known(hi, 'last') ?? LATEST_RELEASE;
  const from = known(lo, 'first') ?? to;
  return from.order <= to.order ? { from, to } : { from: to, to };
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
