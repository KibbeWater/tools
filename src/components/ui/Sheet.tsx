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
  widthClass = 'w-[min(440px,100vw)]',
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
          className="fixed inset-0 z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0 : 0.18 }}
        >
          <div
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            aria-hidden
          />
          <motion.aside
            role="dialog"
            aria-modal
            initial={{ x: reduced ? 0 : 32, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: reduced ? 0 : 32, opacity: 0 }}
            transition={{
              type: 'spring',
              stiffness: 480,
              damping: 42,
              mass: 0.8,
            }}
            className={cn(
              'absolute top-0 right-0 h-full bg-[var(--color-bg-raised)] border-l border-[var(--color-border)] shadow-2xl flex flex-col',
              widthClass,
            )}
            style={{ viewTransitionName: 'sheet' }}
          >
            <header className="flex items-start justify-between gap-4 p-4 border-b border-[var(--color-border)]">
              <div className="min-w-0 flex-1">
                {title && (
                  <h2 className="text-[15px] font-semibold text-[var(--color-fg)] leading-tight truncate">
                    {title}
                  </h2>
                )}
                {description && (
                  <p className="text-[12px] text-[var(--color-fg-muted)] mt-1">{description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 -m-1.5 rounded-[var(--radius-sm)] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-surface)]"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </header>
            <div className="flex-1 overflow-y-auto p-4">{children}</div>
            {footer && (
              <footer className="p-3 border-t border-[var(--color-border)] flex items-center justify-end gap-2 bg-[var(--color-bg)]">
                {footer}
              </footer>
            )}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
