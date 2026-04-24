import { useMemo, useState } from 'react';
import { Search, Disc3 } from 'lucide-react';
import { Sheet } from '@/components/ui/Sheet';
import { cn } from '@/lib/cn';
import type { DiscMeta } from '../lib/discs';

interface DiscPickerProps {
  open: boolean;
  onClose: () => void;
  discs: DiscMeta[];
  disabledIds: Set<string>;
  onPick: (disc: DiscMeta) => void;
}

export function DiscPicker({ open, onClose, discs, disabledIds, onPick }: DiscPickerProps) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return discs;
    return discs.filter(
      (d) =>
        d.id.toLowerCase().includes(q) ||
        d.label.toLowerCase().includes(q) ||
        (d.composer ?? '').toLowerCase().includes(q),
    );
  }, [discs, query]);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Pick a disc to replace"
      description="Choose from the canonical set for this version. Already-replaced discs are dimmed."
    >
      <div className="flex items-center gap-2 mb-3 px-2.5 h-8 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-raised)]">
        <Search size={14} className="text-[var(--color-fg-subtle)]" />
        <input
          autoFocus
          data-page-search
          placeholder="Filter by name or composer…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 bg-transparent outline-none text-[13px] placeholder:text-[var(--color-fg-subtle)]"
        />
      </div>
      <ul className="space-y-1">
        {filtered.map((d) => {
          const disabled = disabledIds.has(d.id);
          return (
            <li key={d.id}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onPick(d)}
                className={cn(
                  'w-full flex items-center gap-3 px-2.5 py-2 rounded-[var(--radius-sm)] text-left transition-colors',
                  disabled
                    ? 'text-[var(--color-fg-subtle)] opacity-60 cursor-not-allowed'
                    : 'hover:bg-[var(--color-surface-hi)] text-[var(--color-fg)]',
                )}
              >
                <Disc3
                  size={16}
                  className={cn(
                    disabled ? 'text-[var(--color-fg-subtle)]' : 'text-[var(--color-accent-amber)]',
                  )}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] leading-tight truncate">{d.label}</div>
                  {d.composer && (
                    <div className="text-[11.5px] text-[var(--color-fg-subtle)] truncate">
                      {d.composer}
                    </div>
                  )}
                </div>
                <span className="font-mono text-[10.5px] text-[var(--color-fg-subtle)]">
                  {d.id}
                </span>
              </button>
            </li>
          );
        })}
        {filtered.length === 0 && (
          <li className="px-2.5 py-8 text-center text-[12.5px] text-[var(--color-fg-subtle)]">
            No matches.
          </li>
        )}
      </ul>
    </Sheet>
  );
}
