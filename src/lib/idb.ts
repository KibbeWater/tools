// A tiny promise wrapper over one IndexedDB database with plain key/value stores.

export interface KeyValueDb<S extends string> {
  get: <T>(store: S, key: string) => Promise<T | undefined>;
  getAll: <T>(store: S) => Promise<T[]>;
  put: (store: S, key: string, value: unknown) => Promise<void>;
  del: (store: S, key: string | IDBKeyRange) => Promise<void>;
}

export function openKeyValueDb<S extends string>(name: string, version: number, stores: readonly S[]): KeyValueDb<S> {
  let dbPromise: Promise<IDBDatabase> | null = null;

  function db(): Promise<IDBDatabase> {
    if (!dbPromise) {
      dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(name, version);
        req.onupgradeneeded = () => {
          const d = req.result;
          for (const s of stores) {
            if (!d.objectStoreNames.contains(s)) d.createObjectStore(s);
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

  function request<T>(store: S, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> {
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

  return {
    get: (store, key) => request(store, 'readonly', (s) => s.get(key)),
    getAll: (store) => request(store, 'readonly', (s) => s.getAll()),
    put: (store, key, value) => request(store, 'readwrite', (s) => s.put(value, key)),
    del: (store, key) => request(store, 'readwrite', (s) => s.delete(key)),
  };
}

/** Stored as a Blob plus its name, since Safari can't always persist File objects. */
export interface StoredFile {
  blob: Blob;
  name: string;
  type: string;
}

export const toStoredFile = (file: File): StoredFile => ({ blob: file, name: file.name, type: file.type });

export const fromStoredFile = (s: StoredFile | undefined): File | undefined =>
  s ? new File([s.blob], s.name, { type: s.type }) : undefined;

/** Ask the browser not to evict our data under storage pressure. Best effort. */
export function requestPersistence(): void {
  navigator.storage?.persist?.().catch(() => {});
}
