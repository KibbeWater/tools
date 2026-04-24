import { motion } from 'framer-motion';
import { ArrowRight, Cpu, Lock, Zap } from 'lucide-react';
import { tools } from '@/tools/registry';
import { ToolCard } from '@/components/ToolCard';

export default function Home() {
  return (
    <div className="mx-auto max-w-[1120px] px-4 sm:px-6">
      <Hero />
      <Tools />
      <Pillars />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative pt-20 pb-24 sm:pt-28 sm:pb-32">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.2, 0, 0, 1] }}
        className="max-w-[760px]"
      >
        <div className="inline-flex items-center gap-2 mb-7 pl-1.5 pr-3 py-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/60 backdrop-blur-sm">
          <span className="relative inline-flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--color-accent-amber)] opacity-75 animate-ping" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--color-accent-amber)]" />
          </span>
          <span className="text-[10.5px] font-mono uppercase tracking-[0.14em] text-[var(--color-fg-muted)]">
            v0.1 · {tools.length} tool{tools.length === 1 ? '' : 's'} live
          </span>
        </div>

        <h1 className="text-[44px] sm:text-[68px] leading-[0.96] font-semibold tracking-[-0.035em] text-[var(--color-fg)]">
          Small, fast tools <br className="hidden sm:block" />
          that{' '}
          <span className="text-gradient-warm italic font-[550]">do one thing</span>
          <span className="text-[var(--color-fg-subtle)]">.</span>
        </h1>

        <p className="mt-6 text-[16px] sm:text-[17px] text-[var(--color-fg-muted)] leading-relaxed max-w-[600px]">
          A quiet collection of browser-native utilities. Everything runs locally —
          your files never leave the page. WASM modules load on demand and cache
          for offline use.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <a
            href="#tools"
            className="group inline-flex items-center gap-2 h-10 px-4 rounded-full bg-[var(--color-fg)] text-[var(--color-bg)] text-[13px] font-semibold hover:bg-white transition-colors"
          >
            Browse tools
            <ArrowRight
              size={14}
              className="group-hover:translate-x-0.5 transition-transform"
            />
          </a>
          <a
            href="https://github.com/KibbeWater/tools"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 h-10 px-4 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/60 text-[13px] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:border-[var(--color-border-hi)] hover:bg-[var(--color-surface-hi)] transition-colors"
          >
            View source
          </a>
          <span className="text-[12px] text-[var(--color-fg-subtle)] ml-1">
            Press{' '}
            <kbd className="font-mono text-[10.5px] px-1.5 py-0.5 rounded border border-[var(--color-border)] bg-[var(--color-bg-raised)] text-[var(--color-fg-muted)]">
              ⌘K
            </kbd>{' '}
            to jump
          </span>
        </div>
      </motion.div>

      <DecorativeMark />
    </section>
  );
}

function DecorativeMark() {
  // Big abstract shape parked behind the hero copy on wide screens.
  return (
    <div
      aria-hidden
      className="hidden lg:block absolute top-16 right-0 w-[340px] h-[340px] pointer-events-none"
    >
      <div className="absolute inset-0 rounded-full opacity-40 blur-3xl"
        style={{
          background:
            'radial-gradient(circle at 30% 30%, var(--color-accent-orange), transparent 60%), radial-gradient(circle at 70% 70%, var(--color-accent-violet), transparent 60%)',
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="h-44 w-44 rounded-[40px] border border-[var(--color-border-hi)] rotate-12"
          style={{
            background:
              'linear-gradient(135deg, oklch(0.22 0.014 60 / 0.6), oklch(0.16 0.012 60 / 0.2))',
            backdropFilter: 'blur(4px)',
            boxShadow: 'inset 0 1px 0 oklch(1 0 0 / 0.06)',
          }}
        />
        <div
          className="absolute h-32 w-32 rounded-[28px] -rotate-6"
          style={{
            background:
              'conic-gradient(from 200deg, var(--color-accent-amber), var(--color-accent-orange), var(--color-accent-pink), var(--color-accent-violet), var(--color-accent-cyan), var(--color-accent-amber))',
            opacity: 0.85,
            filter: 'saturate(1.1)',
          }}
        />
      </div>
    </div>
  );
}

function Tools() {
  return (
    <section id="tools" aria-labelledby="tools-heading" className="pb-8 scroll-mt-20">
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <div className="text-[10.5px] uppercase tracking-[0.14em] font-mono text-[var(--color-accent-amber)] mb-2">
            // tools
          </div>
          <h2 id="tools-heading" className="text-[24px] font-semibold tracking-[-0.015em]">
            What's in the box
          </h2>
        </div>
        <div className="hidden sm:block text-[12px] text-[var(--color-fg-subtle)] pb-1">
          {tools.length} tool{tools.length === 1 ? '' : 's'} · all browser-only
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tools.map((t, i) => (
          <ToolCard key={t.id} tool={t} index={i} />
        ))}
      </div>
    </section>
  );
}

function Pillars() {
  const items = [
    {
      icon: Lock,
      title: 'Stays on your machine',
      body: 'No uploads, no accounts, no telemetry. The tab is the whole product.',
      accent: 'var(--color-accent-amber)',
    },
    {
      icon: Zap,
      title: 'Loads instantly',
      body: 'A lean static bundle. WASM modules are split per-tool and cached after first use.',
      accent: 'var(--color-accent-cyan)',
    },
    {
      icon: Cpu,
      title: 'Native-grade speed',
      body: 'Hot paths are written in Rust and compiled to WebAssembly when it matters.',
      accent: 'var(--color-accent-violet)',
    },
  ];
  return (
    <section className="pt-16 pb-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
      {items.map((it) => (
        <div
          key={it.title}
          className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-5"
        >
          <div
            className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] mb-3"
            style={{
              background: `color-mix(in oklch, ${it.accent} 16%, transparent)`,
              color: it.accent,
              border: `1px solid color-mix(in oklch, ${it.accent} 28%, transparent)`,
            }}
          >
            <it.icon size={15} />
          </div>
          <h3 className="text-[14px] font-semibold mb-1.5">{it.title}</h3>
          <p className="text-[12.5px] text-[var(--color-fg-muted)] leading-relaxed">
            {it.body}
          </p>
        </div>
      ))}
    </section>
  );
}
