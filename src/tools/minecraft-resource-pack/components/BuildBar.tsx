import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useHotkey } from '@tanstack/react-hotkeys';
import { faDownload } from '@fortawesome/free-solid-svg-icons/faDownload';
import { faSpinner } from '@fortawesome/free-solid-svg-icons/faSpinner';
import { faCircleCheck } from '@fortawesome/free-solid-svg-icons/faCircleCheck';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Kbd } from '@/components/ui/Kbd';
import type { Project } from '../lib/project';
import { buildPack, downloadBlob, safeFileName, type BuildProgress, type BuildResult } from '../lib/pack-builder';

interface BuildBarProps {
  project: Project;
  disabled: boolean;
}

export function BuildBar({ project, disabled }: BuildBarProps) {
  const [progress, setProgress] = useState<BuildProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<(BuildResult & { builtAt: number }) | null>(null);
  const busy = progress !== null;
  const base = safeFileName(project.name, 'music-pack');
  const files = (r: BuildResult) => ({
    rp: `${base}.zip`,
    dp: `${base} (datapack).zip`,
    r,
  });

  const run = async () => {
    if (busy || disabled) return;
    setError(null);
    setProgress({ current: 0, total: project.tracks.length, message: 'Starting' });
    try {
      const r = await buildPack(project, setProgress);
      setResult({ ...r, builtAt: Date.now() });
      downloadBlob(r.resourcePack, files(r).rp);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setProgress(null);
    }
  };

  useHotkey('B', (e) => {
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
    e.preventDefault();
    void run();
  });

  // A result is stale once the project changes after it was built.
  const fresh = result && result.builtAt >= project.updatedAt ? result : null;

  return (
    <section className="space-y-4">
      <AnimatePresence>
        {fresh && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ type: 'spring', stiffness: 420, damping: 30 }}
            className="rounded-[24px] border-2 border-[var(--color-ink)] bg-[var(--color-accent-mint)] p-5 shadow-[4px_4px_0_var(--color-ink)]"
          >
            <div className="flex items-start gap-3">
              <Icon icon={faCircleCheck} size={22} className="mt-0.5" />
              <div className="min-w-0 flex-1 space-y-3">
                <div>
                  <p className="font-display text-[20px] font-semibold">Your pack is ready</p>
                  <p className="text-[13.5px]">
                    {summary(fresh)} Put <strong>{files(fresh).rp}</strong> in your{' '}
                    <code className="font-mono text-[12.5px]">resourcepacks</code> folder.
                    {fresh.datapack && (
                      <>
                        {' '}
                        The new discs also need <strong>{files(fresh).dp}</strong> in the world's{' '}
                        <code className="font-mono text-[12.5px]">datapacks</code> folder.
                      </>
                    )}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" leading={<Icon icon={faDownload} size={11} />} onClick={() => downloadBlob(fresh.resourcePack, files(fresh).rp)}>
                    Resource pack
                  </Button>
                  {fresh.datapack && (
                    <Button size="sm" leading={<Icon icon={faDownload} size={11} />} onClick={() => downloadBlob(fresh.datapack!, files(fresh).dp)}>
                      Datapack
                    </Button>
                  )}
                </div>
                {fresh.customSongs.length > 0 && (
                  <details className="text-[13px]">
                    <summary className="cursor-pointer font-medium">Commands to get the new discs</summary>
                    <ul className="mt-2 space-y-1">
                      {fresh.customSongs.map((s) => (
                        <li key={s.songId}>
                          <span className="font-medium">{s.label}:</span>{' '}
                          <code className="break-all font-mono text-[12px]">{s.give}</code>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="sticky bottom-4" style={{ zIndex: 'var(--z-raised)' }}>
        <div className="flex items-center justify-between gap-4 rounded-full border-2 border-[var(--color-ink)] bg-[var(--color-bg-raised)] py-2.5 pl-6 pr-3 shadow-[var(--shadow-float)]">
          <p className="min-w-0 truncate text-[13px]" role="status">
            {error ? (
              <span className="text-[var(--color-danger)]">Build failed: {error}</span>
            ) : busy ? (
              <span className="text-[var(--color-fg-muted)] tabular-nums">
                {progress.message} ({Math.min(progress.current + 1, progress.total)}/{progress.total})
              </span>
            ) : (
              <span className="text-[var(--color-fg-muted)]">
                {project.tracks.length
                  ? 'Only discs you changed get converted again.'
                  : 'Add some audio to build a pack.'}
              </span>
            )}
          </p>
          <div className="flex shrink-0 items-center gap-3">
            <Button
              size="lg"
              variant="accent"
              onClick={() => void run()}
              disabled={disabled || busy}
              leading={<Icon icon={busy ? faSpinner : faDownload} size={13} spin={busy} />}
            >
              {busy ? 'Building' : 'Build pack'}
            </Button>
            {!busy && <Kbd keys="b" className="hidden sm:inline-flex" />}
          </div>
        </div>
      </div>
    </section>
  );
}

function summary(r: BuildResult): string {
  const total = r.encodedCount + r.reusedCount;
  if (r.reusedCount === 0) return `Converted ${total} ${total === 1 ? 'disc' : 'discs'}.`;
  return `Converted ${r.encodedCount}, reused ${r.reusedCount} unchanged.`;
}
