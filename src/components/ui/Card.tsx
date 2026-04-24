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
        'relative rounded-[var(--radius-md)] border border-[var(--color-border)]',
        inset
          ? 'bg-[var(--color-bg-raised)]/60'
          : 'bg-[var(--color-surface)]/70 backdrop-blur-[2px]',
        hoverable &&
          'transition-[background-color,border-color,transform] duration-200 hover:bg-[var(--color-surface-hi)] hover:border-[var(--color-border-hi)]',
        className,
      )}
      {...rest}
    />
  );
});
