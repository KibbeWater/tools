import { motion } from 'framer-motion';
import { tools } from '@/tools/registry';
import { ToolCard } from '@/components/ToolCard';

export default function Home() {
  return (
    <div className="mx-auto max-w-[1080px] px-4 py-16 sm:py-24">
      <motion.header
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.36, ease: [0.2, 0, 0, 1] }}
        className="max-w-[640px] mb-14 sm:mb-20"
      >
        <span className="inline-block text-[10.5px] uppercase tracking-[0.12em] text-[var(--color-fg-subtle)] mb-4">
          A quiet collection · v0.1
        </span>
        <h1 className="text-[32px] sm:text-[44px] leading-[1.05] font-semibold tracking-[-0.02em] text-[var(--color-fg)] mb-4">
          Small, fast tools that do one thing well.
        </h1>
        <p className="text-[14.5px] text-[var(--color-fg-muted)] leading-relaxed max-w-[540px]">
          Everything here runs in your browser — no accounts, no uploads to a server. Optional WASM modules
          load on demand and cache for offline use.
        </p>
      </motion.header>

      <section aria-labelledby="tools-heading">
        <h2
          id="tools-heading"
          className="text-[10.5px] uppercase tracking-[0.08em] font-semibold text-[var(--color-fg-subtle)] mb-4"
        >
          Tools
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {tools.map((t, i) => (
            <ToolCard key={t.id} tool={t} index={i} />
          ))}
        </div>
      </section>
    </div>
  );
}
