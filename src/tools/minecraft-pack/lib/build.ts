// Builds a pack into one resource pack zip, plus one datapack zip when any
// feature registers something new (custom discs or paintings). Each feature
// lays out its own files; this adds the shared ones and zips everything.
import { dataRange, getRelease, MC_RELEASES, packMeta, packRange, rangeLabel, releaseOrder } from '@/lib/minecraft';
import { loadMcPackWasm } from '@/tools/minecraft-resource-pack/hooks/useMcPackWasm';
import {
  buildDiscs,
  discManifest,
  discProblems,
  discWarnings,
  type CustomSong,
  type DiscManifestEntry,
} from '@/tools/minecraft-resource-pack/lib/pack-builder';
import {
  buildPaintings,
  paintingManifest,
  paintingProblems,
  paintingWarnings,
  type CustomPainting,
  type PaintingManifestEntry,
} from '@/tools/minecraft-paintings/lib/pack-builder';
import type { Pack } from './pack';
import { createNamer, protectEntries } from './protection';
import { loadBlob } from './storage';

export { downloadBlob, safeFileName } from '@/lib/minecraft';

export interface PackEntry {
  path: string;
  bytes: Uint8Array;
}

export interface BuildProgress {
  current: number;
  total: number;
  message: string;
}

export interface BuildResult {
  resourcePack: Blob;
  /** Only present when the pack has custom discs or paintings. */
  datapack: Blob | null;
  discs: { encoded: number; reused: number; custom: CustomSong[] };
  paintings: { count: number; custom: CustomPainting[] };
}

/** Written into every resource pack so the tool can reopen it later. */
export const MANIFEST_PATH = 'mellow-llama.json';

export interface PackManifest {
  version: 2;
  name: string;
  versionId: string;
  minVersionId?: string;
  discs: DiscManifestEntry[];
  paintings: PaintingManifestEntry[];
}

/** Everything that would stop the pack from building, one line each. */
export function packProblems(pack: Pack): string[] {
  return [...discProblems(pack), ...paintingProblems(pack)];
}

/**
 * What won't work on every version the pack targets, one line each. These
 * don't stop the build; the pack still works where it can.
 */
export function packWarnings(pack: Pack): string[] {
  const range = packRange(pack, getRelease);
  const out: string[] = [];
  // Before 1.20.2 the game compares `pack_format` alone, which can only name the oldest version.
  const lastOld = Math.min(range.to.order, releaseOrder('1.20.2') - 1);
  if (lastOld > range.from.order) {
    const others = rangeLabel({ from: MC_RELEASES[range.from.order + 1]!, to: MC_RELEASES[lastOld]! });
    out.push(
      `Minecraft ${others} only checks a single pack format, so it will say this pack was made for an older version. It still works if you load it anyway`,
    );
  }
  return [...out, ...discWarnings(pack), ...paintingWarnings(pack)];
}

export const isEmptyPack = (pack: Pick<Pack, 'tracks' | 'art'>) => pack.tracks.length + pack.art.length === 0;

export async function buildPack(pack: Pack, onProgress: (p: BuildProgress) => void = () => {}): Promise<BuildResult> {
  const problems = packProblems(pack);
  if (problems.length) throw new Error(problems.join('; '));
  if (isEmptyPack(pack)) throw new Error('Add a disc or a painting first');

  const range = packRange(pack, getRelease);
  const total = pack.tracks.length + pack.art.length;
  const protect = !!pack.protect;
  const randomName = protect ? createNamer() : null;
  const discs = await buildDiscs(pack, onProgress, { offset: 0, total }, randomName);
  const paintings = await buildPaintings(pack, onProgress, { offset: pack.tracks.length, total }, protect ? pack.id : null);

  onProgress({ current: total, total, message: 'Zipping' });

  const icon = pack.iconId ? await loadBlob(pack.iconId) : undefined;
  const iconBytes = icon ? new Uint8Array(await icon.arrayBuffer()) : null;

  const rp: PackEntry[] = [...discs.rp, ...paintings.rp];
  rp.push({ path: 'pack.mcmeta', bytes: json({ pack: packMeta(range, 'resource', pack.description) }) });
  if (!protect) rp.push({ path: MANIFEST_PATH, bytes: json(manifestFor(pack)) });
  if (iconBytes) rp.push({ path: 'pack.png', bytes: iconBytes });

  const wasm = await loadMcPackWasm();
  const dp: PackEntry[] = [...discs.dp, ...paintings.dp];
  let datapack: Blob | null = null;
  if (dp.length) {
    // Custom discs and paintings are blocked unless the range reaches 1.21, so this is always set here.
    // Versions before 1.21 in the range just don't get the datapack.
    const data = dataRange(range);
    if (!data) throw new Error(`Minecraft ${range.to.id} has no datapack registries`);
    dp.push({ path: 'pack.mcmeta', bytes: json({ pack: packMeta(data, 'data', pack.description) }) });
    if (iconBytes) dp.push({ path: 'pack.png', bytes: iconBytes });
    datapack = zip(wasm, protect ? protectEntries(dp) : dp);
  }

  return {
    resourcePack: zip(wasm, protect ? protectEntries(rp) : rp),
    datapack,
    discs: { encoded: discs.encodedCount, reused: discs.reusedCount, custom: discs.customSongs },
    paintings: { count: pack.art.length, custom: paintings.customPaintings },
  };
}

function manifestFor(p: Pack): PackManifest {
  return {
    version: 2,
    name: p.name,
    versionId: p.versionId,
    ...(p.minVersionId && p.minVersionId !== p.versionId ? { minVersionId: p.minVersionId } : {}),
    discs: discManifest(p.tracks),
    paintings: paintingManifest(p.art),
  };
}

function zip(wasm: Awaited<ReturnType<typeof loadMcPackWasm>>, entries: PackEntry[]): Blob {
  const bytes = wasm.build_zip(
    entries.map((e) => e.path),
    entries.map((e) => e.bytes),
  );
  return new Blob([bytes as BlobPart], { type: 'application/zip' });
}

const json = (v: unknown) => new TextEncoder().encode(JSON.stringify(v, null, 2));
