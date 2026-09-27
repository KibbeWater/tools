// The painting part of a pack build: textures for the resource pack, painting
// variants and the placeable tag for the datapack. Each image is cropped and
// resampled in Rust.
import type { BuildProgress, PackEntry } from '@/tools/minecraft-pack/lib/build';
import type { Pack } from '@/tools/minecraft-pack/lib/pack';
import { stableName } from '@/tools/minecraft-pack/lib/protection';
import { loadBlob } from '@/tools/minecraft-pack/lib/storage';
import { loadPaintingsWasm } from '../hooks/usePaintingsWasm';
import type { VersionedCommand, VersionRange } from '@/lib/minecraft';
import { getVersion, getVersionRange, giveCommands, supportsTitleAndAuthor, type McVersion } from './paintings';
import { artLabel, artProblem, artWarning, cropRect, duplicateCustomIds, outputSize, type Art } from './project';

export interface CustomPainting {
  label: string;
  variantId: string;
  give: VersionedCommand[];
}

export interface PaintingFiles {
  rp: PackEntry[];
  dp: PackEntry[];
  customPaintings: CustomPainting[];
}

/** How paintings are recorded in the pack's `mellow-llama.json`. */
export type PaintingManifestEntry =
  | { kind: 'vanilla'; paintingId: string; fileName: string }
  | {
      kind: 'custom';
      namespace: string;
      id: string;
      title: string;
      author: string;
      width: number;
      height: number;
      placeable: boolean;
      fileName: string;
    };

/** Where the painting sprite `ns:path` lives. */
const textureFile = (ns: string, path: string) => `assets/${ns}/textures/painting/${path}.png`;

/** Problems that would stop the paintings from building, one line per painting. */
export function paintingProblems(pack: Pick<Pack, 'versionId' | 'art'>): string[] {
  const version = getVersion(pack.versionId);
  const dupes = duplicateCustomIds(pack.art);
  return pack.art.flatMap((a) => {
    const p = artProblem(a, version);
    if (p) return [`${artLabel(a)}: ${p}`];
    if (a.kind === 'custom' && dupes.has(`${a.namespace}:${a.id}`)) {
      return [`${artLabel(a)}: ${a.namespace}:${a.id} is used by another painting`];
    }
    return [];
  });
}

/** What won't fully work on every version the pack targets, one line per painting. Doesn't stop the build. */
export function paintingWarnings(pack: Pick<Pack, 'versionId' | 'minVersionId' | 'art'>): string[] {
  const range = getVersionRange(pack);
  return pack.art.flatMap((a) => {
    const w = artWarning(a, range);
    return w ? [`${artLabel(a)}: ${w}`] : [];
  });
}

/**
 * Render each painting and lay out its files. `step` numbers progress across
 * the whole build. With `nameSeed`, new paintings get random-looking texture
 * names that stay the same from build to build; vanilla ones can't be renamed,
 * since the game looks those up by name.
 */
export async function buildPaintings(
  pack: Pack,
  onProgress: (p: BuildProgress) => void,
  step: { offset: number; total: number },
  nameSeed: string | null = null,
): Promise<PaintingFiles> {
  const range = getVersionRange(pack);
  const rp: PackEntry[] = [];
  const dp: PackEntry[] = [];
  const placeable: string[] = [];
  const customPaintings: CustomPainting[] = [];
  if (pack.art.length === 0) return { rp, dp, customPaintings };

  const wasm = await loadPaintingsWasm();
  for (const [i, a] of pack.art.entries()) {
    const label = artLabel(a);
    onProgress({ current: step.offset + i, total: step.total, message: `Painting ${label}` });
    const png = await render(wasm, a);

    if (a.kind === 'vanilla') {
      rp.push({ path: textureFile('minecraft', a.paintingId), bytes: png });
      continue;
    }

    // The sprite name is independent of the variant id, so it can be anything.
    const variantId = `${a.namespace}:${a.id}`;
    const sprite = nameSeed ? await stableName(nameSeed, `painting:${variantId}`) : a.id;
    rp.push({ path: textureFile(a.namespace, sprite), bytes: png });
    dp.push({
      path: `data/${a.namespace}/painting_variant/${a.id}.json`,
      bytes: json(variantJson(a, `${a.namespace}:${sprite}`, range)),
    });
    if (a.placeable) placeable.push(variantId);
    customPaintings.push({ label, variantId, give: giveCommands(range, variantId) });
  }

  if (placeable.length) {
    // `replace: false` merges with vanilla and other packs instead of overwriting the tag.
    dp.push({
      path: 'data/minecraft/tags/painting_variant/placeable.json',
      bytes: json({ replace: false, values: placeable }),
    });
  }

  return { rp, dp, customPaintings };
}

type Wasm = Awaited<ReturnType<typeof loadPaintingsWasm>>;

async function render(wasm: Wasm, a: Art): Promise<Uint8Array> {
  const file = await loadBlob(a.imageId);
  if (!file) throw new Error(`${artLabel(a)}: the image is missing, add it again`);
  const crop = cropRect(a);
  const out = outputSize(a);
  try {
    return wasm.render_painting(new Uint8Array(await file.arrayBuffer()), {
      crop_x: Math.round(crop.x),
      crop_y: Math.round(crop.y),
      crop_w: Math.max(1, Math.round(crop.w)),
      crop_h: Math.max(1, Math.round(crop.h)),
      out_w: out.width,
      out_h: out.height,
      filter: a.settings.filter,
    });
  } catch (e) {
    throw new Error(`${artLabel(a)}: ${e instanceof Error ? e.message : String(e)}`);
  }
}

function variantJson(a: Extract<Art, { kind: 'custom' }>, assetId: string, range: VersionRange<McVersion>): Record<string, unknown> {
  const out: Record<string, unknown> = {
    asset_id: assetId,
    width: a.width,
    height: a.height,
  };
  // Written whenever any version in the range reads them. 1.21 – 1.21.1 skip
  // fields they don't know, so the same file still loads there.
  if (supportsTitleAndAuthor(range.to)) {
    // Vanilla colours these itself in its own definitions; match that.
    if (a.title.trim()) out.title = { text: a.title.trim(), color: 'yellow' };
    if (a.author.trim()) out.author = { text: a.author.trim(), color: 'gray' };
  }
  return out;
}

export function paintingManifest(art: Art[]): PaintingManifestEntry[] {
  return art.map((a) =>
    a.kind === 'vanilla'
      ? { kind: 'vanilla', paintingId: a.paintingId, fileName: a.fileName }
      : {
          kind: 'custom',
          namespace: a.namespace,
          id: a.id,
          title: a.title,
          author: a.author,
          width: a.width,
          height: a.height,
          placeable: a.placeable,
          fileName: a.fileName,
        },
  );
}

const json = (v: unknown) => new TextEncoder().encode(JSON.stringify(v, null, 2));
