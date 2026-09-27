import { useRef, useState, type CSSProperties, type DragEvent, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { faPlus } from '@fortawesome/free-solid-svg-icons/faPlus';
import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons/faTriangleExclamation';
import { Icon } from '@/components/ui/Icon';
import { WarningBadge } from '@/components/VersionWarning';
import type { VersionRange } from '@/lib/minecraft';
import { cn } from '@/lib/cn';
import { getPainting, paintingImage, PAINTINGS, sizeLabel, supportsCustomPaintings, type McVersion, type PaintingMeta } from '../lib/paintings';
import { artProblem, artSize, artWarning, IMAGE_ACCEPT, type Art, type CustomArt, type VanillaArt } from '../lib/project';
import type { DropTarget } from '../hooks/usePaintings';
import { ArtPreview } from './ArtPreview';

interface PaintingWallProps {
  /** The versions the pack targets; the wall shows the newest one's paintings. */
  range: VersionRange<McVersion>;
  art: Art[];
  selectedKey: string | null;
  duplicateIds: Set<string>;
  onSelect: (key: string) => void;
  onFiles: (files: File[], target?: DropTarget) => void;
}

/**
 * Every painting in the selected version, drawn to scale and grouped by size.
 * Drop images anywhere on the wall to fill paintings automatically, or onto
 * one painting to set that one.
 */
export function PaintingWall({ range, art, selectedKey, duplicateIds, onSelect, onFiles }: PaintingWallProps) {
  const [over, setOver] = useState(false);
  const depth = useRef(0);
  const vanilla = new Map(art.filter((a): a is VanillaArt => a.kind === 'vanilla').map((a) => [a.paintingId, a]));
  const custom = art.filter((a): a is CustomArt => a.kind === 'custom');
  const version = range.to;
  // Replacements for paintings this version doesn't have stay visible so they can be fixed or removed.
  const orphans = [...vanilla.values()].filter((a) => !version.paintings.includes(a.paintingId));
  const canCustom = supportsCustomPaintings(version);
  const groups = groupBySize(PAINTINGS.filter((p) => version.paintings.includes(p.id)));

  const dragProps = {
    onDragEnter: (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth.current++;
      setOver(true);
    },
    onDragOver: (e: DragEvent) => hasFiles(e) && e.preventDefault(),
    onDragLeave: () => {
      depth.current = Math.max(0, depth.current - 1);
      if (depth.current === 0) setOver(false);
    },
    onDrop: (e: DragEvent) => {
      e.preventDefault();
      depth.current = 0;
      setOver(false);
      // A tile already took this drop for its own painting.
      if (droppedOnTile.has(e.nativeEvent)) return;
      onFiles([...e.dataTransfer.files]);
    },
  };

  let n = 0;
  const stagger = () => ({ delay: Math.min(n++ * 0.012, 0.4) });

  const vanillaTile = (m: PaintingMeta, a: VanillaArt | undefined, orphan = false) => (
    <Tile
      key={a?.key ?? m.id}
      transition={stagger()}
      blocks={{ width: m.width, height: m.height }}
      art={a}
      fallback={<img src={paintingImage(m.id)} alt="" className={cn('pixelated h-full w-full', orphan && 'grayscale')} />}
      title={m.title}
      range={range}
      selected={!!a && a.key === selectedKey}
      onSelect={() => a && onSelect(a.key)}
      onFiles={(files) => onFiles(files, { kind: 'vanilla', paintingId: m.id })}
    />
  );

  return (
    <div
      {...dragProps}
      className={cn(
        'relative space-y-6 rounded-[28px] border-2 border-dashed p-4 sm:p-5 transition-colors',
        over
          ? 'border-[var(--color-accent-deep)] bg-[var(--color-accent-soft)]'
          : 'border-[var(--color-border-hi)] bg-[var(--color-bg-raised)]',
      )}
    >
      {groups.map(({ label, items }) => (
        <Group key={label} label={label}>
          {items.map((m) => vanillaTile(m, vanilla.get(m.id)))}
        </Group>
      ))}

      {orphans.length > 0 && (
        <Group label={`Not in ${version.id}`}>
          {orphans.map((a) => {
            const m = getPainting(a.paintingId);
            return m ? vanillaTile(m, a, true) : null;
          })}
        </Group>
      )}

      {(custom.length > 0 || canCustom) && (
        <Group label="Your own paintings">
          {custom.map((a) => (
            <Tile
              key={a.key}
              transition={stagger()}
              blocks={artSize(a)}
              art={a}
              title={a.title || 'Untitled painting'}
              range={range}
              duplicate={duplicateIds.has(`${a.namespace}:${a.id}`)}
              selected={a.key === selectedKey}
              onSelect={() => onSelect(a.key)}
              onFiles={(files) => onFiles(files, { kind: 'custom', artKey: a.key })}
            />
          ))}
          {canCustom && (
            <PickTile transition={stagger()} onFiles={(files) => files.forEach((f) => onFiles([f], { kind: 'custom' }))} />
          )}
        </Group>
      )}

      {over && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center rounded-[26px]">
          <span className="rounded-full border-2 border-[var(--color-ink)] bg-[var(--color-accent)] px-5 py-2 font-display text-[18px] font-semibold shadow-[3px_3px_0_var(--color-ink)]">
            Drop to fill paintings
          </span>
        </div>
      )}
    </div>
  );
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--color-fg-subtle)]">{label}</h3>
      <ul className="flex flex-wrap items-end gap-2 sm:gap-3">{children}</ul>
    </section>
  );
}

