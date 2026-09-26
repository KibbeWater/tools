import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useHotkey } from '@tanstack/react-hotkeys';
import { faDownload } from '@fortawesome/free-solid-svg-icons/faDownload';
import { faSpinner } from '@fortawesome/free-solid-svg-icons/faSpinner';
import { faCircleCheck } from '@fortawesome/free-solid-svg-icons/faCircleCheck';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Kbd } from '@/components/ui/Kbd';
import { downloadBlob, safeFileName } from '@/lib/minecraft';
import type { Project } from '../lib/project';
import { buildPack, type BuildProgress, type BuildResult } from '../lib/pack-builder';

interface BuildBarProps {
  project: Project;
  disabled: boolean;
}

export function BuildBar({ project, disabled }: BuildBarProps) {
  const [progress, setProgress] = useState<BuildProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<(BuildResult & { builtAt: number }) | null>(null);
  const busy = progress !== null;
  const base = safeFileName(project.name, 'painting-pack');
  const files = { rp: `${base}.zip`, dp: `${base} (datapack).zip` };

  const run = async () => {
    if (busy || disabled) return;
    setError(null);
    setProgress({ current: 0, total: project.art.length, message: 'Starting' });
    try {
      const r = await buildPack(project, setProgress);
      setResult({ ...r, builtAt: Date.now() });
      downloadBlob(r.resourcePack, files.rp);
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
                    {fresh.count} {fresh.count === 1 ? 'painting' : 'paintings'}. Put <strong>{files.rp}</strong> in your{' '}
                    <code className="font-mono text-[12.5px]">resourcepacks</code> folder.
                    {fresh.datapack && (
                      <>
                        {' '}
                        The new paintings also need <strong>{files.dp}</strong> in the world's{' '}
                        <code className="font-mono text-[12.5px]">datapacks</code> folder. Rejoin the world after adding it.
                      </>
                    )}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" leading={<Icon icon={faDownload} size={11} />} onClick={() => downloadBlob(fresh.resourcePack, files.rp)}>
                    Resource pack
                  </Button>
                  {fresh.datapack && (
                    <Button size="sm" leading={<Icon icon={faDownload} size={11} />} onClick={() => downloadBlob(fresh.datapack!, files.dp)}>
                      Datapack
                    </Button>
                  )}
                </div>
                {fresh.customPaintings.length > 0 && (
                  <details className="text-[13px]">
                    <summary className="cursor-pointer font-medium">Commands to get the new paintings</summary>
                    <ul className="mt-2 space-y-1">
                      {fresh.customPaintings.map((p) => (
                        <li key={p.variantId}>
                          <span className="font-medium">{p.label}:</span>{' '}
                          <code className="break-all font-mono text-[12px]">{p.give}</code>
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
                {project.art.length ? 'Everything runs in your browser.' : 'Add some images to build a pack.'}
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
