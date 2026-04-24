import { type ReactNode, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  widthClass?: string;
}

export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  widthClass = 'w-[min(460px,100vw)]',
}: SheetProps) {
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="sheet-root"
          className="fixed inset-0"
          style={{ zIndex: 'var(--z-sheet)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0 : 0.2 }}
        >
          <div
            onClick={onClose}
            className="absolute inset-0 bg-[oklch(0.08_0.01_60_/_0.7)] backdrop-blur-[3px]"
            aria-hidden
          />
          <motion.aside
            role="dialog"
            aria-modal
            initial={{ x: reduced ? 0 : 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: reduced ? 0 : 40, opacity: 0 }}
            transition={{
              type: 'spring',
              stiffness: 460,
              damping: 42,
              mass: 0.85,
            }}
            className={cn(
              'absolute top-0 right-0 h-full bg-[var(--color-bg-raised)] border-l border-[var(--color-border)] flex flex-col',
              'shadow-[-24px_0_64px_-24px_oklch(0_0_0_/_0.6)]',
              widthClass,
            )}
            style={{ viewTransitionName: 'sheet' }}
          >
            {/* Top accent hairline */}
            <span
              aria-hidden
              className="absolute inset-x-0 top-0 h-px"
              style={{
                background:
                  'linear-gradient(90deg, transparent, var(--color-accent-amber), transparent)',
                opacity: 0.5,
              }}
            />
            <header className="flex items-start justify-between gap-4 p-5 border-b border-[var(--color-border)]">
              <div className="min-w-0 flex-1">
                {title && (
                  <h2 className="text-[15.5px] font-semibold text-[var(--color-fg)] leading-tight tracking-[-0.005em]">
                    {title}
                  </h2>
                )}
                {description && (
                  <p className="text-[12.5px] text-[var(--color-fg-muted)] mt-1.5 leading-relaxed">
                    {description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="h-8 w-8 inline-flex items-center justify-center rounded-full text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-surface)] transition-colors"
                aria-label="Close"
              >
                <X size={15} />
              </button>
            </header>
            <div className="flex-1 overflow-y-auto p-5">{children}</div>
            {footer && (
              <footer className="p-3.5 border-t border-[var(--color-border)] flex items-center justify-end gap-2 bg-[var(--color-bg)]/60">
                {footer}
              </footer>
            )}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
