import { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { AnimatePresence, motion } from 'framer-motion';
import { CornerDownLeft, Search } from 'lucide-react';
import { useHotkey } from '@tanstack/react-hotkeys';
import { useNavigate } from 'react-router-dom';
import { tools } from '@/tools/registry';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { withViewTransition } from '@/lib/view-transitions';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const reduced = useReducedMotion();

  useHotkey('Mod+K', (e) => {
    e.preventDefault();
    setOpen((o) => !o);
  });

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const go = (path: string) => {
    setOpen(false);
    withViewTransition(() => {
      nav(path, { viewTransition: true });
    });
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="cmdk-root"
          className="fixed inset-0 flex items-start justify-center pt-[12vh] px-4"
          style={{ zIndex: 'var(--z-cmdk)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0 : 0.15 }}
        >
          <div
            className="absolute inset-0 bg-[oklch(0.06_0.01_60_/_0.7)] backdrop-blur-md"
            onClick={() => setOpen(false)}
          />
          <motion.div
            initial={{ y: reduced ? 0 : -12, opacity: 0, scale: reduced ? 1 : 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: reduced ? 0 : -12, opacity: 0, scale: reduced ? 1 : 0.97 }}
            transition={{ type: 'spring', stiffness: 600, damping: 38 }}
            className="relative w-[min(580px,100%)] rounded-[var(--radius-lg)] border border-[var(--color-border-hi)] bg-[var(--color-bg-raised)] overflow-hidden shadow-[0_24px_64px_-16px_oklch(0_0_0_/_0.7)]"
          >
            {/* Top accent hairline */}
            <span
              aria-hidden
              className="absolute inset-x-0 top-0 h-px"
              style={{
                background:
                  'linear-gradient(90deg, transparent, var(--color-accent-amber), var(--color-accent-violet), transparent)',
                opacity: 0.6,
              }}
            />

            <Command label="Command palette" className="flex flex-col">
              <div className="flex items-center gap-2.5 px-4 h-12 border-b border-[var(--color-border)]">
                <Search size={15} className="text-[var(--color-fg-muted)]" />
                <Command.Input
                  placeholder="Jump to a tool or page…"
                  className="flex-1 bg-transparent outline-none text-[14px] placeholder:text-[var(--color-fg-subtle)]"
                />
                <kbd className="font-mono text-[10.5px] px-1.5 py-0.5 rounded border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-fg-subtle)]">
                  Esc
                </kbd>
              </div>
              <Command.List className="max-h-[360px] overflow-y-auto p-2">
                <Command.Empty className="py-10 text-center text-[12.5px] text-[var(--color-fg-subtle)]">
                  No matches.
                </Command.Empty>
                <Command.Group
                  heading="Pages"
                  className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-[10.5px] [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.1em] [&_[cmdk-group-heading]]:text-[var(--color-fg-subtle)]"
                >
                  <PaletteItem onSelect={() => go('/')} label="Home" hint="g h" />
                  <PaletteItem onSelect={() => go('/about')} label="About" />
                </Command.Group>
                <Command.Group
                  heading="Tools"
                  className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-[10.5px] [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.1em] [&_[cmdk-group-heading]]:text-[var(--color-fg-subtle)]"
                >
                  {tools.map((t) => (
                    <PaletteItem
                      key={t.id}
                      onSelect={() => go(t.path)}
                      label={t.name}
                      description={t.tagline}
                      accent={`var(--color-accent-${t.accent})`}
                    />
                  ))}
                </Command.Group>
              </Command.List>
              <div className="flex items-center justify-between px-3 h-9 border-t border-[var(--color-border)] bg-[var(--color-bg)]/40 text-[11px] text-[var(--color-fg-subtle)]">
                <span className="flex items-center gap-2">
                  <kbd className="font-mono text-[10px] px-1 py-0.5 rounded border border-[var(--color-border)] bg-[var(--color-bg-raised)]">
                    ↑↓
                  </kbd>
                  navigate
                </span>
                <span className="flex items-center gap-1.5">
                  <CornerDownLeft size={11} />
                  to select
                </span>
              </div>
            </Command>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function PaletteItem({
  onSelect,
  label,
  description,
  hint,
  accent,
}: {
  onSelect: () => void;
  label: string;
  description?: string;
  hint?: string;
  accent?: string;
}) {
  return (
    <Command.Item
      value={`${label} ${description ?? ''}`}
      onSelect={onSelect}
      className="flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-sm)] cursor-pointer text-[13px] data-[selected=true]:bg-[var(--color-surface-hi)] data-[selected=true]:text-[var(--color-fg)] text-[var(--color-fg-muted)] transition-colors"
    >
      <span
        aria-hidden
        className="h-2 w-2 rounded-full shrink-0"
        style={{
          background: accent ?? 'var(--color-fg-subtle)',
          boxShadow: accent ? `0 0 8px ${accent}` : undefined,
        }}
      />
      <span className="flex-1 min-w-0 truncate font-medium">{label}</span>
      {description && (
        <span className="hidden sm:inline text-[11.5px] text-[var(--color-fg-subtle)] truncate">
          {description}
        </span>
      )}
      {hint && (
        <span className="font-mono text-[10.5px] text-[var(--color-fg-subtle)]">{hint}</span>
      )}
    </Command.Item>
  );
}
