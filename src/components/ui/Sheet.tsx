import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { faXmark } from '@fortawesome/free-solid-svg-icons/faXmark';
import { cn } from '@/lib/cn';
import { Icon } from './Icon';
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
  // The portal escapes the tool page's subtree, so carry its accent across by hand.
  const anchorRef = useRef<HTMLSpanElement>(null);
  const [accent, setAccent] = useState<string>();
  useEffect(() => {
    if (open && anchorRef.current) {
      setAccent(
        getComputedStyle(anchorRef.current).getPropertyValue('--color-accent').trim() || undefined,
      );
    }
  }, [open]);

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

  // Portalled so ancestors with their own stacking context (view-transition-name,
  // transforms) can't trap the sheet underneath the sticky header.
  return (
    <>
      <span ref={anchorRef} hidden />
      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              key="sheet-root"
              className="fixed inset-0"
              style={
                {
                  zIndex: 'var(--z-sheet)',
                  ...(accent ? { '--color-accent': accent } : {}),
                } as CSSProperties
              }
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduced ? 0 : 0.2 }}
            >
              <div
                onClick={onClose}
                className="absolute inset-0 bg-[var(--color-overlay)]"
                aria-hidden
              />
              <motion.aside
                role="dialog"
                aria-modal
                initial={{ x: reduced ? 0 : 40, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: reduced ? 0 : 40, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 460, damping: 42, mass: 0.85 }}
                className={cn(
                  'absolute top-0 right-0 h-full flex flex-col bg-[var(--color-bg)] border-l-2 border-[var(--color-ink)] rounded-l-[24px]',
                  widthClass,
                )}
                style={{ viewTransitionName: 'sheet' }}
              >
                <header className="flex items-start justify-between gap-4 px-5 pt-5 pb-4 border-b border-[var(--color-border)]">
                  <div className="min-w-0 flex-1">
                    {title && (
                      <h2 className="text-[16px] font-semibold text-[var(--color-fg)] leading-snug">
                        {title}
                      </h2>
                    )}
                    {description && (
                      <p className="text-[13px] text-[var(--color-fg-muted)] mt-1 leading-relaxed">
                        {description}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="-mr-1.5 h-8 w-8 inline-flex items-center justify-center rounded-full text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-surface)] transition-colors"
                    aria-label="Close"
                  >
                    <Icon icon={faXmark} size={16} />
                  </button>
                </header>
                <div className="flex-1 overflow-y-auto p-5">{children}</div>
                {footer && (
                  <footer className="px-5 py-3 border-t border-[var(--color-border)] flex items-center justify-end gap-2">
                    {footer}
                  </footer>
                )}
              </motion.aside>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}
