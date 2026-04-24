import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useHotkey, useHotkeySequence } from '@tanstack/react-hotkeys';
import { Command as CmdIcon, Keyboard } from 'lucide-react';
import { Kbd } from '@/components/ui/Kbd';
import { CommandPalette } from '@/components/CommandPalette';
import { ShortcutSheet } from '@/components/ShortcutSheet';
import { withViewTransition } from '@/lib/view-transitions';
import { cn } from '@/lib/cn';

export default function Root() {
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const nav = useNavigate();

  const goto = (path: string) =>
    withViewTransition(() => nav(path, { viewTransition: true }));

  useHotkeySequence(['G', 'H'], () => goto('/'));
  useHotkeySequence(['G', 'M'], () => goto('/minecraft-resource-pack'));
  useHotkey({ key: '/', shift: true }, (e) => {
    e.preventDefault();
    setShortcutsOpen((o) => !o);
  });
  useHotkey('/', (e) => {
    const active = document.activeElement as HTMLElement | null;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;
    const search = document.querySelector<HTMLElement>('[data-page-search]');
    if (search) {
      e.preventDefault();
      search.focus();
    }
  });

  return (
    <div className="min-h-full flex flex-col">
      <Header onOpenShortcuts={() => setShortcutsOpen(true)} />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <CommandPalette />
      <ShortcutSheet open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </div>
  );
}

function Header({ onOpenShortcuts }: { onOpenShortcuts: () => void }) {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-[oklch(0.15_0.005_260_/_0.72)] border-b border-[var(--color-border)]">
      <div className="mx-auto max-w-[1080px] h-12 px-4 flex items-center gap-6">
        <Link
          to="/"
          viewTransition
          className="flex items-center gap-2 text-[13.5px] font-semibold tracking-tight text-[var(--color-fg)]"
        >
          <span
            aria-hidden
            className="inline-block h-4 w-4 rounded-[5px]"
            style={{
              background:
                'conic-gradient(from 210deg, var(--color-accent-amber), var(--color-accent-violet), var(--color-accent-cyan), var(--color-accent-amber))',
            }}
          />
          <span>
            mellow <span className="text-[var(--color-fg-muted)]">llama</span>
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-[12.5px]">
          <NavItem to="/">Home</NavItem>
          <NavItem to="/about">About</NavItem>
        </nav>
        <div className="flex-1" />
        <button
          onClick={onOpenShortcuts}
          className="flex items-center gap-1.5 text-[12px] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] transition-colors"
          title="Keyboard shortcuts (?)"
        >
          <Keyboard size={13} />
          <Kbd keys="?" />
        </button>
        <div className="h-4 w-px bg-[var(--color-border)]" />
        <button
          onClick={() => {
            const evt = new KeyboardEvent('keydown', {
              key: 'k',
              ctrlKey: true,
              metaKey: /Mac|iPhone/.test(navigator.platform),
            });
            document.dispatchEvent(evt);
          }}
          className="flex items-center gap-1.5 text-[12px] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] transition-colors"
        >
          <CmdIcon size={13} />
          <Kbd keys="Mod+K" />
        </button>
      </div>
    </header>
  );
}

function NavItem({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      viewTransition
      className={({ isActive }) =>
        cn(
          'px-2 py-1 rounded-[var(--radius-xs)] transition-colors',
          isActive
            ? 'text-[var(--color-fg)]'
            : 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]',
        )
      }
    >
      {children}
    </NavLink>
  );
}

function Footer() {
  return (
    <footer className="border-t border-[var(--color-border)] mt-16">
      <div className="mx-auto max-w-[1080px] px-4 h-14 flex items-center justify-between text-[11.5px] text-[var(--color-fg-subtle)]">
        <span>mellow llama — small static tools.</span>
        <a
          href="https://github.com/KibbeWater/tools"
          target="_blank"
          rel="noreferrer"
          className="hover:text-[var(--color-fg-muted)] transition-colors"
        >
          source on github
        </a>
      </div>
    </footer>
  );
}
