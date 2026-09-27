import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { forgetBitmap } from '@/tools/minecraft-paintings/lib/images';
import { importPack as importPackZip, mergePacks } from '../lib/import';
import { newPack, uid, type Pack } from '../lib/pack';
import {
  deleteBlob,
  deleteEncoded,
  deletePack as deleteStoredPack,
  listPacks,
  loadPack,
  requestPersistence,
  saveBlob,
  savePack,
} from '../lib/storage';

const LAST_KEY = 'mc-pack:last-pack';

const rememberLast = (id: string) => {
  try {
    localStorage.setItem(LAST_KEY, id);
  } catch {
    // storage unavailable; we just won't reopen it next time
  }
};
const recallLast = () => {
  try {
    return localStorage.getItem(LAST_KEY);
  } catch {
    return null;
  }
};

/** What a feature (discs, paintings) needs to read and change the open pack. */
export interface PackHandle {
  /** The open pack as of the last render, for reading inside async work. */
  latest: { readonly current: Pack | null };
  /** Apply a change and autosave shortly after. */
  mutate: (fn: (p: Pack) => Pack) => void;
}

/** The open pack, the list of saved packs, and everything that isn't specific to one feature. */
export function usePack() {
  const [pack, setPack] = useState<Pack | null>(null);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [storageError, setStorageError] = useState<string | null>(null);
  const saveTimer = useRef<number | undefined>(undefined);
  const latest = useRef<Pack | null>(null);
  latest.current = pack;

  const refreshList = useCallback(() => listPacks().then(setPacks).catch(() => {}), []);

  // Open the last pack, or start a fresh one.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const last = recallLast();
        const p = (last && (await loadPack(last))) || (await listPacks())[0] || newPack();
        if (!alive) return;
        setPack(p);
        rememberLast(p.id);
        await savePack(p);
        refreshList();
      } catch {
        if (!alive) return;
        setStorageError("This browser won't let the page save anything, so your pack will be lost on reload.");
        setPack(newPack());
      }
    })();
    requestPersistence();
    return () => {
      alive = false;
    };
  }, [refreshList]);

  const mutate = useCallback(
    (fn: (p: Pack) => Pack) => {
      setPack((prev) => {
        if (!prev) return prev;
        const next = { ...fn(prev), updatedAt: Date.now() };
        window.clearTimeout(saveTimer.current);
        saveTimer.current = window.setTimeout(() => {
          saveTimer.current = undefined;
          savePack(next).then(refreshList).catch(() => {});
        }, 300);
        return next;
      });
    },
    [refreshList],
  );

  // Flush a pending save when leaving the page.
  useEffect(() => {
    const flush = () => {
      if (saveTimer.current && latest.current) void savePack(latest.current);
    };
    window.addEventListener('pagehide', flush);
    return () => {
      flush();
      window.removeEventListener('pagehide', flush);
    };
  }, []);

  const updateMeta = useCallback(
    (patch: Partial<Pick<Pack, 'name' | 'description' | 'versionId' | 'minVersionId' | 'protect'>>) => mutate((p) => ({ ...p, ...patch })),
    [mutate],
  );

  const setIcon = useCallback(
    async (file: File | null) => {
      const p = latest.current;
      if (!p) return;
      if (p.iconId) void deleteBlob(p.iconId);
      let iconId: string | null = null;
      if (file) {
        iconId = uid();
        await saveBlob(iconId, file);
      }
      mutate((cur) => ({ ...cur, iconId }));
    },
    [mutate],
  );

  /** Switch packs. Saves the outgoing pack unless it's the one being deleted. */
  const open = useCallback(
    async (next: Pack, { saveCurrent = true } = {}) => {
      window.clearTimeout(saveTimer.current);
      saveTimer.current = undefined;
      if (saveCurrent && latest.current) await savePack(latest.current);
      setPack(next);
      rememberLast(next.id);
      await savePack(next);
      await refreshList();
    },
    [refreshList],
  );

  const createProject = useCallback(() => open(newPack()), [open]);

  const openProject = useCallback(
    async (id: string) => {
      const p = await loadPack(id);
      if (p) await open(p);
    },
    [open],
  );

  const importPack = useCallback(
    async (file: File) => {
      const p = await importPackZip(file);
      p.name = uniqueName(p.name, (await listPacks()).map((x) => x.name));
      await open(p);
    },
    [open],
  );

  /** Add a pack zip's discs and paintings to the open pack. */
  const mergePack = useCallback(
    async (file: File) => {
      const p = latest.current;
      if (!p) return;
      const incoming = await importPackZip(file);
      const { pack: merged, dropped } = mergePacks(p, incoming);
      mutate(() => merged);
      for (const id of dropped.blobIds) void deleteBlob(id);
      for (const key of dropped.trackKeys) void deleteEncoded(p.id, key);
      for (const id of dropped.imageIds) forgetBitmap(id);
    },
    [mutate],
  );

  const deleteProject = useCallback(
    async (id: string) => {
      const all = await listPacks();
      const target = all.find((p) => p.id === id);
      if (!target) return;
      const isOpen = latest.current?.id === id;
      // Cancel a pending autosave so it can't write the deleted pack back.
      if (isOpen) window.clearTimeout(saveTimer.current);
      await deleteStoredPack(target);
      target.art.forEach((a) => forgetBitmap(a.imageId));
      if (isOpen) {
        const rest = all.filter((p) => p.id !== id);
        await open(rest[0] ?? newPack(), { saveCurrent: false });
      } else {
        await refreshList();
      }
    },
    [open, refreshList],
  );

  const handle = useMemo<PackHandle>(() => ({ latest, mutate }), [mutate]);

  return {
    project: pack,
    projects: packs,
    storageError,
    handle,
    updateMeta,
    setIcon,
    createProject,
    openProject,
    importPack,
    mergePack,
    deleteProject,
  };
}

export type PackApi = ReturnType<typeof usePack>;

/** `name`, or `name (2)`, `name (3)`… if a saved pack already uses it. */
function uniqueName(name: string, taken: string[]): string {
  const used = new Set(taken);
  if (!used.has(name)) return name;
  for (let n = 2; ; n++) if (!used.has(`${name} (${n})`)) return `${name} (${n})`;
}
