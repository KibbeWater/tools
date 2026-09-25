import { motion } from 'framer-motion';
import { faPen } from '@fortawesome/free-solid-svg-icons/faPen';
import { faTrashCan } from '@fortawesome/free-solid-svg-icons/faTrashCan';
import { cn } from '@/lib/cn';
import { Icon } from '@/components/ui/Icon';
import { discImage } from '../lib/discs';
import type { DiscReplacement } from '../lib/state';

interface ReplacementRowProps {
  index: number;
  item: DiscReplacement;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onRemove: () => void;
}

export function ReplacementRow({
  item,
  selected,
  onSelect,
  onEdit,
  onRemove,
}: ReplacementRowProps) {
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
      className={cn(
        'group flex items-center gap-4 pl-4 pr-3 py-2.5 border-b border-[var(--color-border)] last:border-b-0 cursor-pointer transition-colors',
        selected
          ? 'bg-[var(--color-accent-soft)]'
          : 'hover:bg-[var(--color-surface)]',
      )}
      onClick={onSelect}
    >
      <img
        src={discImage(item.disc.id)}
        alt=""
        width={48}
        height={48}
        className="pixelated w-12 h-12 -my-1 shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-[14px] text-[var(--color-fg)] font-medium truncate">
            {item.disc.label}
          </span>
          <span className="text-[12.5px] text-[var(--color-fg-subtle)] truncate">
            {item.disc.composer}
          </span>
        </div>
        <div className="text-[13px] text-[var(--color-fg-muted)] truncate mt-0.5">
          {item.source.name}
        </div>
      </div>
      <div className="flex items-center gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        <RowButton label="Edit" onClick={onEdit}>
          <Icon icon={faPen} size={12} />
        </RowButton>
        <RowButton label="Remove" onClick={onRemove} danger>
          <Icon icon={faTrashCan} size={12} />
        </RowButton>
      </div>
    </motion.li>
  );
}

function RowButton({
  label,
  onClick,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        'h-8 w-8 inline-flex items-center justify-center rounded-full text-[var(--color-fg-muted)] hover:bg-[var(--color-surface-hi)]',
        danger ? 'hover:text-[var(--color-danger)]' : 'hover:text-[var(--color-fg)]',
      )}
    >
      {children}
    </button>
  );
}