interface TileProps {
  blocks: { width: number; height: number };
  art?: Art;
  /** Shown while the painting has no image of its own. */
  fallback?: ReactNode;
  title: string;
  range: VersionRange<McVersion>;
  duplicate?: boolean;
  selected: boolean;
  transition: { delay: number };
  onSelect: () => void;
  onFiles: (files: File[]) => void;
}

/** Tiles are sized in blocks so the wall reads like the paintings do in game. */
const frameStyle = (w: number, h: number): CSSProperties => {
  // Very large custom paintings get scaled down to stay within a 4-block box.
  const k = Math.min(1, 4 / Math.max(w, h));
  return { width: `calc(var(--block) * ${w * k})`, height: `calc(var(--block) * ${h * k})` };
};

function Tile({ blocks, art, fallback, title, range, duplicate, selected, transition, onSelect, onFiles }: TileProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const problem = art ? (artProblem(art, range.to) ?? (duplicate ? 'Duplicate id' : null)) : null;
  const warning = art && !problem ? artWarning(art, range) : null;

  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 26, ...transition }}
      className="[--block:30px] sm:[--block:38px]"
    >
      <button
        type="button"
        title={`${title} (${sizeLabel(blocks.width, blocks.height)})`}
        onClick={() => (art ? onSelect() : inputRef.current?.click())}
        onDragOver={(e) => {
          if (!hasFiles(e)) return;
          e.preventDefault();
          e.stopPropagation();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          // Bubble on so the wall resets its drag state, but mark it as handled.
          droppedOnTile.add(e.nativeEvent);
          onFiles([...e.dataTransfer.files]);
        }}
        className={cn(
          'group relative flex flex-col items-center gap-1 rounded-[14px] border-2 p-1.5 text-center transition-[background-color,border-color,box-shadow,translate]',
          art
            ? 'border-[var(--color-ink)] bg-[var(--color-accent)] shadow-[3px_3px_0_var(--color-ink)] hover:-translate-y-0.5'
            : 'border-transparent hover:border-[var(--color-border-hi)] hover:bg-[var(--color-surface)]',
          selected && 'ring-4 ring-[var(--color-accent-deep)] ring-offset-2 ring-offset-[var(--color-bg-raised)]',
          over && 'border-[var(--color-ink)] bg-[var(--color-accent-soft)] scale-105',
        )}
      >
        <span
          style={frameStyle(blocks.width, blocks.height)}
          className={cn(
            'block overflow-hidden rounded-[4px] outline outline-2 outline-[color-mix(in_oklch,var(--color-ink)_75%,transparent)] transition-opacity',
            !art && 'opacity-55 group-hover:opacity-100',
          )}
        >
          {art ? <ArtPreview art={art} maxPx={160} /> : fallback}
        </span>
        <span
          className="max-w-full truncate text-[11.5px] font-semibold leading-tight"
          style={{ width: `calc(var(--block) * ${Math.max(2, Math.min(blocks.width, 4))})` }}
        >
          {over ? 'Drop here' : title}
        </span>
        {problem && (
          <span
            title={problem}
            className="absolute -top-2 -right-2 grid h-6 w-6 place-items-center rounded-full border-2 border-[var(--color-ink)] bg-[var(--color-danger)] text-white"
          >
            <Icon icon={faTriangleExclamation} size={10} />
          </span>
        )}
        {warning && <WarningBadge title={warning} />}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          if (e.target.files?.length) onFiles([...e.target.files]);
          e.target.value = '';
        }}
      />
    </motion.li>
  );
}

function PickTile({ transition, onFiles }: { transition: { delay: number }; onFiles: (f: File[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 26, ...transition }}
      className="[--block:30px] sm:[--block:38px]"
    >
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex flex-col items-center gap-1 rounded-[14px] border-2 border-transparent p-1.5 text-center hover:border-[var(--color-border-hi)] hover:bg-[var(--color-surface)] transition-colors"
      >
        <span
          style={frameStyle(2, 2)}
          className="grid place-items-center rounded-[4px] border-2 border-dashed border-[var(--color-fg-subtle)] text-[var(--color-fg-muted)]"
        >
          <Icon icon={faPlus} size={16} />
        </span>
        <span className="text-[11.5px] font-semibold leading-tight">New painting</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={IMAGE_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          if (e.target.files?.length) onFiles([...e.target.files]);
          e.target.value = '';
        }}
      />
    </motion.li>
  );
}

/** Size groups in first-seen order, with command-only paintings kept apart at the end. */
function groupBySize(list: PaintingMeta[]): { label: string; items: PaintingMeta[] }[] {
  const groups = new Map<string, PaintingMeta[]>();
  for (const m of list) {
    const label = m.unused ? 'Command only' : sizeLabel(m.width, m.height);
    groups.set(label, [...(groups.get(label) ?? []), m]);
  }
  const out = [...groups].map(([label, items]) => ({ label, items }));
  return [...out.filter((g) => g.label !== 'Command only'), ...out.filter((g) => g.label === 'Command only')];
}

const hasFiles = (e: DragEvent) => [...e.dataTransfer.types].includes('Files');

/** Drop events a tile has claimed, so the wall doesn't also bulk-fill from them. */
const droppedOnTile = new WeakSet<Event>();
