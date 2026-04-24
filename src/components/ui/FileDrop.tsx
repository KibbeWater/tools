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
        'group relative flex items-center gap-3 w-full rounded-[var(--radius-md)] border border-dashed transition-colors cursor-pointer',
        compact ? 'px-3 py-2.5' : 'px-4 py-6 flex-col justify-center text-center',
        over
          ? 'border-[var(--color-border-hi)] bg-[var(--color-surface-hi)]'
          : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-border-hi)] hover:bg-[var(--color-surface-hi)]',
        className,
      )}
    >
      <UploadCloud
        size={compact ? 16 : 22}
        className="text-[var(--color-fg-subtle)] group-hover:text-[var(--color-fg-muted)] transition-colors shrink-0"
      />
      <div className={cn('min-w-0', !compact && 'space-y-1')}>
        <div className="text-[13px] text-[var(--color-fg)]">{label}</div>
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
