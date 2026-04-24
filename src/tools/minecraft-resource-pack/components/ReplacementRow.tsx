import { Disc3, Pencil, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';
import type { DiscReplacement } from '../lib/state';

interface ReplacementRowProps {
  index: number;
  item: DiscReplacement;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onRemove: () => void;
}

export function ReplacementRow({
  index,
  item,
  selected,
  onSelect,
  onEdit,
  onRemove,
}: ReplacementRowProps) {
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
      className={cn(
        'group relative flex items-center gap-3 px-3.5 py-3 rounded-[var(--radius-sm)] border cursor-pointer transition-all',
        selected
          ? 'border-[color-mix(in_oklch,var(--color-accent-amber)_50%,transparent)] bg-[color-mix(in_oklch,var(--color-accent-amber)_8%,var(--color-surface))]'
          : 'border-[var(--color-border)] bg-[var(--color-surface)]/70 hover:bg-[var(--color-surface-hi)] hover:border-[var(--color-border-hi)]',
      )}
      onClick={onSelect}
    >
      {selected && (
        <span
          aria-hidden
          className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full"
          style={{ background: 'var(--color-accent-amber)' }}
        />
      )}
      <span className="font-mono text-[10.5px] text-[var(--color-fg-subtle)] w-5 text-right tabular-nums">
        {String(index + 1).padStart(2, '0')}
      </span>
      <div
        className="h-8 w-8 rounded-[var(--radius-xs)] flex items-center justify-center shrink-0"
        style={{
          background:
            'color-mix(in oklch, var(--color-accent-amber) 16%, transparent)',
          color: 'var(--color-accent-amber)',
          border:
            '1px solid color-mix(in oklch, var(--color-accent-amber) 28%, transparent)',
        }}
      >
        <Disc3 size={14} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-[var(--color-fg)] font-medium truncate">
            {item.disc.label}
          </span>
          <span className="font-mono text-[10.5px] text-[var(--color-fg-subtle)] px-1.5 py-0.5 rounded bg-[var(--color-bg-raised)] border border-[var(--color-border)]">
            {item.disc.id}
          </span>
        </div>
        <div className="text-[11.5px] text-[var(--color-fg-subtle)] truncate mt-0.5">
          {item.source.name}
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="h-7 w-7 inline-flex items-center justify-center rounded-full text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-raised)]"
          aria-label="Edit"
        >
          <Pencil size={13} />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="h-7 w-7 inline-flex items-center justify-center rounded-full text-[var(--color-fg-muted)] hover:text-[var(--color-danger)] hover:bg-[color-mix(in_oklch,var(--color-danger)_14%,transparent)]"
          aria-label="Remove"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </motion.li>
  );
}
