import type { ReactNode } from 'react';
import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons/faTriangleExclamation';
import { cn } from '@/lib/cn';
import { Icon } from '@/components/ui/Icon';

/** Something that works on some of a pack's Minecraft versions but not all. Doesn't block the build. */
export function VersionWarning({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      role="note"
      className={cn(
        'flex gap-2 rounded-[12px] border-2 border-[var(--color-ink)] bg-[var(--color-accent-butter)] px-3 py-2 text-[13px] text-[var(--color-ink)]',
        className,
      )}
    >
      <Icon icon={faTriangleExclamation} size={12} className="mt-[3px] shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** Corner badge for a wall tile that has a version warning. */
export function WarningBadge({ title }: { title: string }) {
  return (
    <span
      title={title}
      className="absolute -top-2 -right-2 grid h-6 w-6 place-items-center rounded-full border-2 border-[var(--color-ink)] bg-[var(--color-accent-butter)] text-[var(--color-ink)]"
    >
      <Icon icon={faTriangleExclamation} size={10} />
    </span>
  );
}
