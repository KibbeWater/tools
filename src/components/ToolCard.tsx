import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { faArrowRight } from '@fortawesome/free-solid-svg-icons/faArrowRight';
import { Icon } from '@/components/ui/Icon';
import { ToolIcon, toolIconDef } from '@/components/ToolIcon';
import { FloatingNotes } from '@/components/FloatingNotes';
import { accentVar, type ToolMeta } from '@/tools/registry';

interface ToolCardProps {
  tool: ToolMeta;
  index: number;
}

const statusLabel: Record<ToolMeta['status'], string> = {
  stable: 'Stable',
  beta: 'Beta',
  wip: 'In progress',
};

/** A solid, accent-filled card. Shares a view-transition name with the tool page header. */
export function ToolCard({ tool, index }: ToolCardProps) {
  return (
    <motion.li
      initial={{ y: 12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.1 + index * 0.06, duration: 0.32, ease: [0.2, 0, 0, 1] }}
      // The hover target is this stationary <li>, not the card that moves. Hovering
      // the moving card made it slide out from under the cursor and jitter.
      className="group"
      style={{ '--color-accent': accentVar(tool.accent) } as CSSProperties}
    >
      <Link
        to={tool.path}
        viewTransition
        style={{ viewTransitionName: `tool-card-${tool.id}` }}
        className="relative flex h-full min-h-[240px] flex-col overflow-hidden rounded-[24px] border-2 border-[var(--color-ink)] bg-[var(--color-accent)] p-6 text-[var(--color-ink)] shadow-[5px_5px_0_var(--color-ink)] transition-[translate,box-shadow] duration-200 ease-out group-hover:-translate-x-1 group-hover:-translate-y-1 group-hover:shadow-[9px_9px_0_var(--color-ink)] group-active:translate-x-0 group-active:translate-y-0 group-active:shadow-[2px_2px_0_var(--color-ink)]"
      >
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-2 rounded-full bg-[var(--color-bg-raised)] border-2 border-[var(--color-ink)] px-2.5 py-0.5 text-[12px] font-semibold text-[var(--color-ink)]">
            <ToolIcon name={tool.iconName} size={11} />
            {statusLabel[tool.status]}
          </span>
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-[var(--color-ink)] bg-[var(--color-bg-raised)] transition-transform duration-200 group-hover:-rotate-45">
            <Icon icon={faArrowRight} size={13} />
          </span>
        </div>

        <FloatingNotes
          icons={[toolIconDef(tool.iconName)]}
          className="right-6 bottom-36 h-0 w-[110px] text-[var(--color-ink)]"
        />
        {tool.image && (
          <img
            src={tool.image.src}
            alt=""
            width={140}
            height={140}
            className="pixelated pointer-events-none absolute -right-3 bottom-10 w-[120px] sm:w-[140px] rotate-6 transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-110"
          />
        )}

        <div className="mt-auto pt-10 pr-24 sm:pr-28">
          <h3 className="font-display text-[26px] font-semibold leading-[1.1]">
            {tool.name}
          </h3>
          <p className="mt-2 text-[14px] leading-relaxed text-[color-mix(in_oklch,var(--color-ink)_78%,transparent)]">
            {tool.tagline}
          </p>
        </div>
      </Link>
    </motion.li>
  );
}
