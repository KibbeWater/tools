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
        'relative inline-flex h-[22px] w-[38px] items-center rounded-full transition-all border',
        'disabled:opacity-50 disabled:pointer-events-none',
        checked
          ? 'bg-gradient-to-r from-[var(--color-accent-amber)] to-[var(--color-accent-orange)] border-transparent shadow-[0_0_0_3px_color-mix(in_oklch,var(--color-accent-amber)_18%,transparent)]'
          : 'bg-[var(--color-bg-raised)] border-[var(--color-border)] hover:border-[var(--color-border-hi)]',
      )}
    >
      <span
        className={cn(
          'inline-block h-[16px] w-[16px] rounded-full transition-transform shadow-sm',
          checked
            ? 'translate-x-[19px] bg-[var(--color-bg)]'
            : 'translate-x-[3px] bg-[var(--color-fg-muted)]',
        )}
      />
    </button>
  );
}
