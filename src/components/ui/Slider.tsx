import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  showValue?: boolean;
  formatValue?: (v: number) => string;
}

export const Slider = forwardRef<HTMLInputElement, SliderProps>(function Slider(
  { className, showValue, formatValue, value, ...rest },
  ref,
) {
  const n = typeof value === 'number' ? value : Number(value);
  return (
    <div className="flex items-center gap-3 h-9">
      <input
        ref={ref}
        type="range"
        value={value}
        className={cn('flex-1 min-w-0 cursor-pointer accent-[var(--color-accent-deep)]', className)}
        {...rest}
      />
      {showValue && (
        <span className="text-[12px] text-[var(--color-fg-muted)] w-9 text-right tabular-nums">
          {formatValue ? formatValue(n) : n}
        </span>
      )}
    </div>
  );
});
