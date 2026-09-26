import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DEFAULT_SETTINGS,
  defaultNamespace,
  isAudioFile,
  newProject,
  planDrop,
  stripExtension,
  uid,
  uniqueCustomId,
  type Project,
  type Track,
} from '../lib/project';
import {
  deleteBlob,
  deleteEncoded,
  deleteProject as deleteStoredProject,
  listProjects,
  loadBlob,
  loadProject,
  requestPersistence,
  saveBlob,
  saveProject,
} from '../lib/storage';
import { importPack as importPackZip } from '../lib/pack-import';
import { decodeForPreview } from '../lib/preview';

const LAST_KEY = 'mc-pack:last-project';

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

export type DropTarget = { kind: 'vanilla'; discId: string } | { kind: 'custom'; trackKey?: string };

export interface DropResult {
  added: Track[];
  skipped: File[];
  ignored: File[];
}

export function usePackProject() {
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

  const measure = useCallback(
    (track: Track, file: File) => {
      decodeForPreview(track.audioId, file)
        .then((buf) =>
          mutate((p) => ({
            ...p,
            tracks: p.tracks.map((t) => (t.key === track.key ? { ...t, durationSec: buf.duration } : t)),
          })),
        )
        .catch(() => {
          // The browser can't decode this format for preview; the build decoder may still manage.
        });
    },
    [mutate],
  );

  /**
   * Add dropped files. With a `target` the first file goes there (replacing
   * any audio it had); without one, files are matched by name, then fill free
   * discs, then become custom discs.
   */
  const addFiles = useCallback(
    async (files: File[], target?: DropTarget): Promise<DropResult> => {
      const p = latest.current;
      if (!p) return { added: [], skipped: [], ignored: files };
      const audio = files.filter(isAudioFile);
      const ignored = files.filter((f) => !isAudioFile(f));
      const plan = target
        ? { assignments: audio.slice(0, 1).map((file) => ({ file, target })), skipped: [] }
        : planDrop(audio, p);

      const added: Track[] = [];
      const replaced: Track[] = [];
      const ns = defaultNamespace(p);
      let tracks = [...p.tracks];

      for (const { file, target: t } of plan.assignments) {
        const audioId = uid();
        await saveBlob(audioId, file);
        const base = { audioId, fileName: file.name, fileSize: file.size, durationSec: undefined };

        const existing =
          t.kind === 'vanilla'
            ? tracks.find((x) => x.kind === 'vanilla' && x.discId === t.discId)
            : 'trackKey' in t && t.trackKey
              ? tracks.find((x) => x.key === t.trackKey)
              : undefined;

        let track: Track;
        if (existing) {
          // New audio for an existing disc: keep its settings, drop the old trim.
          track = { ...existing, ...base, settings: { ...existing.settings, trimStart: 0, trimEnd: 0 } };
          replaced.push(existing);
          tracks = tracks.map((x) => (x.key === existing.key ? track : x));
        } else if (t.kind === 'vanilla') {
          track = { ...base, key: uid(), kind: 'vanilla', discId: t.discId, settings: { ...DEFAULT_SETTINGS } };
          tracks.push(track);
        } else {
          track = {
            ...base,
            key: uid(),
            kind: 'custom',
            namespace: ns,
            id: uniqueCustomId(file.name, ns, tracks),
            displayName: stripExtension(file.name),
            settings: { ...DEFAULT_SETTINGS },
          };
          tracks.push(track);
        }
        added.push(track);
      }

      mutate((cur) => ({ ...cur, tracks }));
      for (const old of replaced) void deleteBlob(old.audioId);
      for (const t of added) void loadBlob(t.audioId).then((f) => f && measure(t, f));
      return { added, skipped: plan.skipped, ignored };
    },
    [measure, mutate],
  );

  const updateTrack = useCallback(
    (key: string, patch: Partial<Track>) =>
      mutate((p) => ({
        ...p,
        tracks: p.tracks.map((t) => (t.key === key ? ({ ...t, ...patch } as Track) : t)),
      })),
    [mutate],
  );

  const removeTrack = useCallback(
    (key: string) => {
      const p = latest.current;
      const t = p?.tracks.find((x) => x.key === key);
      if (!p || !t) return;
      mutate((cur) => ({ ...cur, tracks: cur.tracks.filter((x) => x.key !== key) }));
      void deleteBlob(t.audioId);
      void deleteEncoded(p.id, key);
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
      for (const t of p.tracks) void loadBlob(t.audioId).then((f) => f && measure(t, f));
    },
    [measure, open],
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
    updateTrack,
    removeTrack,
    updateMeta,
    setIcon,
    createProject,
    openProject,
    importPack,
    deleteProject,
  };
}

export type PackProjectApi = ReturnType<typeof usePackProject>;

/** `name`, or `name (2)`, `name (3)`… if a saved pack already uses it. */
function uniqueName(name: string, taken: string[]): string {
  const used = new Set(taken);
  if (!used.has(name)) return name;
  for (let n = 2; ; n++) if (!used.has(`${name} (${n})`)) return `${name} (${n})`;
}
