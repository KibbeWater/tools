import { useCallback, useRef, useState, type DragEvent } from 'react';
import { UploadCloud } from 'lucide-react';
import { cn } from '@/lib/cn';

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
        'group relative flex items-center gap-3 w-full rounded-[var(--radius-sm)] transition-all cursor-pointer overflow-hidden',
        compact ? 'px-3 py-2.5' : 'px-4 py-7 flex-col justify-center text-center',
        over
          ? 'border border-[var(--color-accent-amber)] bg-[color-mix(in_oklch,var(--color-accent-amber)_8%,var(--color-surface))] ring-2 ring-[color-mix(in_oklch,var(--color-accent-amber)_25%,transparent)]'
          : 'border border-dashed border-[var(--color-border)] bg-[var(--color-surface)]/60 hover:border-[var(--color-border-hi)] hover:bg-[var(--color-surface-hi)]/60',
        className,
      )}
    >
      {!compact && over && (
        <span
          aria-hidden
          className="absolute inset-0 pointer-events-none opacity-60"
          style={{
            background:
              'radial-gradient(60% 80% at 50% 100%, color-mix(in oklch, var(--color-accent-amber) 25%, transparent), transparent 70%)',
          }}
        />
      )}
      <div
        className={cn(
          'relative flex items-center justify-center shrink-0 transition-colors',
          compact ? '' : 'h-10 w-10 rounded-full bg-[var(--color-bg-raised)]',
        )}
      >
        <UploadCloud
          size={compact ? 16 : 18}
          className={cn(
            'transition-colors',
            over
              ? 'text-[var(--color-accent-amber)]'
              : 'text-[var(--color-fg-subtle)] group-hover:text-[var(--color-fg-muted)]',
          )}
        />
      </div>
      <div className={cn('relative min-w-0', !compact && 'space-y-1')}>
        <div className="text-[13px] text-[var(--color-fg)] font-medium truncate">
          {label}
        </div>
        {sublabel && (
          <div className="text-[11.5px] text-[var(--color-fg-subtle)]">{sublabel}</div>
        )}
      </div>
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
