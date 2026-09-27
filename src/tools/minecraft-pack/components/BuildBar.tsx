import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useHotkey } from '@tanstack/react-hotkeys';
import { faDownload } from '@fortawesome/free-solid-svg-icons/faDownload';
import { faSpinner } from '@fortawesome/free-solid-svg-icons/faSpinner';
import { faCircleCheck } from '@fortawesome/free-solid-svg-icons/faCircleCheck';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Kbd } from '@/components/ui/Kbd';
import { buildPack, downloadBlob, isEmptyPack, safeFileName, type BuildProgress, type BuildResult } from '../lib/build';
import { plural, type Pack } from '../lib/pack';

interface BuildBarProps {
  pack: Pack;
  /** Why the pack can't build right now, if it can't. */
  blocked: string | null;
}

export function BuildBar({ pack, blocked }: BuildBarProps) {
  const [progress, setProgress] = useState<BuildProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<(BuildResult & { builtAt: number; packId: string }) | null>(null);
  const busy = progress !== null;
  const base = safeFileName(pack.name, 'resource-pack');
  const files = { rp: `${base}.zip`, dp: `${base} (datapack).zip` };

  const run = async () => {
    if (busy || blocked) return;
    setError(null);
    setProgress({ current: 0, total: pack.tracks.length + pack.art.length, message: 'Starting' });
    try {
      const r = await buildPack(pack, setProgress);
      setResult({ ...r, builtAt: Date.now(), packId: pack.id });
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

  // A result is stale once the pack changes after it was built, or another pack is opened.
  const fresh = result && result.packId === pack.id && result.builtAt >= pack.updatedAt ? result : null;
  const custom = fresh ? [...fresh.discs.custom.map((s) => ({ id: s.songId, label: s.label, give: s.give })), ...fresh.paintings.custom.map((p) => ({ id: p.variantId, label: p.label, give: p.give }))] : [];

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
                    {summary(fresh)} Put <strong>{files.rp}</strong> in your{' '}
                    <code className="font-mono text-[12.5px]">resourcepacks</code> folder.
                    {fresh.datapack && (
                      <>
                        {' '}
                        The new {newThings(fresh)} also need <strong>{files.dp}</strong> in the world's{' '}
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
                {custom.length > 0 && (
                  <details className="text-[13px]">
                    <summary className="cursor-pointer font-medium">Commands to get the new {newThings(fresh)}</summary>
                    <ul className="mt-2 space-y-1">
                      {custom.map((c) => (
                        <li key={c.id}>
                          <span className="font-medium">{c.label}:</span>
                          {c.give.map((g) => (
                            <div key={g.command}>
                              {g.versions && <span className="text-[var(--color-fg-muted)]">{g.versions}: </span>}
                              <code className="break-all font-mono text-[12px]">{g.command}</code>
                            </div>
                          ))}
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
                {blocked ?? 'Builds every disc and painting into one pack. Unchanged discs are reused.'}
              </span>
            )}
          </p>
          <div className="flex shrink-0 items-center gap-3">
            <Button
              size="lg"
              variant="accent"
              onClick={() => void run()}
              disabled={!!blocked || busy}
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

/** Why a pack can't build, or `null` if it can. */
export function blockedReason(pack: Pack, problems: string[]): string | null {
  if (isEmptyPack(pack)) return 'Add some audio or images to build a pack.';
  if (problems.length) return `Fix ${plural(problems.length, 'problem')} first: ${problems[0]}`;
  return null;
}

function summary(r: BuildResult): string {
  const parts: string[] = [];
  const discs = r.discs.encoded + r.discs.reused;
  if (discs) {
    parts.push(
      r.discs.reused === 0
        ? `Converted ${plural(discs, 'disc')}`
        : `Converted ${r.discs.encoded} ${r.discs.encoded === 1 ? 'disc' : 'discs'}, reused ${r.discs.reused} unchanged`,
    );
  }
  if (r.paintings.count) parts.push(`painted ${plural(r.paintings.count, 'painting')}`);
  const text = parts.join(', ');
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}.`;
}

function newThings(r: BuildResult): string {
  return [r.discs.custom.length && 'discs', r.paintings.custom.length && 'paintings'].filter(Boolean).join(' and ');
}
