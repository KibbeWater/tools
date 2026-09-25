import { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { AnimatePresence, motion } from 'framer-motion';
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons/faMagnifyingGlass';
import { useHotkey } from '@tanstack/react-hotkeys';
import { useNavigate } from 'react-router-dom';
import { tools } from '@/tools/registry';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { withViewTransition } from '@/lib/view-transitions';
import { Kbd } from '@/components/ui/Kbd';
import { Icon } from '@/components/ui/Icon';
import { ToolIcon } from '@/components/ToolIcon';

const groupClass =
  '[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:text-[12px] [&_[cmdk-group-heading]]:text-[var(--color-fg-subtle)]';

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
          className="fixed inset-0 flex items-start justify-center pt-[14vh] px-4"
          style={{ zIndex: 'var(--z-cmdk)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0 : 0.12 }}
        >
          <div className="absolute inset-0 bg-[var(--color-overlay)]" onClick={() => setOpen(false)} />
          <motion.div
            initial={{ y: reduced ? 0 : -12, opacity: 0, scale: reduced ? 1 : 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: reduced ? 0 : -12, opacity: 0, scale: reduced ? 1 : 0.97 }}
            transition={{ type: 'spring', stiffness: 600, damping: 38 }}
            className="relative w-[min(560px,100%)] rounded-[20px] border-2 border-[var(--color-ink)] bg-[var(--color-bg-raised)] overflow-hidden shadow-[var(--shadow-float)]"
          >
            <Command label="Command palette" className="flex flex-col">
              <div className="flex items-center gap-2.5 px-3.5 h-12 border-b border-[var(--color-border)]">
                <Icon icon={faMagnifyingGlass} size={14} className="text-[var(--color-fg-subtle)]" />
                <Command.Input
                  placeholder="Go to a tool or page"
                  className="flex-1 bg-transparent outline-none text-[14px] placeholder:text-[var(--color-fg-subtle)]"
                />
                <Kbd keys="Escape" />
              </div>
              <Command.List className="max-h-[360px] overflow-y-auto px-1.5 pb-1.5">
                <Command.Empty className="py-10 text-center text-[13px] text-[var(--color-fg-subtle)]">
                  Nothing matches that.
                </Command.Empty>
                <Command.Group heading="Pages" className={groupClass}>
                  <PaletteItem onSelect={() => go('/')} label="Home" hint="g h" />
                  <PaletteItem onSelect={() => go('/about')} label="About" />
                </Command.Group>
                <Command.Group heading="Tools" className={groupClass}>
                  {tools.map((t) => (
                    <PaletteItem
                      key={t.id}
                      onSelect={() => go(t.path)}
                      label={t.name}
                      description={t.tagline}
                      icon={<ToolIcon name={t.iconName} size={13} />}
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
  icon,
}: {
  onSelect: () => void;
  label: string;
  description?: string;
  hint?: string;
  icon?: React.ReactNode;
}) {
  return (
    <Command.Item
      value={`${label} ${description ?? ''}`}
      onSelect={onSelect}
      className="flex items-center gap-3 px-2 py-2 rounded-[12px] cursor-pointer text-[13.5px] text-[var(--color-fg)] data-[selected=true]:bg-[var(--color-accent)]"
    >
      <span className="w-4 shrink-0 text-center text-[var(--color-fg-subtle)]">{icon}</span>
      <span className="shrink-0 font-medium">{label}</span>
      {description && (
        <span className="hidden sm:inline min-w-0 flex-1 truncate text-[12.5px] text-[var(--color-fg-subtle)]">
          {description}
        </span>
      )}
      {hint && <Kbd keys={hint} className="ml-auto" />}
    </Command.Item>
  );
}
