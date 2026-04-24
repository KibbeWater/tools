import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

const baseField =
  'w-full h-8 px-2.5 text-[13px] rounded-[var(--radius-sm)] bg-[var(--color-bg-raised)] ' +
  'border border-[var(--color-border)] text-[var(--color-fg)] placeholder:text-[var(--color-fg-subtle)] ' +
  'transition-colors focus:border-[var(--color-border-hi)] focus:outline-none';

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
      className={cn(baseField, 'h-auto py-2 resize-y min-h-[56px]', className)}
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
        <span className="text-[11.5px] font-medium text-[var(--color-fg-muted)] uppercase tracking-[0.04em]">
          {label}
        </span>
        {hint && <span className="text-[11px] text-[var(--color-fg-subtle)]">{hint}</span>}
      </div>
      {children}
    </label>
  );
}
