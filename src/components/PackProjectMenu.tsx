import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { faChevronDown } from '@fortawesome/free-solid-svg-icons/faChevronDown';
import { faPlus } from '@fortawesome/free-solid-svg-icons/faPlus';
import { faFileZipper } from '@fortawesome/free-solid-svg-icons/faFileZipper';
import { faFileCirclePlus } from '@fortawesome/free-solid-svg-icons/faFileCirclePlus';
import { faTrashCan } from '@fortawesome/free-solid-svg-icons/faTrashCan';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';

interface SavedPack {
  id: string;
  name: string;
  updatedAt: number;
}

/** The slice of a tool's project hook the menu needs. */
export interface PackProjectMenuApi<P extends SavedPack> {
  project: P | null;
  projects: P[];
  createProject: () => Promise<void>;
  openProject: (id: string) => Promise<void>;
  importPack: (file: File) => Promise<void>;
  /** Add a pack zip's contents to the open pack. */
  mergePack?: (file: File) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
}

interface PackProjectMenuProps<P extends SavedPack> {
  api: PackProjectMenuApi<P>;
  /** What a saved pack holds, e.g. "3 discs". */
  describe: (p: P) => string;
  onSwitched: () => void;
}

/** Switch between packs saved in this browser, start a new one, reopen a pack zip, or add one to this pack. */
export function PackProjectMenu<P extends SavedPack>({ api, describe, onSwitched }: PackProjectMenuProps<P>) {
  const [open, setOpen] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  const mergeRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const project = api.project!;

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  const run = async (fn: () => Promise<void>) => {
    setError(null);
    setBusy(true);
    try {
      await fn();
      onSwitched();
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div ref={rootRef} className="relative">
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            className="inline-flex h-10 max-w-[320px] items-center gap-2 rounded-full border-2 border-[var(--color-ink)] bg-[var(--color-bg-raised)] pl-4 pr-3 text-[14px] font-semibold hover:bg-[var(--color-surface)] transition-colors"
          >
            <span className="text-[var(--color-fg-subtle)] font-normal">Pack</span>
            <span className="truncate">{project.name || 'Untitled pack'}</span>
            <Icon icon={faChevronDown} size={10} className={cn('transition-transform', open && 'rotate-180')} />
          </button>

          <AnimatePresence>
            {open && (
              <motion.div
                role="menu"
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 600, damping: 36 }}
                className="absolute left-0 top-12 w-[min(340px,calc(100vw-32px))] origin-top-left rounded-[20px] border-2 border-[var(--color-ink)] bg-[var(--color-bg-raised)] p-2 shadow-[4px_4px_0_var(--color-ink)]"
                style={{ zIndex: 'var(--z-dropdown)' }}
              >
                <div className="px-2 pt-1 pb-2 text-[12px] text-[var(--color-fg-subtle)]">Saved in this browser</div>
                <ul className="max-h-[300px] overflow-y-auto">
                  {api.projects.map((p) => (
                    <li key={p.id} className="flex items-center gap-1">
                      <button
                        type="button"
                        role="menuitem"
                        disabled={busy}
                        onClick={() => (p.id === project.id ? setOpen(false) : run(() => api.openProject(p.id)))}
                        className={cn(
                          'min-w-0 flex-1 rounded-[12px] px-3 py-2 text-left transition-colors hover:bg-[var(--color-surface)]',
                          p.id === project.id && 'bg-[var(--color-accent-soft)]',
                        )}
                      >
                        <div className="truncate text-[14px] font-medium">{p.name || 'Untitled pack'}</div>
                        <div className="text-[12px] text-[var(--color-fg-subtle)]">
                          {describe(p)} · edited {timeAgo(p.updatedAt)}
                        </div>
                      </button>
                      {confirmId === p.id ? (
                        <Button size="sm" variant="danger" disabled={busy} onClick={() => run(() => api.deleteProject(p.id))}>
                          Delete
                        </Button>
                      ) : (
                        <button
                          type="button"
                          aria-label={`Delete ${p.name}`}
                          title="Delete"
                          onClick={() => setConfirmId(p.id)}
                          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[var(--color-fg-subtle)] hover:bg-[var(--color-surface)] hover:text-[var(--color-danger)]"
                        >
                          <Icon icon={faTrashCan} size={12} />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <Button leading={<Icon icon={faPlus} size={12} />} disabled={busy} onClick={() => run(api.createProject)}>
          New pack
        </Button>
        <Button leading={<Icon icon={faFileZipper} size={12} />} disabled={busy} onClick={() => importRef.current?.click()}>
          {busy ? 'Opening…' : 'Open a pack zip'}
        </Button>
        <input
          ref={importRef}
          type="file"
          accept=".zip,application/zip"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) void run(() => api.importPack(f));
          }}
        />
        {api.mergePack && (
          <>
            <Button leading={<Icon icon={faFileCirclePlus} size={12} />} disabled={busy} onClick={() => mergeRef.current?.click()}>
              Add a zip to this pack
            </Button>
            <input
              ref={mergeRef}
              type="file"
              accept=".zip,application/zip"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                const merge = api.mergePack;
                if (f && merge) void run(() => merge(f));
              }}
            />
          </>
        )}
      </div>
      {error && <p className="text-[13.5px] text-[var(--color-danger)]">{error}</p>}
    </div>
  );
}

function timeAgo(ts: number): string {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? 'yesterday' : `${d} days ago`;
}
