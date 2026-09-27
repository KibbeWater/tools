import { useCallback, useEffect, useRef } from 'react';
import type { PackHandle } from '@/tools/minecraft-pack/hooks/usePack';
import { deleteBlob, deleteEncoded, loadBlob, saveBlob } from '@/tools/minecraft-pack/lib/storage';
import {
  DEFAULT_SETTINGS,
  defaultNamespace,
  isAudioFile,
  planDrop,
  stripExtension,
  uid,
  uniqueCustomId,
  type Track,
} from '../lib/project';
import { decodeForPreview } from '../lib/preview';

export type DropTarget = { kind: 'vanilla'; discId: string } | { kind: 'custom'; trackKey?: string };

export interface DropResult {
  added: Track[];
  skipped: File[];
  ignored: File[];
}

/** The music disc actions on the open pack, whose discs are `tracks`. */
export function useDiscs({ latest, mutate }: PackHandle, tracks: Track[]) {
  const measured = useRef(new Set<string>());

  // Fill in the duration of any disc that doesn't have one yet (new, replaced or imported audio).
  useEffect(() => {
    for (const t of tracks) {
      if (t.durationSec !== undefined || measured.current.has(t.audioId)) continue;
      measured.current.add(t.audioId);
      void loadBlob(t.audioId)
        .then((file) => file && decodeForPreview(t.audioId, file))
        .then((buf) => {
          if (!buf) return;
          mutate((p) => ({
            ...p,
            tracks: p.tracks.map((x) => (x.audioId === t.audioId ? { ...x, durationSec: buf.duration } : x)),
          }));
        })
        .catch(() => {
          // The browser can't decode this format for preview; the build decoder may still manage.
        });
    }
  }, [tracks, mutate]);

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
      return { added, skipped: plan.skipped, ignored };
    },
    [latest, mutate],
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
    [latest, mutate],
  );

  return { addFiles, updateTrack, removeTrack };
}
