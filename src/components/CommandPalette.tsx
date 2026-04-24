import { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { AnimatePresence, motion } from 'framer-motion';
import { Search } from 'lucide-react';
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
          className="fixed inset-0 z-[60] flex items-start justify-center pt-[15vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0 : 0.14 }}
        >
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
          />
          <motion.div
            initial={{ y: reduced ? 0 : -8, opacity: 0, scale: reduced ? 1 : 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: reduced ? 0 : -8, opacity: 0, scale: reduced ? 1 : 0.98 }}
            transition={{ type: 'spring', stiffness: 600, damping: 40 }}
            className="relative w-[min(540px,92vw)] rounded-[var(--radius-lg)] border border-[var(--color-border-hi)] bg-[var(--color-bg-raised)] shadow-2xl overflow-hidden"
          >
            <Command label="Command palette" className="flex flex-col">
              <div className="flex items-center gap-2 px-3.5 h-11 border-b border-[var(--color-border)]">
                <Search size={14} className="text-[var(--color-fg-subtle)]" />
                <Command.Input
                  placeholder="Jump to a tool or page…"
                  className="flex-1 bg-transparent outline-none text-[14px] placeholder:text-[var(--color-fg-subtle)]"
                />
              </div>
              <Command.List className="max-h-[320px] overflow-y-auto p-1.5">
                <Command.Empty className="py-8 text-center text-[12.5px] text-[var(--color-fg-subtle)]">
                  No matches.
                </Command.Empty>
                <Command.Group
                  heading="Pages"
                  className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10.5px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.06em] [&_[cmdk-group-heading]]:text-[var(--color-fg-subtle)]"
                >
                  <PaletteItem onSelect={() => go('/')} label="Home" hint="g h" />
                  <PaletteItem onSelect={() => go('/about')} label="About" />
                </Command.Group>
                <Command.Group
                  heading="Tools"
                  className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10.5px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.06em] [&_[cmdk-group-heading]]:text-[var(--color-fg-subtle)]"
                >
                  {tools.map((t) => (
                    <PaletteItem
                      key={t.id}
                      onSelect={() => go(t.path)}
                      label={t.name}
                      description={t.description}
                      accent={`var(--color-accent-${t.accent})`}
                    />
                  ))}
                </Command.Group>
              </Command.List>
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
      className="flex items-center gap-3 px-2.5 py-2 rounded-[var(--radius-sm)] cursor-pointer text-[13px] data-[selected=true]:bg-[var(--color-surface-hi)] data-[selected=true]:text-[var(--color-fg)] text-[var(--color-fg-muted)]"
    >
      <span
        aria-hidden
        className="h-2 w-2 rounded-full shrink-0"
        style={{ background: accent ?? 'var(--color-fg-subtle)' }}
      />
      <span className="flex-1 min-w-0 truncate">{label}</span>
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
