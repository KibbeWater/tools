import { type HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/cn';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  inset?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { className, hoverable, inset, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        'relative rounded-[20px] border',
        inset
          ? 'bg-[var(--color-surface)] border-[var(--color-border)]'
          : 'bg-[var(--color-bg-raised)] border-[var(--color-border-hi)]',
        hoverable && 'transition-colors hover:border-[var(--color-fg-subtle)]',
        className,
      )}
      {...rest}
    />
  );
});
