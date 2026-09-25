import type { ReactNode } from 'react';
import { BuildButton } from './BuildButton';
import type { BuildProgress } from '../lib/pack-builder';

interface BuildBarProps {
  note: ReactNode;
  error: string | null;
  onBuild: () => void;
  disabled: boolean;
  progress: BuildProgress | null;
}

export function BuildBar({ note, error, onBuild, disabled, progress }: BuildBarProps) {
  return (
    <section className="sticky bottom-4" style={{ zIndex: 'var(--z-raised)' }}>
      <div className="flex items-center justify-between gap-4 px-4 py-3 rounded-full border-2 border-[var(--color-ink)] bg-[var(--color-bg-raised)] pl-6 shadow-[var(--shadow-float)]">
        <p className="text-[13px] min-w-0">
          {error ? (
            <span className="text-[var(--color-danger)]">Build failed: {error}</span>
          ) : (
            <span className="text-[var(--color-fg-muted)]">{note}</span>
          )}
        </p>
        <BuildButton onClick={onBuild} disabled={disabled} progress={progress} />
      </div>
    </section>
  );
}
