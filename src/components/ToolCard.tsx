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
      initial={{ y: 8, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: index * 0.04, duration: 0.28, ease: [0.2, 0, 0, 1] }}
      style={{ viewTransitionName: `tool-card-${tool.id}` }}
    >
      <Link
        to={tool.path}
        viewTransition
        className="group block rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 hover:border-[var(--color-border-hi)] hover:bg-[var(--color-surface-hi)] transition-[background-color,border-color,transform] active:scale-[0.995]"
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div
            className="h-9 w-9 rounded-[var(--radius-sm)] border border-[var(--color-border)] flex items-center justify-center"
            style={{
              background: `color-mix(in oklch, ${accent} 14%, transparent)`,
              color: accent,
              borderColor: `color-mix(in oklch, ${accent} 28%, transparent)`,
            }}
          >
            <ToolIcon name={tool.iconName} size={17} />
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={tool.status} />
            <ArrowUpRight
              size={14}
              className="text-[var(--color-fg-subtle)] group-hover:text-[var(--color-fg-muted)] group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform"
            />
          </div>
        </div>
        <h3 className="text-[14.5px] font-semibold text-[var(--color-fg)] mb-1 leading-snug">
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
  const copy = { stable: 'Stable', beta: 'Beta', wip: 'WIP' }[status];
  const color =
    status === 'stable'
      ? 'text-[oklch(0.78_0.14_150)]'
      : status === 'beta'
        ? 'text-[oklch(0.78_0.14_75)]'
        : 'text-[var(--color-fg-subtle)]';
  return (
    <span
      className={`text-[9.5px] font-semibold uppercase tracking-[0.08em] ${color} border border-[var(--color-border)] rounded-[3px] px-1.5 py-[1px]`}
    >
      {copy}
    </span>
  );
}
