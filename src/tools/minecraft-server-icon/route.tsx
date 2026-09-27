import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { IconEditor } from './components/IconEditor';
import { useServerIconWasm } from './hooks/useServerIconWasm';
import { faImage } from '@fortawesome/free-solid-svg-icons/faImage';
import { faServer } from '@fortawesome/free-solid-svg-icons/faServer';
import { FloatingNotes } from '@/components/FloatingNotes';
import { accentVar, toolById } from '@/tools/registry';

const tool = toolById('minecraft-server-icon')!;

export default function McServerIconRoute() {
  const wasm = useServerIconWasm();

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
            Give your server its own picture in the Multiplayer list. Drop in any image, frame it,
            and download a 64×64 <code className="font-mono text-[14px]">server-icon.png</code> that
            Minecraft accepts. Your image never leaves this browser.
          </p>
          <WasmStatus state={wasm} />
        </div>
        <div className="hidden sm:block absolute right-6 lg:right-12 top-1/2 -translate-y-1/2 w-[160px] lg:w-[200px]">
          <FloatingNotes
            mode="always"
            icons={[faServer, faImage]}
            size={20}
            className="left-[20%] right-[20%] top-[38%] h-0 text-[var(--color-ink)]"
          />
          <img
            src={`${import.meta.env.BASE_URL}images/minecraft/server-icon.png`}
            alt=""
            width={200}
            height={200}
            className="pixelated w-full rotate-6 rounded-[4px] outline outline-2 outline-[var(--color-ink)] motion-safe:animate-[float-idle_5s_ease-in-out_infinite]"
          />
        </div>
      </header>

      <IconEditor />

      <p className="mt-12 text-[12.5px] text-[var(--color-fg-subtle)] max-w-[70ch]">
        The default server icon is a Minecraft asset, via the{' '}
        <a href="https://minecraft.wiki" target="_blank" rel="noreferrer" className="link">
          Minecraft Wiki
        </a>
        . Minecraft is a trademark of Mojang; this tool isn't affiliated with Mojang or
        Microsoft.
      </p>
    </div>
  );
}

function WasmStatus({ state }: { state: ReturnType<typeof useServerIconWasm> }) {
  const { color, text } =
    state.status === 'ready'
      ? { color: 'var(--color-success)', text: 'Icon maker loaded' }
      : state.status === 'error'
        ? { color: 'var(--color-danger)', text: 'Icon maker failed to load' }
        : { color: 'var(--color-accent-deep)', text: 'Loading icon maker…' };
  return (
    <p className="mt-5 inline-flex items-center gap-2 rounded-full border-2 border-[var(--color-ink)] bg-[var(--color-bg-raised)] px-3 py-0.5 text-[12.5px] font-semibold text-[var(--color-ink)]">
      <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: color }} />
      {text}
    </p>
  );
}
