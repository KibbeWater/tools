import { Hammer, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Kbd } from '@/components/ui/Kbd';
import type { BuildProgress } from '../lib/pack-builder';

interface BuildButtonProps {
  onClick: () => void;
  disabled?: boolean;
  progress: BuildProgress | null;
}

export function BuildButton({ onClick, disabled, progress }: BuildButtonProps) {
  const busy = !!progress && progress.step !== 'done';
  return (
    <div className="flex items-center gap-3">
      {busy && (
        <span className="text-[11.5px] font-mono text-[var(--color-fg-subtle)] tabular-nums">
          {progress!.current}/{progress!.total}
        </span>
      )}
      <Button
        size="lg"
        variant="accent"
        onClick={onClick}
        disabled={disabled || busy}
        leading={
          busy ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <Hammer size={15} />
          )
        }
      >
        {busy ? progress!.message : 'Build pack'}
      </Button>
      {!busy && <Kbd keys="b" />}
    </div>
  );
}
