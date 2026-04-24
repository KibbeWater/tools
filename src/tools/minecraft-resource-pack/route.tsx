import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Disc3, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';
import { withViewTransition } from '@/lib/view-transitions';
import { VanillaMode } from './VanillaMode';
import { AdvancedMode } from './AdvancedMode';
import { useMcPackWasm } from './hooks/useMcPackWasm';

type Mode = 'vanilla' | 'advanced';

export default function McPackRoute() {
  const [mode, setMode] = useState<Mode>('vanilla');
  const wasm = useMcPackWasm();

  const switchMode = (next: Mode) => {
    if (next === mode) return;
    withViewTransition(() => setMode(next));
  };

  return (
    <div className="mx-auto max-w-[960px] px-4 py-10 sm:py-14">
      <Link
        to="/"
        viewTransition
        className="inline-flex items-center gap-1.5 text-[12px] text-[var(--color-fg-subtle)] hover:text-[var(--color-fg-muted)] mb-6 transition-colors"
      >
        <ArrowLeft size={12} />
        Back to home
      </Link>

      <header
        className="flex items-start gap-4 mb-10"
        style={{ viewTransitionName: 'tool-card-minecraft-resource-pack' }}
      >
        <div
          className="h-12 w-12 rounded-[var(--radius-md)] border flex items-center justify-center shrink-0"
          style={{
            background: 'color-mix(in oklch, var(--color-accent-amber) 14%, transparent)',
            borderColor: 'color-mix(in oklch, var(--color-accent-amber) 28%, transparent)',
            color: 'var(--color-accent-amber)',
          }}
        >
          <Disc3 size={22} />
        </div>
        <div className="flex-1">
          <h1 className="text-[22px] font-semibold leading-tight">Minecraft Resource Pack Builder</h1>
          <p className="text-[13.5px] text-[var(--color-fg-muted)] mt-1 max-w-[560px]">
            Build a drop-in resource pack that replaces vanilla music discs, or scaffold a
            combined resource pack + datapack for your own custom discs.
          </p>
        </div>
        <WasmStatus state={wasm} />
      </header>

      <nav
        role="tablist"
        className="flex items-center gap-1 mb-6 border-b border-[var(--color-border)]"
      >
        <TabButton active={mode === 'vanilla'} onClick={() => switchMode('vanilla')}>
          Vanilla
        </TabButton>
        <TabButton active={mode === 'advanced'} onClick={() => switchMode('advanced')}>
          Advanced
        </TabButton>
      </nav>

      <motion.div
        key={mode}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
        style={{ viewTransitionName: 'tab-panel' }}
      >
        {mode === 'vanilla' ? <VanillaMode /> : <AdvancedMode />}
      </motion.div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'relative px-3 py-2 text-[13px] transition-colors',
        active
          ? 'text-[var(--color-fg)]'
          : 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]',
      )}
    >
      {children}
      {active && (
        <motion.span
          layoutId="tool-tab-underline"
          className="absolute left-0 right-0 -bottom-px h-[2px] bg-[var(--color-fg)] rounded-full"
        />
      )}
    </button>
  );
}

function WasmStatus({ state }: { state: ReturnType<typeof useMcPackWasm> }) {
  if (state.status === 'ready') {
    return (
      <span className="flex items-center gap-1.5 text-[11px] text-[var(--color-fg-subtle)] shrink-0 mt-1">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-[oklch(0.76_0.15_150)]" />
        WASM ready
      </span>
    );
  }
  if (state.status === 'error') {
    return (
      <span className="flex items-center gap-1.5 text-[11px] text-[oklch(0.82_0.15_25)] shrink-0 mt-1">
        WASM error
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-[11px] text-[var(--color-fg-subtle)] shrink-0 mt-1">
      <Loader2 size={11} className="animate-spin" />
      Loading WASM…
    </span>
  );
}
