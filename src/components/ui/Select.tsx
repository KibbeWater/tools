import { forwardRef, type SelectHTMLAttributes } from 'react';
import { faChevronDown } from '@fortawesome/free-solid-svg-icons/faChevronDown';
import { cn } from '@/lib/cn';
import { fieldClass } from './Input';
import { Icon } from './Icon';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, options, ...rest },
  ref,
) {
  return (
    <div className="relative">
      <select ref={ref} className={cn(fieldClass, 'appearance-none pr-8', className)} {...rest}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <Icon
        icon={faChevronDown}
        size={11}
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-fg-subtle)]"
      />
    </div>
  );
});
