// Turn a resource pack zip back into an editable pack. Every feature pulls its
// own files out of the same zip, so a pack with discs and paintings comes back
// whole. Also reads the per-tool manifests older versions of the site wrote.
import { releaseForPackMeta } from '@/lib/minecraft';
import { loadMcPackWasm } from '@/tools/minecraft-resource-pack/hooks/useMcPackWasm';
import type { DiscManifestEntry } from '@/tools/minecraft-resource-pack/lib/pack-builder';
import { extractDiscs } from '@/tools/minecraft-resource-pack/lib/pack-import';
import type { PaintingManifestEntry } from '@/tools/minecraft-paintings/lib/pack-builder';
import { extractPaintings } from '@/tools/minecraft-paintings/lib/pack-import';
import { MANIFEST_PATH } from './build';
import { newPack, uid, type Pack } from './pack';
import { saveBlob } from './storage';

interface ZipEntry {
  path: string;
  bytes: Uint8Array;
}

export async function importPack(zipFile: File): Promise<Pack> {
  const wasm = await loadMcPackWasm();
  let entries: ZipEntry[];
  try {
    entries = wasm.read_zip(new Uint8Array(await zipFile.arrayBuffer())) as ZipEntry[];
  } catch {
    throw new Error(`${zipFile.name} isn't a zip file`);
  }
  // Packs are sometimes zipped with a top-level folder; strip it if pack.mcmeta lives there.
  const meta = entries.find((e) => /^([^/]+\/)?pack\.mcmeta$/.test(e.path));
  if (!meta) throw new Error(`${zipFile.name} has no pack.mcmeta, so it isn't a resource pack`);
  const prefix = meta.path.slice(0, -'pack.mcmeta'.length);
  const files = new Map(
    entries.filter((e) => e.path.startsWith(prefix)).map((e) => [e.path.slice(prefix.length), e.bytes]),
  );

  const mcmeta = parseJson(files.get('pack.mcmeta'))?.pack ?? {};
  const manifest = readManifest(parseJson(files.get(MANIFEST_PATH)));

  const pack = newPack(manifest?.name ?? zipFile.name.replace(/\.[^.]+$/, ''));
  pack.description = typeof mcmeta.description === 'string' ? mcmeta.description : pack.description;
  pack.versionId = manifest?.versionId ?? releaseForPackMeta(mcmeta).id;
  pack.tracks = await extractDiscs(files, manifest?.discs);
  pack.art = await extractPaintings(files, manifest?.paintings);

  if (pack.tracks.length + pack.art.length === 0) {
    throw new Error(`${zipFile.name} doesn't contain any music discs or paintings`);
  }

  const icon = files.get('pack.png');
  if (icon) {
    pack.iconId = uid();
    await saveBlob(pack.iconId, new File([icon as BlobPart], 'pack.png', { type: 'image/png' }));
  }
  return pack;
}

interface Manifest {
  name?: string;
  versionId?: string;
  discs?: DiscManifestEntry[];
  paintings?: PaintingManifestEntry[];
}

/** Our manifest in any of its versions, normalised. */
function readManifest(raw: any): Manifest | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const base = { name: raw.name, versionId: raw.versionId };
  if (raw.version === 2) return { ...base, discs: raw.discs, paintings: raw.paintings };
  // Version 1 came from the separate tools; only the painting one said which it was.
  if (raw.version === 1 && raw.tool === 'minecraft-paintings') return { ...base, paintings: raw.art };
  if (raw.version === 1 && Array.isArray(raw.tracks)) return { ...base, discs: raw.tracks };
  return undefined;
}

export interface MergeResult {
  pack: Pack;
  /** What the merge replaced or didn't keep, so the caller can free its stored files. */
  dropped: { blobIds: string[]; trackKeys: string[]; imageIds: string[] };
}

/**
 * Add everything from `from` to `into`. Where both fill the same vanilla slot
 * or use the same custom id, the incoming one wins. Name, description and
 * version stay as they are; the icon is only taken if `into` has none.
 */
export function mergePacks(into: Pack, from: Pack): MergeResult {
  const trackId = (t: Pack['tracks'][number]) => (t.kind === 'vanilla' ? `v:${t.discId}` : `c:${t.namespace}:${t.id}`);
  const artId = (a: Pack['art'][number]) => (a.kind === 'vanilla' ? `v:${a.paintingId}` : `c:${a.namespace}:${a.id}`);

  const incomingTracks = new Set(from.tracks.map(trackId));
  const incomingArt = new Set(from.art.map(artId));
  const lostTracks = into.tracks.filter((t) => incomingTracks.has(trackId(t)));
  const lostArt = into.art.filter((a) => incomingArt.has(artId(a)));

  const keepIcon = into.iconId ?? from.iconId;
  const lostIcon = into.iconId && from.iconId ? [from.iconId] : [];

  return {
    pack: {
      ...into,
      iconId: keepIcon,
      tracks: [...into.tracks.filter((t) => !incomingTracks.has(trackId(t))), ...from.tracks],
      art: [...into.art.filter((a) => !incomingArt.has(artId(a))), ...from.art],
    },
    dropped: {
      blobIds: [...lostTracks.map((t) => t.audioId), ...lostArt.map((a) => a.imageId), ...lostIcon],
      trackKeys: lostTracks.map((t) => t.key),
      imageIds: lostArt.map((a) => a.imageId),
    },
  };
}

function parseJson(bytes: Uint8Array | undefined): any {
  if (!bytes) return undefined;
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return undefined;
  }
}
