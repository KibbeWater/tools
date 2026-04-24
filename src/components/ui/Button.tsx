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
  'relative inline-flex items-center justify-center gap-2 select-none rounded-full font-semibold ' +
  'transition-[background-color,border-color,transform,opacity,box-shadow] duration-150 ' +
  'disabled:opacity-40 disabled:pointer-events-none ' +
  'border border-transparent active:scale-[0.97] whitespace-nowrap';

const sizes: Record<Size, string> = {
  sm: 'h-7 px-3 text-[12px]',
  md: 'h-9 px-3.5 text-[13px]',
  lg: 'h-11 px-5 text-[14px]',
};

const variants: Record<Variant, string> = {
  primary:
    'bg-[var(--color-fg)] text-[var(--color-bg)] hover:bg-white shadow-[0_1px_0_oklch(1_0_0_/0.4)_inset,0_8px_24px_-12px_oklch(0_0_0_/_0.6)]',
  accent:
    'text-[oklch(0.18_0.012_60)] bg-gradient-to-br from-[var(--color-accent-amber)] via-[var(--color-accent-orange)] to-[var(--color-accent-pink)] hover:brightness-110 shadow-[var(--shadow-glow-amber)]',
  secondary:
    'bg-[var(--color-surface)] text-[var(--color-fg)] border-[var(--color-border)] hover:bg-[var(--color-surface-hi)] hover:border-[var(--color-border-hi)]',
  ghost:
    'text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-surface)]',
  danger:
    'bg-[color-mix(in_oklch,var(--color-danger)_22%,var(--color-bg))] text-[var(--color-danger)] border-[color-mix(in_oklch,var(--color-danger)_30%,transparent)] hover:bg-[color-mix(in_oklch,var(--color-danger)_30%,var(--color-bg))]',
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
