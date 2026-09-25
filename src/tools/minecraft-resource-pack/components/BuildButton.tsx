import { faDownload } from '@fortawesome/free-solid-svg-icons/faDownload';
import { faSpinner } from '@fortawesome/free-solid-svg-icons/faSpinner';
import { Button } from '@/components/ui/Button';
import { Kbd } from '@/components/ui/Kbd';
import { Icon } from '@/components/ui/Icon';
import type { BuildProgress } from '../lib/pack-builder';

interface BuildButtonProps {
  onClick: () => void;
  disabled?: boolean;
  progress: BuildProgress | null;
}

export function BuildButton({ onClick, disabled, progress }: BuildButtonProps) {
  const busy = !!progress && progress.step !== 'done';
  return (
    <div className="flex items-center gap-3 shrink-0">
      {busy && (
        <span className="text-[12.5px] text-[var(--color-fg-subtle)] tabular-nums">
          {progress!.current}/{progress!.total}
        </span>
      )}
      <Button
        size="lg"
        variant="accent"
        onClick={onClick}
        disabled={disabled || busy}
        leading={busy ? <Icon icon={faSpinner} size={13} spin /> : <Icon icon={faDownload} size={13} />}
      >
        {busy ? progress!.message : 'Build pack'}
      </Button>
      {!busy && <Kbd keys="b" className="hidden sm:inline-flex" />}
    </div>
  );
}
