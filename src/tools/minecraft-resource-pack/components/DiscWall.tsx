import { useRef, useState, type DragEvent, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { faPlus } from '@fortawesome/free-solid-svg-icons/faPlus';
import { faCompactDisc } from '@fortawesome/free-solid-svg-icons/faCompactDisc';
import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons/faTriangleExclamation';
import { Icon } from '@/components/ui/Icon';
import { WarningBadge } from '@/components/VersionWarning';
import type { VersionRange } from '@/lib/minecraft';
import { cn } from '@/lib/cn';
import { DISCS, discImage, supportsCustomDiscs, type McVersion } from '../lib/discs';
import { trackProblem, trackWarning, type CustomTrack, type Track, type VanillaTrack } from '../lib/project';
import type { DropTarget } from '../hooks/useDiscs';
import { formatTime } from './TrackPanel';

interface DiscWallProps {
  /** The versions the pack targets; the wall shows the newest one's discs. */
  range: VersionRange<McVersion>;
  tracks: Track[];
  selectedKey: string | null;
  duplicateIds: Set<string>;
  onSelect: (key: string) => void;
  onFiles: (files: File[], target?: DropTarget) => void;
}

const ACCEPT = 'audio/*,.mp3,.wav,.flac,.ogg,.m4a,.aac';

/**
 * Every disc in the selected version as a tile. Drop files anywhere on the
 * wall to fill discs automatically, or onto one tile to set that disc.
 */
export function DiscWall({ range, tracks, selectedKey, duplicateIds, onSelect, onFiles }: DiscWallProps) {
  const [over, setOver] = useState(false);
  const depth = useRef(0);
  const vanilla = new Map(
    tracks.filter((t): t is VanillaTrack => t.kind === 'vanilla').map((t) => [t.discId, t]),
  );
  const custom = tracks.filter((t): t is CustomTrack => t.kind === 'custom');
  const version = range.to;
  // Replacements for discs this version doesn't have stay visible so they can be fixed or removed.
  const orphans = [...vanilla.values()].filter((t) => !version.discs.includes(t.discId));
  const canCustom = supportsCustomDiscs(version);

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
      // A tile already took this drop for its own disc.
      if (droppedOnTile.has(e.nativeEvent)) return;
      onFiles([...e.dataTransfer.files]);
    },
  };

  let n = 0;
  const stagger = () => ({ delay: Math.min(n++ * 0.018, 0.4) });

  return (
    <div
      {...dragProps}
      className={cn(
        'relative rounded-[28px] border-2 border-dashed p-4 sm:p-5 transition-colors',
        over
          ? 'border-[var(--color-accent-deep)] bg-[var(--color-accent-soft)]'
          : 'border-[var(--color-border-hi)] bg-[var(--color-bg-raised)]',
      )}
    >
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(92px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(112px,1fr))] gap-2 sm:gap-3">
        {version.discs.map((id) => {
          const disc = DISCS.find((d) => d.id === id)!;
          const t = vanilla.get(id);
          return (
            <Tile
              key={id}
              transition={stagger()}
              image={<img src={discImage(id)} alt="" width={64} height={64} className="pixelated w-16 h-16" />}
              title={disc.label}
              track={t}
              range={range}
              selected={!!t && t.key === selectedKey}
              onSelect={() => t && onSelect(t.key)}
              onFiles={(files) => onFiles(files, { kind: 'vanilla', discId: id })}
            />
          );
        })}
        {orphans.map((t) => (
          <Tile
            key={t.key}
            transition={stagger()}
            image={<img src={discImage(t.discId)} alt="" width={64} height={64} className="pixelated w-16 h-16 grayscale" />}
            title={DISCS.find((d) => d.id === t.discId)?.label ?? t.discId}
            track={t}
            range={range}
            selected={t.key === selectedKey}
            onSelect={() => onSelect(t.key)}
            onFiles={(files) => onFiles(files, { kind: 'vanilla', discId: t.discId })}
          />
        ))}
        {custom.map((t) => (
          <Tile
            key={t.key}
            transition={stagger()}
            image={<CustomDiscArt />}
            title={t.displayName || 'Untitled disc'}
            track={t}
            range={range}
            duplicate={duplicateIds.has(`${t.namespace}:${t.id}`)}
            selected={t.key === selectedKey}
            onSelect={() => onSelect(t.key)}
            onFiles={(files) => onFiles(files, { kind: 'custom', trackKey: t.key })}
          />
        ))}
        {canCustom && (
          <PickTile transition={stagger()} onFiles={(files) => files.forEach((f) => onFiles([f], { kind: 'custom' }))}>
            <span className="grid h-16 w-16 place-items-center">
              <span className="grid h-11 w-11 place-items-center rounded-full border-2 border-dashed border-[var(--color-fg-subtle)] text-[var(--color-fg-muted)]">
                <Icon icon={faPlus} size={14} />
              </span>
            </span>
            <span className="text-[13px] font-semibold leading-tight">New disc</span>
            <span className="text-[11.5px] text-[var(--color-fg-subtle)]">plays alongside vanilla</span>
          </PickTile>
        )}
      </ul>

      {over && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center rounded-[26px]">
          <span className="rounded-full border-2 border-[var(--color-ink)] bg-[var(--color-accent)] px-5 py-2 font-display text-[18px] font-semibold shadow-[3px_3px_0_var(--color-ink)]">
            Drop to fill discs
          </span>
        </div>
      )}
    </div>
  );
}

