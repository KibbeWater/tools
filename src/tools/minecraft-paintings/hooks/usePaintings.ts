import { useCallback } from 'react';
import type { PackHandle } from '@/tools/minecraft-pack/hooks/usePack';
import { deleteBlob, saveBlob } from '@/tools/minecraft-pack/lib/storage';
import {
  defaultNamespace,
  isImageFile,
  planDrop,
  settingsForImage,
  sizeForAspect,
  stripExtension,
  uid,
  uniqueCustomId,
  type Art,
  type MeasuredFile,
} from '../lib/project';
import { forgetBitmap, measureImage } from '../lib/images';

export type DropTarget = { kind: 'vanilla'; paintingId: string } | { kind: 'custom'; artKey?: string };

export interface DropResult {
  added: Art[];
  /** Images that had nowhere to go. */
  skipped: File[];
  /** Files that aren't images, or that the browser couldn't read. */
  ignored: File[];
}

/** The painting actions on the open pack. */
export function usePaintings({ latest, mutate }: PackHandle) {
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
    [latest, mutate],
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
    [latest, mutate],
  );

  return { addFiles, updateArt, removeArt };
}
