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
        'group flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-sm)] border cursor-pointer transition-colors',
        selected
          ? 'border-[var(--color-border-hi)] bg-[var(--color-surface-hi)]'
          : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hi)]',
      )}
      onClick={onSelect}
    >
      <span className="font-mono text-[10.5px] text-[var(--color-fg-subtle)] w-4 text-right tabular-nums">
        {index + 1}
      </span>
      <Disc3 size={16} className="text-[var(--color-accent-amber)] shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-[var(--color-fg)] font-medium truncate">
            {item.disc.label}
          </span>
          <span className="font-mono text-[10.5px] text-[var(--color-fg-subtle)]">
            {item.disc.id}
          </span>
        </div>
        <div className="text-[11.5px] text-[var(--color-fg-subtle)] truncate">
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
          className="p-1.5 rounded-[4px] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-raised)]"
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
          className="p-1.5 rounded-[4px] text-[var(--color-fg-muted)] hover:text-[oklch(0.8_0.16_25)] hover:bg-[var(--color-bg-raised)]"
          aria-label="Remove"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </motion.li>
  );
}
