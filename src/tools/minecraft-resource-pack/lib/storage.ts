// Browser persistence for pack projects, via IndexedDB:
//   projects  Project JSON, keyed by project id
//   blobs     source audio and pack icons, keyed by audio id
//   encoded   the last OGG encode of each track, keyed by `${projectId}:${trackKey}`,
//             so a rebuild only re-encodes tracks whose audio or settings changed
import type { Project } from './project';

const DB_NAME = 'mellow-llama-mc-packs';
const DB_VERSION = 1;
type StoreName = 'projects' | 'blobs' | 'encoded';

export interface EncodedEntry {
  /** Fingerprint of the audio + settings this encode was made from. */
  fingerprint: string;
  ogg: Uint8Array;
  durationSec: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function db(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const d = req.result;
        for (const name of ['projects', 'blobs', 'encoded'] as const) {
          if (!d.objectStoreNames.contains(name)) d.createObjectStore(name);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    // Let a later call retry if the first open failed (e.g. private mode).
    dbPromise.catch(() => (dbPromise = null));
  }
  return dbPromise;
}

function request<T>(store: StoreName, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  return db().then(
    (d) =>
      new Promise<T>((resolve, reject) => {
        const tx = d.transaction(store, mode);
        const req = fn(tx.objectStore(store));
        tx.oncomplete = () => resolve(req.result as T);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      }),
  );
}

const get = <T>(store: StoreName, key: string) =>
  request<T | undefined>(store, 'readonly', (s) => s.get(key));
const put = (store: StoreName, key: string, value: unknown) =>
  request<void>(store, 'readwrite', (s) => s.put(value, key));
const del = (store: StoreName, key: string | IDBKeyRange) =>
  request<void>(store, 'readwrite', (s) => s.delete(key));

// ---------- projects ----------

export const saveProject = (p: Project) => put('projects', p.id, p);
export const loadProject = (id: string) => get<Project>('projects', id);

export async function listProjects(): Promise<Project[]> {
  const all = await request<Project[]>('projects', 'readonly', (s) => s.getAll());
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

/** Stored as a Blob plus its name, since Safari can't always persist File objects. */
interface StoredBlob {
  blob: Blob;
  name: string;
  type: string;
}

export const saveBlob = (id: string, file: File) =>
  put('blobs', id, { blob: file, name: file.name, type: file.type } satisfies StoredBlob);

export async function loadBlob(id: string): Promise<File | undefined> {
  const s = await get<StoredBlob>('blobs', id);
  return s ? new File([s.blob], s.name, { type: s.type }) : undefined;
}

export const deleteBlob = (id: string) => del('blobs', id);

// ---------- encode cache ----------

const encodedKey = (projectId: string, trackKey: string) => `${projectId}:${trackKey}`;

export const loadEncoded = (projectId: string, trackKey: string) =>
  get<EncodedEntry>('encoded', encodedKey(projectId, trackKey));

export const saveEncoded = (projectId: string, trackKey: string, entry: EncodedEntry) =>
  put('encoded', encodedKey(projectId, trackKey), entry);

export const deleteEncoded = (projectId: string, trackKey: string) =>
  del('encoded', encodedKey(projectId, trackKey));

/** Ask the browser not to evict our data under storage pressure. Best effort. */
export function requestPersistence(): void {
  navigator.storage?.persist?.().catch(() => {});
}
