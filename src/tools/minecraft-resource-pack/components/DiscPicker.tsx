import { useMemo, useState } from 'react';
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons/faMagnifyingGlass';
import { Sheet } from '@/components/ui/Sheet';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { discImage, type DiscMeta } from '../lib/discs';

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
      description="Discs you've already replaced are greyed out."
    >
      <div className="flex items-center gap-2.5 mb-3 px-3.5 h-10 rounded-full border-2 border-[var(--color-border-hi)] bg-[var(--color-bg-raised)] focus-within:border-[var(--color-accent-deep)] focus-within:shadow-[0_0_0_3px_var(--color-accent-soft)] transition-colors">
        <Icon icon={faMagnifyingGlass} size={13} className="text-[var(--color-fg-subtle)]" />
        <input
          autoFocus
          data-page-search
          placeholder="Filter by name or composer"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 bg-transparent outline-none focus-visible:outline-none text-[13.5px] placeholder:text-[var(--color-fg-subtle)]"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="text-[12px] text-[var(--color-fg-subtle)] hover:text-[var(--color-fg)]"
          >
            Clear
          </button>
        )}
      </div>
      <ul className="-mx-2">
        {filtered.map((d) => {
          const disabled = disabledIds.has(d.id);
          return (
            <li key={d.id}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onPick(d)}
                className={cn(
                  'w-full flex items-center gap-3 px-2 py-1 rounded-[14px] text-left transition-colors',
                  disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-[var(--color-accent)]',
                )}
              >
                <img
                  src={discImage(d.id)}
                  alt=""
                  width={44}
                  height={44}
                  loading="lazy"
                  className={cn('pixelated w-11 h-11 shrink-0', disabled && 'grayscale')}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] leading-tight truncate font-medium text-[var(--color-fg)]">
                    {d.label}
                  </div>
                  {d.composer && (
                    <div className="text-[12.5px] text-[var(--color-fg-subtle)] truncate mt-0.5">
                      {d.composer}
                    </div>
                  )}
                </div>
                <code className="font-mono text-[11.5px] text-[var(--color-fg-subtle)]">{d.id}</code>
              </button>
            </li>
          );
        })}
        {filtered.length === 0 && (
          <li className="px-2 py-10 text-center text-[13px] text-[var(--color-fg-subtle)]">
            No disc matches “{query}”.
          </li>
        )}
      </ul>
    </Sheet>
  );
}
