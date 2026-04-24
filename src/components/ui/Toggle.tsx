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
        'relative inline-flex h-[18px] w-[32px] items-center rounded-full transition-colors border',
        'disabled:opacity-50 disabled:pointer-events-none',
        checked
          ? 'bg-[var(--color-fg)] border-transparent'
          : 'bg-[var(--color-surface)] border-[var(--color-border)]',
      )}
    >
      <span
        className={cn(
          'inline-block h-[12px] w-[12px] rounded-full transition-transform',
          checked
            ? 'translate-x-[16px] bg-[var(--color-bg)]'
            : 'translate-x-[3px] bg-[var(--color-fg-muted)]',
        )}
      />
    </button>
  );
}
