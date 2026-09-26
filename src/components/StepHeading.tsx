import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface StepHeadingProps {
  step: number;
  id?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}

export function StepHeading({ step, id, title, description, actions }: StepHeadingProps) {
  return (
    <div className="flex items-end justify-between gap-4 flex-wrap">
      <div className="max-w-[560px]">
        <h2 id={id} className="flex items-center gap-3 font-display text-[25px] font-semibold">
          <motion.span
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 18, delay: 0.1 + step * 0.08 }}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-[var(--color-ink)] bg-[var(--color-accent)] font-sans text-[13px] font-bold text-[var(--color-accent-fg)] tabular-nums"
          >
            {step}
          </motion.span>
          {title}
        </h2>
        {description && (
          <p className="text-[14px] text-[var(--color-fg-muted)] mt-1.5 sm:pl-11 leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-3 flex-wrap">{actions}</div>}
    </div>
  );
}
