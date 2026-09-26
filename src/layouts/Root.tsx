import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useHotkey, useHotkeySequence } from '@tanstack/react-hotkeys';
import { Kbd } from '@/components/ui/Kbd';
import { CommandPalette } from '@/components/CommandPalette';
import { ShortcutSheet } from '@/components/ShortcutSheet';
import { withViewTransition } from '@/lib/view-transitions';
import { cn } from '@/lib/cn';
import { REPO_URL } from '@/lib/site';
import { BrandIcon } from '@/components/ui/BrandIcon';
import github from 'thesvg/github';

export default function Root() {
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const nav = useNavigate();

  const goto = (path: string) =>
    withViewTransition(() => nav(path, { viewTransition: true }));

  useHotkeySequence(['G', 'H'], () => goto('/'));
  useHotkeySequence(['G', 'M'], () => goto('/minecraft-resource-pack'));
  useHotkeySequence(['G', 'P'], () => goto('/minecraft-paintings'));
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

function openPalette() {
  document.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: true,
      metaKey: /Mac|iPhone/.test(navigator.platform),
    }),
  );
}

function Header({ onOpenShortcuts }: { onOpenShortcuts: () => void }) {
  return (
    <header
      className="sticky top-0 bg-[color-mix(in_oklch,var(--color-bg)_92%,transparent)] backdrop-blur-sm border-b border-[var(--color-border)]"
      style={{ zIndex: 'var(--z-header)' }}
    >
      <div className="mx-auto max-w-[1040px] h-14 px-4 sm:px-6 flex items-center gap-6">
        <Link
          to="/"
          viewTransition
          className="group flex items-center gap-2.5 font-display text-[20px] font-semibold text-[var(--color-fg)]"
          aria-label="mellow llama, home"
        >
          <img
            src={`${import.meta.env.BASE_URL}images/llama-face.webp`}
            alt=""
            width={32}
            height={32}
            className="h-8 w-8 transition-transform duration-300 ease-out group-hover:-rotate-12 group-hover:scale-110"
          />
          mellow llama
        </Link>
        <nav className="hidden sm:flex items-center gap-1 text-[13.5px]">
          <NavItem to="/">Tools</NavItem>
          <NavItem to="/about">About</NavItem>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-surface)] transition-colors"
          >
            <BrandIcon icon={github} size={14} />
            Source
          </a>
        </nav>
        <div className="flex-1" />
        <button
          onClick={onOpenShortcuts}
          className="hidden sm:inline-flex items-center gap-2 text-[13px] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] transition-colors"
        >
          Shortcuts <Kbd keys="?" />
        </button>
        <button
          onClick={openPalette}
          className="inline-flex items-center gap-2 h-9 pl-3.5 pr-2 rounded-full text-[13px] text-[var(--color-fg-muted)] border border-[var(--color-border-hi)] bg-[var(--color-bg-raised)] hover:text-[var(--color-fg)] transition-colors"
        >
          Search
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
          'transition-colors',
          isActive
            ? 'text-[var(--color-fg)] font-medium rounded-full bg-[var(--color-accent)] px-3 py-1'
              : 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] rounded-full px-3 py-1 hover:bg-[var(--color-surface)]',
        )
      }
    >
      {children}
    </NavLink>
  );
}

function Footer() {
  return (
    <footer className="mt-16 border-t border-[var(--color-border)]">
      <div className="mx-auto max-w-[1040px] px-4 sm:px-6 py-6 flex flex-col sm:flex-row gap-2 sm:items-center justify-between text-[13px] text-[var(--color-fg-subtle)]">
        <p>mellow llama. No accounts, no uploads, no tracking.</p>
        <p className="inline-flex items-center gap-1.5">
          <BrandIcon icon={github} size={13} />
          <a href={REPO_URL} target="_blank" rel="noreferrer" className="link">
            KibbeWater/tools
          </a>{' '}
          on GitHub
        </p>
      </div>
    </footer>
  );
}
