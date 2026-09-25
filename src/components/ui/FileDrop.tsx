import { useCallback, useRef, useState, type DragEvent } from 'react';
import { faArrowUpFromBracket } from '@fortawesome/free-solid-svg-icons/faArrowUpFromBracket';
import { cn } from '@/lib/cn';
import { Icon } from './Icon';

interface FileDropProps {
  accept?: string;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  className?: string;
  label?: string;
  sublabel?: string;
  compact?: boolean;
}

export function FileDrop({
  accept,
  multiple,
  onFiles,
  className,
  label = 'Drop a file or click to browse',
  sublabel,
  compact,
}: FileDropProps) {
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handle = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      onFiles(Array.from(files));
    },
    [onFiles],
  );

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setOver(true);
  };
  const onDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setOver(false);
  };
  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setOver(false);
    handle(e.dataTransfer.files);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        'group flex w-full cursor-pointer rounded-[12px] border-2 border-dashed transition-colors',
        compact ? 'items-center gap-2.5 px-3 h-10' : 'flex-col items-center justify-center gap-1.5 px-4 py-8 text-center',
        over
          ? 'border-[var(--color-accent-deep)] bg-[var(--color-accent-soft)]'
          : 'border-[var(--color-border-hi)] bg-[var(--color-bg-raised)] hover:border-[var(--color-fg-subtle)]',
        className,
      )}
    >
      <Icon
        icon={faArrowUpFromBracket}
        size={compact ? 13 : 18}
        className={cn(
          'shrink-0 transition-colors',
          over ? 'text-[var(--color-accent-deep)]' : 'text-[var(--color-fg-subtle)] group-hover:text-[var(--color-fg-muted)]',
        )}
      />
      <div className="min-w-0 truncate text-[13px] text-[var(--color-fg)]">{label}</div>
      {sublabel && !compact && (
        <div className="text-[12px] text-[var(--color-fg-subtle)] max-w-[36ch]">{sublabel}</div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="sr-only"
        onChange={(e) => handle(e.target.files)}
      />
    </div>
  );
}
