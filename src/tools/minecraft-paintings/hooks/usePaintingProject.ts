import { useCallback, useEffect, useRef, useState } from 'react';
import {
  defaultNamespace,
  isImageFile,
  newProject,
  planDrop,
  settingsForImage,
  sizeForAspect,
  stripExtension,
  uid,
  uniqueCustomId,
  type Art,
  type MeasuredFile,
  type Project,
} from '../lib/project';
import {
  deleteBlob,
  deleteProject as deleteStoredProject,
  listProjects,
  loadProject,
  requestPersistence,
  saveBlob,
  saveProject,
} from '../lib/storage';
import { forgetBitmap, measureImage } from '../lib/images';
import { importPack as importPackZip } from '../lib/pack-import';

const LAST_KEY = 'mc-paintings:last-project';

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

export type DropTarget = { kind: 'vanilla'; paintingId: string } | { kind: 'custom'; artKey?: string };

export interface DropResult {
  added: Art[];
  /** Images that had nowhere to go. */
  skipped: File[];
  /** Files that aren't images, or that the browser couldn't read. */
  ignored: File[];
}

export function usePaintingProject() {
  const [project, setProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [storageError, setStorageError] = useState<string | null>(null);
  const saveTimer = useRef<number | undefined>(undefined);
  const latest = useRef<Project | null>(null);
  latest.current = project;

  const refreshList = useCallback(() => listProjects().then(setProjects).catch(() => {}), []);

  // Open the last project, or start a fresh one.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const last = recallLast();
        const p = (last && (await loadProject(last))) || (await listProjects())[0] || newProject();
        if (!alive) return;
        setProject(p);
        rememberLast(p.id);
        await saveProject(p);
        refreshList();
      } catch {
        if (!alive) return;
        setStorageError("This browser won't let the page save anything, so your pack will be lost on reload.");
        setProject(newProject());
      }
    })();
    requestPersistence();
    return () => {
      alive = false;
    };
  }, [refreshList]);

  /** Apply a change and autosave shortly after. */
  const mutate = useCallback(
    (fn: (p: Project) => Project) => {
      setProject((prev) => {
        if (!prev) return prev;
        const next = { ...fn(prev), updatedAt: Date.now() };
        window.clearTimeout(saveTimer.current);
        saveTimer.current = window.setTimeout(() => {
          saveProject(next).then(refreshList).catch(() => {});
        }, 300);
        return next;
      });
    },
    [refreshList],
  );

  // Flush a pending save when leaving the page.
  useEffect(() => {
    const flush = () => {
      if (saveTimer.current && latest.current) void saveProject(latest.current);
    };
    window.addEventListener('pagehide', flush);
    return () => {
      flush();
      window.removeEventListener('pagehide', flush);
    };
  }, []);

  /**
   * Add dropped files. With a `target` the first image goes there (replacing
   * any image it had); without one, images are matched by name, then fill the
   * free painting closest in shape, then become custom paintings.
   */
  const addFiles = useCallback(
    async (files: File[], target?: DropTarget): Promise<DropResult> => {
      const p = latest.current;
      if (!p) return { added: [], skipped: [], ignored: files };
      const ignored = files.filter((f) => !isImageFile(f));
      const measured: MeasuredFile[] = [];
      for (const file of files.filter(isImageFile).slice(0, target ? 1 : undefined)) {
        try {
          measured.push({ file, ...(await measureImage(file)) });
        } catch {
          ignored.push(file);
        }
      }
      const plan = target
        ? { assignments: measured.map((item) => ({ item, target })), skipped: [] }
        : planDrop(measured, p);

      const added: Art[] = [];
      const replaced: Art[] = [];
      const ns = defaultNamespace(p);
      let art = [...p.art];

      for (const { item, target: t } of plan.assignments) {
        const imageId = uid();
        await saveBlob(imageId, item.file);
        const base = {
          imageId,
          fileName: item.file.name,
          fileSize: item.file.size,
          imageWidth: item.width,
          imageHeight: item.height,
        };

        const existing =
          t.kind === 'vanilla'
            ? art.find((x) => x.kind === 'vanilla' && x.paintingId === t.paintingId)
            : 'artKey' in t && t.artKey
              ? art.find((x) => x.key === t.artKey)
              : undefined;

        let entry: Art;
        if (existing) {
          // New image for an existing painting: keep resolution and scaling, recentre the crop.
          entry = { ...existing, ...base, settings: { ...existing.settings, cx: 0.5, cy: 0.5, zoom: 1 } };
          replaced.push(existing);
          art = art.map((x) => (x.key === existing.key ? entry : x));
        } else if (t.kind === 'vanilla') {
          entry = { ...base, key: uid(), kind: 'vanilla', paintingId: t.paintingId, settings: settingsForImage(item.width, item.height) };
          art.push(entry);
        } else {
          entry = {
            ...base,
            key: uid(),
            kind: 'custom',
            namespace: ns,
            id: uniqueCustomId(item.file.name, ns, art),
            title: stripExtension(item.file.name),
            author: '',
            ...sizeForAspect(item.width / item.height),
            placeable: true,
            settings: settingsForImage(item.width, item.height),
          };
          art.push(entry);
        }
        added.push(entry);
      }

      mutate((cur) => ({ ...cur, art }));
      for (const old of replaced) {
        void deleteBlob(old.imageId);
        forgetBitmap(old.imageId);
      }
      return { added, skipped: plan.skipped, ignored };
    },
    [mutate],
  );

  const updateArt = useCallback(
    (key: string, patch: Partial<Art>) =>
      mutate((p) => ({
        ...p,
        art: p.art.map((a) => (a.key === key ? ({ ...a, ...patch } as Art) : a)),
      })),
    [mutate],
  );

  const removeArt = useCallback(
    (key: string) => {
      const a = latest.current?.art.find((x) => x.key === key);
      if (!a) return;
      mutate((cur) => ({ ...cur, art: cur.art.filter((x) => x.key !== key) }));
      void deleteBlob(a.imageId);
      forgetBitmap(a.imageId);
    },
    [mutate],
  );

  const updateMeta = useCallback(
    (patch: Partial<Pick<Project, 'name' | 'description' | 'versionId'>>) => mutate((p) => ({ ...p, ...patch })),
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
    async (next: Project, { saveCurrent = true } = {}) => {
      window.clearTimeout(saveTimer.current);
      if (saveCurrent && latest.current) await saveProject(latest.current);
      setProject(next);
      rememberLast(next.id);
      await saveProject(next);
      await refreshList();
    },
    [refreshList],
  );

  const createProject = useCallback(() => open(newProject()), [open]);

  const openProject = useCallback(
    async (id: string) => {
      const p = await loadProject(id);
      if (p) await open(p);
    },
    [open],
  );

  const importPack = useCallback(
    async (file: File) => {
      const p = await importPackZip(file);
      p.name = uniqueName(p.name, (await listProjects()).map((x) => x.name));
      await open(p);
    },
    [open],
  );

  const deleteProject = useCallback(
    async (id: string) => {
      const all = await listProjects();
      const target = all.find((p) => p.id === id);
      if (!target) return;
      const isOpen = latest.current?.id === id;
      // Cancel a pending autosave so it can't write the deleted pack back.
      if (isOpen) window.clearTimeout(saveTimer.current);
      await deleteStoredProject(target);
      target.art.forEach((a) => forgetBitmap(a.imageId));
      if (isOpen) {
        const rest = all.filter((p) => p.id !== id);
        await open(rest[0] ?? newProject(), { saveCurrent: false });
      } else {
        await refreshList();
      }
    },
    [open, refreshList],
  );

  return {
    project,
    projects,
    storageError,
    addFiles,
    updateArt,
    removeArt,
    updateMeta,
    setIcon,
    createProject,
    openProject,
    importPack,
    deleteProject,
  };
}

/** `name`, or `name (2)`, `name (3)`… if a saved pack already uses it. */
function uniqueName(name: string, taken: string[]): string {
  const used = new Set(taken);
  if (!used.has(name)) return name;
  for (let n = 2; ; n++) if (!used.has(`${name} (${n})`)) return `${name} (${n})`;
}
