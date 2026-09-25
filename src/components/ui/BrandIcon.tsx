import { cn } from '@/lib/cn';

interface BrandIconProps {
  /** A `thesvg` icon module, e.g. `import github from 'thesvg/github'`. */
  icon: { title: string; svg: string; variants?: Record<string, string> };
  size?: number;
  className?: string;
}

/** Renders a brand mark from `thesvg` in the current text color (mono variant). */
export function BrandIcon({ icon, size = 16, className }: BrandIconProps) {
  const markup = icon.variants?.mono ?? icon.svg;
  return (
    <span
      aria-hidden
      className={cn('inline-flex shrink-0 [&>svg]:h-full [&>svg]:w-full [&>svg]:fill-current', className)}
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}
