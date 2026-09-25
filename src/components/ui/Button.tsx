import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  leading?: ReactNode;
  trailing?: ReactNode;
}

const base =
  'inline-flex items-center justify-center gap-2 select-none rounded-full font-medium border-2 ' +
  'transition-[color,background-color,border-color,box-shadow,translate] duration-100 whitespace-nowrap ' +
  'disabled:opacity-40 disabled:pointer-events-none';

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-[12.5px]',
  md: 'h-10 px-4 text-[13.5px]',
  lg: 'h-11 px-5 text-[14px]',
};

const variants: Record<Variant, string> = {
  primary:
    'bg-[var(--color-accent)] text-[var(--color-accent-fg)] font-semibold border-[var(--color-ink)] hover:bg-[var(--color-accent-hover)]',
  accent:
    'bg-[var(--color-accent)] border-[var(--color-ink)] text-[var(--color-accent-fg)] font-semibold shadow-[3px_3px_0_var(--color-ink)] hover:bg-[var(--color-accent-hover)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_var(--color-ink)]',
  secondary:
    'bg-[var(--color-bg-raised)] border-[var(--color-ink)] text-[var(--color-fg)] hover:bg-[var(--color-surface)]',
  ghost:
    'border-transparent text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-surface)]',
  danger:
    'border-[color-mix(in_oklch,var(--color-danger)_40%,transparent)] text-[var(--color-danger)] hover:bg-[color-mix(in_oklch,var(--color-danger)_8%,transparent)]',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'secondary', size = 'md', leading, trailing, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      className={cn(base, sizes[size], variants[variant], className)}
      {...rest}
    >
      {leading}
      {children}
      {trailing}
    </button>
  );
});
