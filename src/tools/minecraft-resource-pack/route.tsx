import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Disc3, Loader2, ShieldAlert } from 'lucide-react';
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
    <div className="mx-auto max-w-[1040px] px-4 sm:px-6 pt-8 pb-14">
      <Link
        to="/"
        viewTransition
        className="inline-flex items-center gap-1.5 text-[12px] text-[var(--color-fg-subtle)] hover:text-[var(--color-fg)] mb-8 transition-colors"
      >
        <ArrowLeft size={12} />
        Back to home
      </Link>

      <header
        className="relative flex items-start gap-5 mb-12"
        style={{ viewTransitionName: 'tool-card-minecraft-resource-pack' }}
      >
        <div className="relative shrink-0">
          <span
            aria-hidden
            className="absolute inset-0 rounded-[var(--radius-md)] blur-xl opacity-60"
            style={{ background: 'var(--color-accent-amber)' }}
          />
          <div
            className="relative h-14 w-14 rounded-[var(--radius-md)] flex items-center justify-center"
            style={{
              background:
                'color-mix(in oklch, var(--color-accent-amber) 22%, var(--color-bg))',
              borderColor:
                'color-mix(in oklch, var(--color-accent-amber) 38%, transparent)',
              border: '1px solid',
              color: 'var(--color-accent-amber)',
            }}
          >
            <Disc3 size={26} />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10.5px] uppercase tracking-[0.14em] font-mono text-[var(--color-accent-amber)] mb-2">
            // minecraft · resource pack
          </div>
          <h1 className="text-[26px] sm:text-[32px] font-semibold tracking-[-0.025em] leading-[1.05]">
            Minecraft Resource Pack Builder
          </h1>
          <p className="text-[13.5px] text-[var(--color-fg-muted)] mt-2 max-w-[600px] leading-relaxed">
            Build a drop-in resource pack that replaces vanilla music discs, or
            scaffold a combined resource pack + datapack for your own custom discs.
          </p>
        </div>
        <WasmStatus state={wasm} />
      </header>

      <nav
        role="tablist"
        className="inline-flex items-center p-1 rounded-full bg-[var(--color-bg-raised)] border border-[var(--color-border)] mb-8"
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
        transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
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
        'relative px-4 h-8 rounded-full text-[12.5px] font-semibold transition-colors',
        active
          ? 'text-[var(--color-bg)]'
          : 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]',
      )}
    >
      {active && (
        <motion.span
          layoutId="tool-tab-pill"
          className="absolute inset-0 rounded-full bg-[var(--color-fg)]"
          transition={{ type: 'spring', stiffness: 600, damping: 36 }}
        />
      )}
      <span className="relative">{children}</span>
    </button>
  );
}

function WasmStatus({ state }: { state: ReturnType<typeof useMcPackWasm> }) {
  if (state.status === 'ready') {
    return (
      <span
        className="hidden sm:inline-flex items-center gap-1.5 text-[10.5px] font-mono uppercase tracking-[0.08em] px-2 py-1 rounded-full shrink-0 mt-1"
        style={{
          color: 'var(--color-success)',
          background: 'color-mix(in oklch, var(--color-success) 12%, transparent)',
          border: '1px solid color-mix(in oklch, var(--color-success) 26%, transparent)',
        }}
      >
        <CheckCircle2 size={11} />
        WASM ready
      </span>
    );
  }
  if (state.status === 'error') {
    return (
      <span
        className="hidden sm:inline-flex items-center gap-1.5 text-[10.5px] font-mono uppercase tracking-[0.08em] px-2 py-1 rounded-full shrink-0 mt-1"
        style={{
          color: 'var(--color-danger)',
          background: 'color-mix(in oklch, var(--color-danger) 12%, transparent)',
          border: '1px solid color-mix(in oklch, var(--color-danger) 26%, transparent)',
        }}
      >
        <ShieldAlert size={11} />
        WASM error
      </span>
    );
  }
  return (
    <span className="hidden sm:inline-flex items-center gap-1.5 text-[10.5px] font-mono uppercase tracking-[0.08em] px-2 py-1 rounded-full shrink-0 mt-1 text-[var(--color-fg-subtle)] border border-[var(--color-border)] bg-[var(--color-surface)]">
      <Loader2 size={11} className="animate-spin" />
      Loading WASM…
    </span>
  );
}
