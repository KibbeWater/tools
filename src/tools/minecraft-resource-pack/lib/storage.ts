// Browser persistence for pack projects, via IndexedDB:
//   projects  Project JSON, keyed by project id
//   blobs     source audio and pack icons, keyed by audio id
//   encoded   the last OGG encode of each track, keyed by `${projectId}:${trackKey}`,
//             so a rebuild only re-encodes tracks whose audio or settings changed
import { fromStoredFile, openKeyValueDb, toStoredFile, type StoredFile } from '@/lib/idb';
import type { Project } from './project';

export { requestPersistence } from '@/lib/idb';

const { get, getAll, put, del } = openKeyValueDb('mellow-llama-mc-packs', 1, ['projects', 'blobs', 'encoded']);

export interface EncodedEntry {
  /** Fingerprint of the audio + settings this encode was made from. */
  fingerprint: string;
  ogg: Uint8Array;
  durationSec: number;
}

// ---------- projects ----------

export const saveProject = (p: Project) => put('projects', p.id, p);
export const loadProject = (id: string) => get<Project>('projects', id);

export async function listProjects(): Promise<Project[]> {
  const all = await getAll<Project>('projects');
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function deleteProject(p: Project): Promise<void> {
  await del('projects', p.id);
  await Promise.all([
    ...p.tracks.map((t) => del('blobs', t.audioId)),
    ...(p.iconId ? [del('blobs', p.iconId)] : []),
    // Every encode for this project sorts between `${id}:` and `${id};`.
    del('encoded', IDBKeyRange.bound(`${p.id}:`, `${p.id};`, false, true)),
  ]);
}

// ---------- blobs ----------

export const saveBlob = (id: string, file: File) => put('blobs', id, toStoredFile(file));

export const loadBlob = async (id: string) => fromStoredFile(await get<StoredFile>('blobs', id));

export const deleteBlob = (id: string) => del('blobs', id);

// ---------- encode cache ----------

const encodedKey = (projectId: string, trackKey: string) => `${projectId}:${trackKey}`;

export const loadEncoded = (projectId: string, trackKey: string) =>
  get<EncodedEntry>('encoded', encodedKey(projectId, trackKey));

export const saveEncoded = (projectId: string, trackKey: string, entry: EncodedEntry) =>
  put('encoded', encodedKey(projectId, trackKey), entry);

export const deleteEncoded = (projectId: string, trackKey: string) =>
  del('encoded', encodedKey(projectId, trackKey));
