// Browser persistence for packs, via IndexedDB:
//   projects  Pack JSON, keyed by pack id
//   blobs     source audio, source images and pack icons, keyed by their id
//   encoded   the last OGG encode of each disc, keyed by `${packId}:${trackKey}`,
//             so a rebuild only re-encodes discs whose audio or settings changed
import { fromStoredFile, openKeyValueDb, toStoredFile, type StoredFile } from '@/lib/idb';
import type { Pack } from './pack';

export { requestPersistence } from '@/lib/idb';

const { get, getAll, put, del } = openKeyValueDb('mellow-llama-mc-studio', 1, ['projects', 'blobs', 'encoded']);

export interface EncodedEntry {
  /** Fingerprint of the audio + settings this encode was made from. */
  fingerprint: string;
  ogg: Uint8Array;
  durationSec: number;
}

// ---------- packs ----------

export const savePack = (p: Pack) => put('projects', p.id, p);
export const loadPack = (id: string) => get<Pack>('projects', id);

export async function listPacks(): Promise<Pack[]> {
  const all = await getAll<Pack>('projects');
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function deletePack(p: Pack): Promise<void> {
  await del('projects', p.id);
  await Promise.all([
    ...p.tracks.map((t) => del('blobs', t.audioId)),
    ...p.art.map((a) => del('blobs', a.imageId)),
    ...(p.iconId ? [del('blobs', p.iconId)] : []),
    // Every encode for this pack sorts between `${id}:` and `${id};`.
    del('encoded', IDBKeyRange.bound(`${p.id}:`, `${p.id};`, false, true)),
  ]);
}

// ---------- blobs ----------

export const saveBlob = (id: string, file: File) => put('blobs', id, toStoredFile(file));

export const loadBlob = async (id: string) => fromStoredFile(await get<StoredFile>('blobs', id));

export const deleteBlob = (id: string) => del('blobs', id);

// ---------- encode cache ----------

const encodedKey = (packId: string, trackKey: string) => `${packId}:${trackKey}`;

export const loadEncoded = (packId: string, trackKey: string) => get<EncodedEntry>('encoded', encodedKey(packId, trackKey));

export const saveEncoded = (packId: string, trackKey: string, entry: EncodedEntry) =>
  put('encoded', encodedKey(packId, trackKey), entry);

export const deleteEncoded = (packId: string, trackKey: string) => del('encoded', encodedKey(packId, trackKey));