interface TileProps {
  image: ReactNode;
  title: string;
  track?: Track;
  range: VersionRange<McVersion>;
  duplicate?: boolean;
  selected: boolean;
  transition: { delay: number };
  onSelect: () => void;
  onFiles: (files: File[]) => void;
}

function Tile({ image, title, track, range, duplicate, selected, transition, onSelect, onFiles }: TileProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const problem = track ? trackProblem(track, range.to) ?? (duplicate ? 'Duplicate id' : null) : null;
  const warning = track && !problem ? trackWarning(track, range) : null;

  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 26, ...transition }}
    >
      <button
        type="button"
        data-disc-tile={title}
        onClick={() => (track ? onSelect() : inputRef.current?.click())}
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
          'group relative flex h-full w-full flex-col items-center gap-1 rounded-[20px] border-2 px-2 pt-2 pb-3 text-center transition-[background-color,border-color,box-shadow,translate]',
          track
            ? 'border-[var(--color-ink)] bg-[var(--color-accent)] shadow-[3px_3px_0_var(--color-ink)] hover:-translate-y-0.5'
            : 'border-transparent hover:border-[var(--color-border-hi)] hover:bg-[var(--color-surface)]',
          selected && 'ring-4 ring-[var(--color-accent-deep)] ring-offset-2 ring-offset-[var(--color-bg-raised)]',
          over && 'border-[var(--color-ink)] bg-[var(--color-accent-soft)] scale-105',
        )}
      >
        <span className={cn('transition-transform duration-300', track ? 'group-hover:rotate-12' : 'opacity-60 group-hover:opacity-100')}>
          {image}
        </span>
        <span className="text-[13px] font-semibold leading-tight">{title}</span>
        <span className="w-full truncate text-[11.5px] text-[color-mix(in_oklch,var(--color-ink)_70%,transparent)]">
          {track ? (track.durationSec !== undefined ? formatTime(track.durationSec) : track.fileName) : over ? 'Drop here' : 'Add audio'}
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
        accept={ACCEPT}
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

function PickTile({ children, transition, onFiles }: { children: ReactNode; transition: { delay: number }; onFiles: (f: File[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 26, ...transition }}
    >
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex h-full w-full flex-col items-center gap-1 rounded-[20px] border-2 border-transparent px-2 pt-2 pb-3 text-center hover:border-[var(--color-border-hi)] hover:bg-[var(--color-surface)] transition-colors"
      >
        {children}
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT}
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

function CustomDiscArt() {
  return (
    <span className="grid h-16 w-16 place-items-center">
      <span className="grid h-12 w-12 place-items-center rounded-full border-2 border-[var(--color-ink)] bg-[var(--color-bg-raised)]">
        <Icon icon={faCompactDisc} size={22} />
      </span>
    </span>
  );
}

const hasFiles = (e: DragEvent) => [...e.dataTransfer.types].includes('Files');

/** Drop events a tile has claimed, so the wall doesn't also bulk-fill from them. */
const droppedOnTile = new WeakSet<Event>();
