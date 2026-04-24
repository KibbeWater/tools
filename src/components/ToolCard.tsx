import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { ToolIcon } from './ToolIcon';
import type { ToolMeta } from '@/tools/registry';

interface ToolCardProps {
  tool: ToolMeta;
  index: number;
}

export function ToolCard({ tool, index }: ToolCardProps) {
  const accent = `var(--color-accent-${tool.accent})`;
  return (
    <motion.div
      initial={{ y: 12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: index * 0.06, duration: 0.32, ease: [0.2, 0, 0, 1] }}
      style={{ viewTransitionName: `tool-card-${tool.id}` }}
      className="group relative"
    >
      <div
        aria-hidden
        className="absolute -inset-px rounded-[var(--radius-md)] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          background: `radial-gradient(60% 80% at 30% 0%, ${accent}, transparent 70%)`,
          filter: 'blur(18px)',
          opacity: 0,
        }}
      />
      <Link
        to={tool.path}
        viewTransition
        className="relative block h-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 overflow-hidden transition-all duration-200 hover:border-[var(--color-border-hi)] hover:bg-[var(--color-surface-hi)] hover:-translate-y-0.5 active:translate-y-0"
      >
        {/* Shine sweep on hover */}
        <span
          aria-hidden
          className="pointer-events-none absolute -inset-px opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            background: `linear-gradient(115deg, transparent 35%, ${accent} 50%, transparent 65%)`,
            mixBlendMode: 'overlay',
            opacity: 0,
            maskImage:
              'linear-gradient(to bottom, black, transparent 70%)',
          }}
        />
        {/* Top gradient hairline */}
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-px"
          style={{
            background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
            opacity: 0.5,
          }}
        />

        <div className="flex items-start justify-between gap-3 mb-5">
          <div className="relative">
            <span
              aria-hidden
              className="absolute inset-0 rounded-[var(--radius-sm)] blur-md opacity-50 group-hover:opacity-90 transition-opacity"
              style={{ background: accent }}
            />
            <div
              className="relative h-11 w-11 rounded-[var(--radius-sm)] flex items-center justify-center"
              style={{
                background: `color-mix(in oklch, ${accent} 22%, var(--color-bg))`,
                color: accent,
                border: `1px solid color-mix(in oklch, ${accent} 38%, transparent)`,
              }}
            >
              <ToolIcon name={tool.iconName} size={20} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={tool.status} />
            <span
              className="h-7 w-7 rounded-full flex items-center justify-center border border-[var(--color-border)] bg-[var(--color-bg-raised)] text-[var(--color-fg-subtle)] group-hover:text-[var(--color-fg)] group-hover:border-[var(--color-border-hi)] transition-colors"
            >
              <ArrowUpRight
                size={13}
                className="group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform"
              />
            </span>
          </div>
        </div>

        <h3 className="text-[16px] font-semibold text-[var(--color-fg)] leading-tight tracking-[-0.005em] mb-1.5">
          {tool.name}
        </h3>
        <p className="text-[12.5px] text-[var(--color-fg-muted)] leading-relaxed">
          {tool.tagline}
        </p>
      </Link>
    </motion.div>
  );
}

function StatusBadge({ status }: { status: ToolMeta['status'] }) {
  const map = {
    stable: {
      label: 'Stable',
      color: 'var(--color-success)',
    },
    beta: {
      label: 'Beta',
      color: 'var(--color-accent-amber)',
    },
    wip: {
      label: 'WIP',
      color: 'var(--color-fg-subtle)',
    },
  } as const;
  const { label, color } = map[status];
  return (
    <span
      className="inline-flex items-center gap-1 text-[9.5px] font-semibold uppercase tracking-[0.1em] px-1.5 py-[3px] rounded-full"
      style={{
        background: `color-mix(in oklch, ${color} 14%, transparent)`,
        color,
        border: `1px solid color-mix(in oklch, ${color} 24%, transparent)`,
      }}
    >
      <span
        className="inline-block h-1 w-1 rounded-full"
        style={{ background: color }}
      />
      {label}
    </span>
  );
}
