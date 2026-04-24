import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

const baseField =
  'w-full h-9 px-3 text-[13px] rounded-[var(--radius-sm)] bg-[var(--color-bg-raised)] ' +
  'border border-[var(--color-border)] text-[var(--color-fg)] placeholder:text-[var(--color-fg-subtle)] ' +
  'transition-colors focus:border-[var(--color-accent-amber)] focus:outline-none ' +
  'focus:ring-2 focus:ring-[color-mix(in_oklch,var(--color-accent-amber)_30%,transparent)]';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return <input ref={ref} className={cn(baseField, className)} {...rest} />;
  },
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, rows = 3, ...rest }, ref) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(baseField, 'h-auto py-2 resize-y min-h-[64px] leading-relaxed', className)}
      {...rest}
    />
  );
});

interface FieldProps {
  label: string;
  hint?: string;
  children: React.ReactNode;
  htmlFor?: string;
}

export function Field({ label, hint, children, htmlFor }: FieldProps) {
  return (
    <label htmlFor={htmlFor} className="block space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10.5px] font-semibold text-[var(--color-fg-muted)] uppercase tracking-[0.08em]">
          {label}
        </span>
        {hint && (
          <span className="text-[11px] text-[var(--color-fg-subtle)] font-mono">
            {hint}
          </span>
        )}
      </div>
      {children}
    </label>
  );
}
