import { cn } from '@/lib/cn';

interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  id?: string;
  ariaLabel?: string;
  disabled?: boolean;
}

export function Toggle({ checked, onChange, id, ariaLabel, disabled }: ToggleProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors',
        'disabled:opacity-40 disabled:pointer-events-none',
        checked
          ? 'bg-[var(--color-accent)] border-[var(--color-ink)]'
          : 'bg-[var(--color-surface-hi)] border-[var(--color-border-hi)]',
      )}
    >
      <span
        className={cn(
          'inline-block h-3.5 w-3.5 rounded-full border border-[var(--color-ink)] bg-[var(--color-bg-raised)] transition-transform',
          checked ? 'translate-x-[18px]' : 'translate-x-[2px]',
        )}
      />
    </button>
  );
}
