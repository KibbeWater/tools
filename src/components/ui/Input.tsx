import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export const fieldClass =
  'w-full h-10 px-3 text-[13.5px] rounded-[12px] bg-[var(--color-bg-raised)] ' +
  'border border-[var(--color-border-hi)] text-[var(--color-fg)] placeholder:text-[var(--color-fg-subtle)] ' +
  'transition-colors focus:outline-none focus:border-[var(--color-accent-deep)] ' +
  'focus:shadow-[0_0_0_3px_var(--color-accent-soft)]';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return <input ref={ref} className={cn(fieldClass, className)} {...rest} />;
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
      className={cn(fieldClass, 'h-auto py-2 resize-y min-h-[64px] leading-relaxed', className)}
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
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[13px] font-medium text-[var(--color-fg)]">{label}</span>
        {hint && (
          <span className="text-[12px] text-[var(--color-fg-subtle)] tabular-nums">{hint}</span>
        )}
      </div>
      {children}
    </label>
  );
}
