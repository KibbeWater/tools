import { cn } from '@/lib/cn';

interface SegmentedProps<T extends string> {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}

export function Segmented<T extends string>({ value, options, onChange }: SegmentedProps<T>) {
  return (
    <div role="radiogroup" className="inline-flex shrink-0 rounded-full border-2 border-[var(--color-ink)] bg-[var(--color-bg-raised)] p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'h-7 rounded-full px-3 text-[12.5px] font-medium transition-colors',
            value === o.value ? 'bg-[var(--color-accent)] text-[var(--color-accent-fg)]' : 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
