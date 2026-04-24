import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  leading?: ReactNode;
  trailing?: ReactNode;
}

const base =
  'inline-flex items-center justify-center gap-2 select-none rounded-[var(--radius-sm)] font-medium ' +
  'transition-[background-color,border-color,transform,opacity] duration-150 ' +
  'disabled:opacity-50 disabled:pointer-events-none ' +
  'border border-transparent active:scale-[0.98]';

const sizes: Record<Size, string> = {
  sm: 'h-7 px-2.5 text-[12px]',
  md: 'h-8 px-3 text-[13px]',
  lg: 'h-10 px-4 text-[14px]',
};

const variants: Record<Variant, string> = {
  primary:
    'bg-[var(--color-fg)] text-[var(--color-bg)] hover:bg-[oklch(0.93_0_0)]',
  secondary:
    'bg-[var(--color-surface)] text-[var(--color-fg)] border-[var(--color-border)] hover:bg-[var(--color-surface-hi)] hover:border-[var(--color-border-hi)]',
  ghost:
    'text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-surface)]',
  danger:
    'bg-[oklch(0.38_0.18_25)] text-[oklch(0.97_0_0)] hover:bg-[oklch(0.44_0.19_25)]',
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
