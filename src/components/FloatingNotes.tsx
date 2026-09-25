import type { CSSProperties } from 'react';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';

interface FloatingNotesProps {
  icons: IconDefinition[];
  /** `hover` plays only while a `.group` ancestor is hovered. */
  mode?: 'hover' | 'always';
  className?: string;
  size?: number;
}

// Hand-placed so the notes fan out instead of stacking on one path.
const slots = [
  { left: '10%', drift: '-18px', delay: '0s' },
  { left: '45%', drift: '10px', delay: '0.6s' },
  { left: '75%', drift: '22px', delay: '1.2s' },
  { left: '28%', drift: '-6px', delay: '0.9s' },
];

export function FloatingNotes({ icons, mode = 'hover', className, size = 16 }: FloatingNotesProps) {
  return (
    <span
      aria-hidden
      className={cn('pointer-events-none absolute', mode === 'hover' ? 'notes-hover' : 'notes-always', className)}
    >
      {slots.map((slot, i) => (
        <span
          key={i}
          className="note absolute bottom-0"
          style={{ left: slot.left, '--drift': slot.drift, '--delay': slot.delay } as CSSProperties}
        >
          <Icon icon={icons[i % icons.length]} size={size} />
        </span>
      ))}
    </span>
  );
}
