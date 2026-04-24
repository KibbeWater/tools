import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useHotkey, useHotkeySequence } from '@tanstack/react-hotkeys';
import { Command as CmdIcon, Keyboard, Sparkles } from 'lucide-react';
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
      <main className="flex-1 relative">
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
    <header
      className="sticky top-0 surface-glass border-b border-[var(--color-border)]"
      style={{ zIndex: 'var(--z-header)' }}
    >
      <div className="mx-auto max-w-[1120px] h-14 px-4 sm:px-6 flex items-center gap-4 sm:gap-6">
        <Link
          to="/"
          viewTransition
          className="flex items-center gap-2.5 group"
          aria-label="mellow llama — home"
        >
          <span aria-hidden className="relative inline-flex h-7 w-7 shrink-0">
            <span
              className="absolute inset-0 rounded-[8px] blur-md opacity-60 group-hover:opacity-90 transition-opacity"
              style={{
                background:
                  'conic-gradient(from 210deg, var(--color-accent-amber), var(--color-accent-orange), var(--color-accent-pink), var(--color-accent-violet), var(--color-accent-cyan), var(--color-accent-amber))',
              }}
            />
            <span
              className="relative inline-flex items-center justify-center h-full w-full rounded-[8px]"
              style={{
                background:
                  'conic-gradient(from 210deg, var(--color-accent-amber), var(--color-accent-orange), var(--color-accent-pink), var(--color-accent-violet), var(--color-accent-cyan), var(--color-accent-amber))',
              }}
            >
              <span
                className="h-3 w-3 rounded-[3px] bg-[var(--color-bg)]"
                aria-hidden
              />
            </span>
          </span>
          <span className="flex items-baseline gap-1.5 font-semibold text-[14px] tracking-tight">
            <span className="text-[var(--color-fg)]">mellow</span>
            <span className="text-gradient-warm">llama</span>
          </span>
        </Link>
        <nav className="hidden sm:flex items-center gap-0.5 ml-2">
          <NavItem to="/">Home</NavItem>
          <NavItem to="/about">About</NavItem>
        </nav>
        <div className="flex-1" />
        <a
          href="https://github.com/KibbeWater/tools"
          target="_blank"
          rel="noreferrer"
          aria-label="GitHub"
          className="hidden sm:inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-surface)] transition-colors"
        >
          <GithubMark size={14} />
        </a>
        <button
          onClick={onOpenShortcuts}
          className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-full text-[12px] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-surface)] transition-colors"
          title="Keyboard shortcuts (?)"
        >
          <Keyboard size={13} />
          <Kbd keys="?" />
        </button>
        <button
          onClick={() => {
            const evt = new KeyboardEvent('keydown', {
              key: 'k',
              ctrlKey: true,
              metaKey: /Mac|iPhone/.test(navigator.platform),
            });
            document.dispatchEvent(evt);
          }}
          className="inline-flex items-center gap-2 h-8 pl-2.5 pr-1.5 rounded-full text-[12px] text-[var(--color-fg-muted)] border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hi)] hover:border-[var(--color-border-hi)] hover:text-[var(--color-fg)] transition-colors"
        >
          <CmdIcon size={13} />
          <span className="hidden sm:inline">Search</span>
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
          'relative px-3 py-1.5 rounded-full text-[12.5px] font-medium transition-colors',
          isActive
            ? 'text-[var(--color-fg)] bg-[var(--color-surface)]'
            : 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-surface)]/60',
        )
      }
    >
      {children}
    </NavLink>
  );
}

function Footer() {
  return (
    <footer className="mt-24 border-t border-[var(--color-border)] relative">
      <div className="mx-auto max-w-[1120px] px-4 sm:px-6 py-8 grid grid-cols-1 sm:grid-cols-3 gap-6 text-[12px]">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-[var(--color-fg)] font-semibold">
            <Sparkles size={12} className="text-[var(--color-accent-amber)]" />
            mellow llama
          </div>
          <p className="text-[var(--color-fg-subtle)] leading-relaxed">
            Small, static tools. No accounts, no servers, no telemetry.
          </p>
        </div>
        <div className="space-y-1.5">
          <div className="text-[10.5px] uppercase tracking-[0.1em] text-[var(--color-fg-subtle)]">
            Pages
          </div>
          <div className="flex flex-col gap-1">
            <FooterLink to="/">Home</FooterLink>
            <FooterLink to="/about">About</FooterLink>
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="text-[10.5px] uppercase tracking-[0.1em] text-[var(--color-fg-subtle)]">
            Source
          </div>
          <a
            href="https://github.com/KibbeWater/tools"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] transition-colors"
          >
            <GithubMark size={12} />
            github.com/KibbeWater/tools
          </a>
        </div>
      </div>
      <div className="border-t border-[var(--color-border)]">
        <div className="mx-auto max-w-[1120px] px-4 sm:px-6 h-10 flex items-center justify-between text-[11px] text-[var(--color-fg-subtle)]">
          <span>© {new Date().getFullYear()} mellow llama</span>
          <span className="font-mono">v0.1</span>
        </div>
      </div>
    </footer>
  );
}

function GithubMark({ size = 14 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 .5C5.65.5.5 5.65.5 12.02c0 5.1 3.29 9.42 7.86 10.95.58.11.79-.25.79-.56v-2c-3.2.7-3.87-1.36-3.87-1.36-.52-1.34-1.27-1.7-1.27-1.7-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.76 2.69 1.25 3.34.96.1-.74.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.16 1.18a10.94 10.94 0 0 1 5.76 0c2.2-1.49 3.16-1.18 3.16-1.18.62 1.58.23 2.75.11 3.04.74.81 1.18 1.84 1.18 3.1 0 4.43-2.7 5.41-5.27 5.69.41.36.78 1.06.78 2.14v3.18c0 .31.21.68.8.56A11.5 11.5 0 0 0 23.5 12.02C23.5 5.65 18.35.5 12 .5z" />
    </svg>
  );
}

function FooterLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      viewTransition
      className="text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] transition-colors w-fit"
    >
      {children}
    </Link>
  );
}
