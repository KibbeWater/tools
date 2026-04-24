import { forwardRef, type SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, options, ...rest },
  ref,
) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          'w-full h-9 pr-9 pl-3 text-[13px] rounded-[var(--radius-sm)] bg-[var(--color-bg-raised)] appearance-none',
          'border border-[var(--color-border)] text-[var(--color-fg)]',
          'transition-colors focus:border-[var(--color-accent-amber)] focus:outline-none',
          'focus:ring-2 focus:ring-[color-mix(in_oklch,var(--color-accent-amber)_30%,transparent)]',
          className,
        )}
        {...rest}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-fg-subtle)]"
      />
    </div>
  );
});
