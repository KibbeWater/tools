import { useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';
import { withViewTransition } from '@/lib/view-transitions';
import { VanillaMode } from './VanillaMode';
import { AdvancedMode } from './AdvancedMode';
import { useMcPackWasm } from './hooks/useMcPackWasm';
import { faMusic } from '@fortawesome/free-solid-svg-icons/faMusic';
import { FloatingNotes } from '@/components/FloatingNotes';
import { accentVar, toolById } from '@/tools/registry';

const tool = toolById('minecraft-resource-pack')!;

type Mode = 'vanilla' | 'advanced';

export default function McPackRoute() {
  const [mode, setMode] = useState<Mode>('vanilla');
  const wasm = useMcPackWasm();

  const switchMode = (next: Mode) => {
    if (next === mode) return;
    withViewTransition(() => setMode(next));
  };

  return (
    <div
      className="mx-auto max-w-[1040px] px-4 sm:px-6 pt-8 pb-14"
      style={{ '--color-accent': accentVar(tool.accent) } as CSSProperties}
    >
      <nav aria-label="Breadcrumb" className="text-[13px] text-[var(--color-fg-subtle)] mb-5">
        <Link to="/" viewTransition className="hover:text-[var(--color-fg)] transition-colors">
          Tools
        </Link>
        <span className="mx-2">/</span>
        <span className="text-[var(--color-fg-muted)]">{tool.name}</span>
      </nav>

      <header
        className="relative mb-10 overflow-hidden rounded-[28px] border-2 border-[var(--color-ink)] bg-[var(--color-accent)] px-6 py-8 sm:px-10 sm:py-10 text-[var(--color-ink)] shadow-[6px_6px_0_var(--color-ink)]"
        style={{ viewTransitionName: `tool-card-${tool.id}` }}
      >
        <div className="relative max-w-[600px] sm:pr-6">
          <h1 className="font-display text-[36px] sm:text-[50px] font-semibold tracking-[-0.015em] leading-[1.02]">
            {tool.name}
          </h1>
          <p className="mt-4 text-[16px] leading-relaxed text-[color-mix(in_oklch,var(--color-ink)_80%,transparent)]">
            Replace the vanilla music discs with your own audio, or register new discs
            with a combined resource pack and datapack. The output is a zip you drop
            into your resourcepacks folder.
          </p>
          <WasmStatus state={wasm} />
        </div>
        <div className="hidden sm:block absolute right-6 lg:right-12 top-1/2 -translate-y-1/2 w-[160px] lg:w-[200px]">
          <FloatingNotes
            mode="always"
            icons={[faMusic]}
            size={20}
            className="left-[20%] right-[20%] top-[38%] h-0 text-[var(--color-ink)]"
          />
          <img
            src={`${import.meta.env.BASE_URL}images/minecraft/jukebox.png`}
            alt=""
            width={200}
            height={200}
            className="pixelated w-full rotate-6 motion-safe:animate-[float-idle_5s_ease-in-out_infinite]"
          />
        </div>
      </header>

      <div role="tablist" className="inline-flex gap-1 p-1 rounded-full border-2 border-[var(--color-ink)] bg-[var(--color-bg-raised)] mb-10">
        <TabButton active={mode === 'vanilla'} onClick={() => switchMode('vanilla')}>
          Replace vanilla discs
        </TabButton>
        <TabButton active={mode === 'advanced'} onClick={() => switchMode('advanced')}>
          Add custom discs
        </TabButton>
      </div>

      <motion.div
        key={mode}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
        style={{ viewTransitionName: 'tab-panel' }}
      >
        {mode === 'vanilla' ? <VanillaMode /> : <AdvancedMode />}
      </motion.div>

      <p className="mt-12 text-[12.5px] text-[var(--color-fg-subtle)] max-w-[70ch]">
        Disc and jukebox sprites are Minecraft textures, via the{' '}
        <a href="https://minecraft.wiki" target="_blank" rel="noreferrer" className="link">
          Minecraft Wiki
        </a>
        . Minecraft is a trademark of Mojang; this tool isn't affiliated with Mojang or
        Microsoft.
      </p>
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
        'relative h-9 px-4 rounded-full text-[14px] font-semibold transition-colors',
        active
          ? 'text-[var(--color-fg)]'
          : 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]',
      )}
    >
      {active && (
        <motion.span
          layoutId="tool-tab-pill"
          className="absolute inset-0 rounded-full bg-[var(--color-accent)]"
          transition={{ type: 'spring', stiffness: 600, damping: 36 }}
        />
      )}
      <span className="relative">{children}</span>
    </button>
  );
}

function WasmStatus({ state }: { state: ReturnType<typeof useMcPackWasm> }) {
  const { color, text } =
    state.status === 'ready'
      ? { color: 'var(--color-success)', text: 'Pack builder loaded' }
      : state.status === 'error'
        ? { color: 'var(--color-danger)', text: 'Pack builder failed to load' }
        : { color: 'var(--color-accent-deep)', text: 'Loading pack builder…' };
  return (
    <p className="mt-5 inline-flex items-center gap-2 rounded-full border-2 border-[var(--color-ink)] bg-[var(--color-bg-raised)] px-3 py-0.5 text-[12.5px] font-semibold text-[var(--color-ink)]">
      <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: color }} />
      {text}
    </p>
  );
}
