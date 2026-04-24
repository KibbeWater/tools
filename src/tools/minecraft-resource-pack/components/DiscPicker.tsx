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
      <div className="flex items-center gap-2.5 mb-4 px-3 h-10 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-raised)] focus-within:border-[var(--color-accent-amber)] focus-within:ring-2 focus-within:ring-[color-mix(in_oklch,var(--color-accent-amber)_30%,transparent)] transition-all">
        <Search size={14} className="text-[var(--color-fg-muted)]" />
        <input
          autoFocus
          data-page-search
          placeholder="Filter by name or composer…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 bg-transparent outline-none text-[13px] placeholder:text-[var(--color-fg-subtle)]"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="text-[10.5px] font-mono text-[var(--color-fg-subtle)] hover:text-[var(--color-fg)]"
          >
            Clear
          </button>
        )}
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
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-sm)] text-left transition-all',
                  disabled
                    ? 'text-[var(--color-fg-subtle)] opacity-50 cursor-not-allowed'
                    : 'hover:bg-[var(--color-surface-hi)] text-[var(--color-fg)] hover:translate-x-0.5',
                )}
              >
                <div
                  className="h-8 w-8 rounded-[var(--radius-xs)] flex items-center justify-center shrink-0"
                  style={{
                    background: disabled
                      ? 'transparent'
                      : 'color-mix(in oklch, var(--color-accent-amber) 14%, transparent)',
                    color: disabled
                      ? 'var(--color-fg-subtle)'
                      : 'var(--color-accent-amber)',
                    border: disabled
                      ? '1px solid var(--color-border)'
                      : '1px solid color-mix(in oklch, var(--color-accent-amber) 24%, transparent)',
                  }}
                >
                  <Disc3 size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] leading-tight truncate font-medium">
                    {d.label}
                  </div>
                  {d.composer && (
                    <div className="text-[11.5px] text-[var(--color-fg-subtle)] truncate mt-0.5">
                      {d.composer}
                    </div>
                  )}
                </div>
                <span className="font-mono text-[10.5px] text-[var(--color-fg-subtle)] px-1.5 py-0.5 rounded bg-[var(--color-bg-raised)] border border-[var(--color-border)]">
                  {d.id}
                </span>
              </button>
            </li>
          );
        })}
        {filtered.length === 0 && (
          <li className="px-2.5 py-10 text-center text-[12.5px] text-[var(--color-fg-subtle)]">
            No matches.
          </li>
        )}
      </ul>
    </Sheet>
  );
}
