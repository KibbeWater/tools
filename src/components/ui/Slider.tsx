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
    <div className="flex items-center gap-3">
      <input
        ref={ref}
        type="range"
        value={value}
        className={cn(
          'flex-1 appearance-none h-1.5 rounded-full bg-[var(--color-border)]',
          'accent-[var(--color-fg)]',
          '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5',
          '[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--color-fg)]',
          '[&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-[var(--color-bg)]',
          '[&::-webkit-slider-thumb]:shadow-sm',
          '[&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:rounded-full',
          '[&::-moz-range-thumb]:bg-[var(--color-fg)] [&::-moz-range-thumb]:border-0',
          className,
        )}
        {...rest}
      />
      {showValue && (
        <span className="font-mono text-[11.5px] text-[var(--color-fg-muted)] w-10 text-right tabular-nums">
          {formatValue ? formatValue(n) : n}
        </span>
      )}
    </div>
  );
});
