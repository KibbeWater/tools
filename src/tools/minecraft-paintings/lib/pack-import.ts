// Pull paintings back out of an unzipped resource pack. Packs this tool built
// carry a manifest with painting names and sizes; any other painting pack
// still imports, using the textures under assets/*/textures/painting/.
import { saveBlob } from '@/tools/minecraft-pack/lib/storage';
import { pngSize } from '@/tools/minecraft-pack/lib/png';
import { getPainting, PAINTINGS } from './paintings';
import type { PaintingManifestEntry } from './pack-builder';
import { DEFAULT_SETTINGS, sizeForAspect, uid, type Art } from './project';

export async function extractPaintings(
  files: Map<string, Uint8Array>,
  manifest: PaintingManifestEntry[] | undefined,
): Promise<Art[]> {
  const art: Art[] = [];

  /** Store a texture as a painting. The texture is already the right shape, so keep its pixels exactly. */
  const addArt = async (bytes: Uint8Array, fileName: string, identity: (w: number, h: number) => ArtIdentity) => {
    const size = pngSize(bytes);
    if (!size) return; // not a readable PNG; skip it rather than fail the whole pack
    const file = new File([bytes as BlobPart], fileName, { type: 'image/png' });
    const id = identity(size.width, size.height);
    const blocksWide = id.kind === 'custom' ? id.width : (getPainting(id.paintingId)?.width ?? 1);
    const imageId = uid();
    await saveBlob(imageId, file);
    art.push({
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
      const m = manifest?.find((a) => a.kind === 'vanilla' && a.paintingId === paintingId);
      await addArt(bytes, m?.fileName ?? `${paintingId}.png`, () => ({ kind: 'vanilla', paintingId }));
      continue;
    }
    const custom = path.match(/^assets\/([a-z0-9_.-]+)\/textures\/painting\/([a-z0-9_]+)\.png$/);
    if (custom && custom[1] !== 'minecraft') {
      const [, namespace, id] = custom as unknown as [string, string, string];
      const found = manifest?.find((a) => a.kind === 'custom' && a.namespace === namespace && a.id === id);
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

  // Keep the wall's order rather than zip order.
  const order = (a: Art) => (a.kind === 'vanilla' ? PAINTINGS.findIndex((p) => p.id === a.paintingId) : 1000);
  return art.sort((a, b) => order(a) - order(b));
}

type ArtCommon = 'key' | 'imageId' | 'fileName' | 'fileSize' | 'imageWidth' | 'imageHeight' | 'settings';
/** What identifies a painting, per kind (Omit over the union would merge the kinds). */
type ArtIdentity = Omit<Extract<Art, { kind: 'vanilla' }>, ArtCommon> | Omit<Extract<Art, { kind: 'custom' }>, ArtCommon>;
