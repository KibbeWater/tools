import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-[640px] px-4 sm:px-6 pt-32 pb-24 text-center">
      <div
        aria-hidden
        className="mx-auto mb-8 h-20 w-20 rounded-[var(--radius-lg)] flex items-center justify-center text-[44px] font-semibold tracking-[-0.04em] text-gradient-warm relative"
      >
        <span className="absolute inset-0 rounded-[var(--radius-lg)] blur-2xl opacity-50"
          style={{
            background:
              'conic-gradient(from 200deg, var(--color-accent-amber), var(--color-accent-pink), var(--color-accent-violet), var(--color-accent-amber))',
          }}
        />
        <span className="relative">4·4</span>
      </div>
      <p className="font-mono text-[10.5px] text-[var(--color-fg-subtle)] uppercase tracking-[0.14em] mb-3">
        not found
      </p>
      <h1 className="text-[28px] sm:text-[36px] font-semibold tracking-[-0.025em] leading-tight mb-3">
        That page moved — <br className="sm:hidden" />or never existed.
      </h1>
      <p className="text-[14px] text-[var(--color-fg-muted)] mb-8">
        Maybe you mistyped the URL. Maybe the tool got merged into another. Either
        way, home is one click away.
      </p>
      <Link
        to="/"
        viewTransition
        className="group inline-flex items-center gap-2 h-10 px-4 rounded-full bg-[var(--color-fg)] text-[var(--color-bg)] text-[13px] font-semibold hover:bg-white transition-colors"
      >
        <ArrowLeft
          size={14}
          className="group-hover:-translate-x-0.5 transition-transform"
        />
        Back to home
      </Link>
    </div>
  );
}
