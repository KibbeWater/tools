// Builds a project into a resource pack zip (plus a datapack zip when it has
// custom paintings). Each image is cropped and resampled in Rust.
import { packMeta } from '@/lib/minecraft';
import { loadPaintingsWasm } from '../hooks/usePaintingsWasm';
import { getVersion, giveCommand, supportsTitleAndAuthor, type McVersion } from './paintings';
import { artLabel, artProblem, cropRect, duplicateCustomIds, outputSize, type Art, type Project } from './project';
import { loadBlob } from './storage';

export interface BuildProgress {
  current: number;
  total: number;
  message: string;
}

export interface CustomPainting {
  label: string;
  variantId: string;
  give: string;
}

export interface BuildResult {
  resourcePack: Blob;
  /** Only present when the project has custom paintings. */
  datapack: Blob | null;
  count: number;
  customPaintings: CustomPainting[];
}

/** Written into every resource pack so the tool can reopen it later. */
export const MANIFEST_PATH = 'mellow-llama.json';

export interface PackManifest {
  version: 1;
  tool: 'minecraft-paintings';
  name: string;
  versionId: string;
  art: (
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
      }
  )[];
}

type ProgressCb = (p: BuildProgress) => void;

export const vanillaTexturePath = (id: string) => `assets/minecraft/textures/painting/${id}.png`;
export const customTexturePath = (ns: string, id: string) => `assets/${ns}/textures/painting/${id}.png`;

export async function buildPack(project: Project, onProgress: ProgressCb = () => {}): Promise<BuildResult> {
  const version = getVersion(project.versionId);
  const dupes = duplicateCustomIds(project.art);
  const problems = project.art
    .map((a) => {
      const p = artProblem(a, version);
      if (p) return `${artLabel(a)}: ${p}`;
      if (a.kind === 'custom' && dupes.has(`${a.namespace}:${a.id}`)) {
        return `${artLabel(a)}: ${a.namespace}:${a.id} is used by another painting`;
      }
      return null;
    })
    .filter(Boolean);
  if (problems.length) throw new Error(problems.join('; '));
  if (project.art.length === 0) throw new Error('Add at least one painting first');

  const wasm = await loadPaintingsWasm();
  const total = project.art.length;
  const rp: Entry[] = [];
  const dp: Entry[] = [];
  const placeable: string[] = [];
  const customPaintings: CustomPainting[] = [];

  for (const [i, a] of project.art.entries()) {
    const label = artLabel(a);
    onProgress({ current: i, total, message: `Painting ${label}` });
    const png = await render(wasm, a);

    if (a.kind === 'vanilla') {
      rp.push({ path: vanillaTexturePath(a.paintingId), bytes: png });
      continue;
    }

    rp.push({ path: customTexturePath(a.namespace, a.id), bytes: png });
    const variantId = `${a.namespace}:${a.id}`;
    dp.push({ path: `data/${a.namespace}/painting_variant/${a.id}.json`, bytes: json(variantJson(a, version)) });
    if (a.placeable) placeable.push(variantId);
    customPaintings.push({ label, variantId, give: giveCommand(version, variantId) });
  }

  onProgress({ current: total, total, message: 'Zipping' });

  const icon = project.iconId ? await loadBlob(project.iconId) : undefined;
  const iconBytes = icon ? new Uint8Array(await icon.arrayBuffer()) : null;

  rp.push({ path: 'pack.mcmeta', bytes: json({ pack: packMeta(version.resourceFormat, project.description) }) });
  rp.push({ path: MANIFEST_PATH, bytes: json(manifestFor(project)) });
  if (iconBytes) rp.push({ path: 'pack.png', bytes: iconBytes });

  let datapack: Blob | null = null;
  if (dp.length) {
    if (placeable.length) {
      // `replace: false` merges with vanilla and other packs instead of overwriting the tag.
      dp.push({
        path: 'data/minecraft/tags/painting_variant/placeable.json',
        bytes: json({ replace: false, values: placeable }),
      });
    }
    dp.push({ path: 'pack.mcmeta', bytes: json({ pack: packMeta(dataFormatOf(version), project.description) }) });
    if (iconBytes) dp.push({ path: 'pack.png', bytes: iconBytes });
    datapack = zip(wasm, dp);
  }

  return { resourcePack: zip(wasm, rp), datapack, count: total, customPaintings };
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

function variantJson(a: Extract<Art, { kind: 'custom' }>, version: McVersion): Record<string, unknown> {
  const out: Record<string, unknown> = {
    asset_id: `${a.namespace}:${a.id}`,
    width: a.width,
    height: a.height,
  };
  if (supportsTitleAndAuthor(version)) {
    // Vanilla colours these itself in its own definitions; match that.
    if (a.title.trim()) out.title = { text: a.title.trim(), color: 'yellow' };
    if (a.author.trim()) out.author = { text: a.author.trim(), color: 'gray' };
  }
  return out;
}

function manifestFor(p: Project): PackManifest {
  return {
    version: 1,
    tool: 'minecraft-paintings',
    name: p.name,
    versionId: p.versionId,
    art: p.art.map((a) =>
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
    ),
  };
}

function dataFormatOf(v: McVersion) {
  if (v.dataFormat === undefined) throw new Error(`Minecraft ${v.id} has no custom painting support`);
  return v.dataFormat;
}

interface Entry {
  path: string;
  bytes: Uint8Array;
}

function zip(wasm: Wasm, entries: Entry[]): Blob {
  const bytes = wasm.build_zip(
    entries.map((e) => e.path),
    entries.map((e) => e.bytes),
  );
  return new Blob([bytes as BlobPart], { type: 'application/zip' });
}

const json = (v: unknown) => new TextEncoder().encode(JSON.stringify(v, null, 2));
