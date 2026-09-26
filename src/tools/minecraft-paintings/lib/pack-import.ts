// Turn an existing resource pack zip back into an editable project. Packs this
// tool built carry a manifest with painting names and sizes; any other
// painting pack still imports, using the textures under assets/*/textures/painting/.
import { releaseForPackMeta } from '@/lib/minecraft';
import { loadPaintingsWasm } from '../hooks/usePaintingsWasm';
import { measureImage } from './images';
import { getPainting, PAINTINGS } from './paintings';
import { MANIFEST_PATH, type PackManifest } from './pack-builder';
import { DEFAULT_SETTINGS, newProject, sizeForAspect, stripExtension, uid, type Art, type Project } from './project';
import { saveBlob } from './storage';

interface ZipEntry {
  path: string;
  bytes: Uint8Array;
}

export async function importPack(zipFile: File): Promise<Project> {
  const wasm = await loadPaintingsWasm();
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
  const raw = parseJson(files.get(MANIFEST_PATH));
  // The disc tool writes a manifest at the same path; only trust ours.
  const manifest = raw?.tool === 'minecraft-paintings' ? (raw as PackManifest) : undefined;

  const project = newProject(manifest?.name ?? stripExtension(zipFile.name));
  project.description = typeof mcmeta.description === 'string' ? mcmeta.description : project.description;
  project.versionId = manifest?.versionId ?? releaseForPackMeta(mcmeta).id;

  const icon = files.get('pack.png');
  if (icon) {
    project.iconId = uid();
    await saveBlob(project.iconId, new File([icon as BlobPart], 'pack.png', { type: 'image/png' }));
  }

  /** Store a texture as a painting. The texture is already the right shape, so keep its pixels exactly. */
  const addArt = async (bytes: Uint8Array, fileName: string, identity: (w: number, h: number) => ArtIdentity) => {
    const file = new File([bytes as BlobPart], fileName, { type: 'image/png' });
    let size: { width: number; height: number };
    try {
      size = await measureImage(file);
    } catch {
      return; // not a readable image; skip it rather than fail the whole pack
    }
    const id = identity(size.width, size.height);
    const blocksWide = id.kind === 'custom' ? id.width : (getPainting(id.paintingId)?.width ?? 1);
    const imageId = uid();
    await saveBlob(imageId, file);
    project.art.push({
      ...id,
      key: uid(),
      imageId,
      fileName,
      fileSize: bytes.byteLength,
      imageWidth: size.width,
      imageHeight: size.height,
      settings: {
        ...DEFAULT_SETTINGS,
        fit: 'stretch',
        filter: 'sharp',
        pxPerBlock: Math.max(1, Math.round(size.width / blocksWide)),
      },
    } as Art);
  };

  for (const [path, bytes] of files) {
    const vanilla = path.match(/^assets\/minecraft\/textures\/painting\/([a-z0-9_]+)\.png$/);
    if (vanilla) {
      const paintingId = vanilla[1]!;
      if (!getPainting(paintingId)) continue; // back.png, or a painting this tool doesn't know
      const m = manifest?.art.find((a) => a.kind === 'vanilla' && a.paintingId === paintingId);
      await addArt(bytes, m?.fileName ?? `${paintingId}.png`, () => ({ kind: 'vanilla', paintingId }));
      continue;
    }
    const custom = path.match(/^assets\/([a-z0-9_.-]+)\/textures\/painting\/([a-z0-9_]+)\.png$/);
    if (custom && custom[1] !== 'minecraft') {
      const [, namespace, id] = custom as unknown as [string, string, string];
      const found = manifest?.art.find((a) => a.kind === 'custom' && a.namespace === namespace && a.id === id);
      const m = found?.kind === 'custom' ? found : undefined;
      await addArt(bytes, m?.fileName ?? `${id}.png`, (w, h) => ({
        kind: 'custom',
        namespace,
        id,
        title: m?.title ?? id.replace(/_/g, ' '),
        author: m?.author ?? '',
        // Without our manifest the block size lives only in the datapack; guess it from the shape.
        ...(m ? { width: m.width, height: m.height } : sizeForAspect(w / h)),
        placeable: m?.placeable ?? true,
      }));
    }
  }

  if (project.art.length === 0) {
    throw new Error(`${zipFile.name} doesn't contain any painting textures`);
  }
  // Keep the wall's order rather than zip order.
  const order = (a: Art) => (a.kind === 'vanilla' ? PAINTINGS.findIndex((p) => p.id === a.paintingId) : 1000);
  project.art.sort((a, b) => order(a) - order(b));
  return project;
}

type ArtCommon = 'key' | 'imageId' | 'fileName' | 'fileSize' | 'imageWidth' | 'imageHeight' | 'settings';
/** What identifies a painting, per kind (Omit over the union would merge the kinds). */
type ArtIdentity = Omit<Extract<Art, { kind: 'vanilla' }>, ArtCommon> | Omit<Extract<Art, { kind: 'custom' }>, ArtCommon>;

function parseJson(bytes: Uint8Array | undefined): any {
  if (!bytes) return undefined;
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return undefined;
  }
}
