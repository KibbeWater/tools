import { Lock, Sparkles, Zap } from 'lucide-react';

export default function About() {
  return (
    <div className="mx-auto max-w-[760px] px-4 sm:px-6 pt-20 pb-12">
      <div className="text-[10.5px] uppercase tracking-[0.14em] font-mono text-[var(--color-accent-amber)] mb-3">
        // about
      </div>
      <h1 className="text-[40px] sm:text-[52px] leading-[0.98] font-semibold tracking-[-0.03em] mb-8">
        A quiet collection <br />
        of <span className="text-gradient-warm italic font-[550]">browser-only</span>{' '}
        tools.
      </h1>

      <div className="space-y-5 text-[15px] text-[var(--color-fg-muted)] leading-relaxed">
        <p>
          <span className="text-[var(--color-fg)] font-medium">mellow llama</span> is a
          static site hosting small browser-based tools. Everything runs locally;
          nothing is uploaded.
        </p>
        <p>
          Where it makes sense, tools are accelerated by small{' '}
          <span className="text-[var(--color-fg)]">WebAssembly</span> modules written in
          Rust. These are fetched on demand the first time you open a tool and then
          cached by your browser for offline use.
        </p>
        <p>
          The site is fully static, hosted on GitHub Pages, and{' '}
          <a
            className="underline decoration-[var(--color-fg-subtle)] underline-offset-2 hover:text-[var(--color-fg)] hover:decoration-[var(--color-accent-amber)] transition-colors"
            href="https://github.com/KibbeWater/tools"
            target="_blank"
            rel="noreferrer"
          >
            open source
          </a>
          . Hit{' '}
          <kbd className="font-mono text-[11px] px-1.5 py-0.5 rounded border border-[var(--color-border)] bg-[var(--color-bg-raised)] text-[var(--color-fg)]">
            ?
          </kbd>{' '}
          anywhere for the keyboard shortcuts.
        </p>
      </div>

      <div className="divider-grad my-12" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Stat icon={Lock} label="Privacy" value="Local-only" />
        <Stat icon={Zap} label="Loads" value="Static + WASM" />
        <Stat icon={Sparkles} label="Cost" value="Free, forever" />
      </div>

      <div className="mt-12 p-5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]/60">
        <div className="flex items-center gap-2 text-[12px] text-[var(--color-fg-muted)]">
          <GithubMark size={13} />
          <span>Issues, PRs, ideas — all welcome.</span>
          <a
            href="https://github.com/KibbeWater/tools"
            target="_blank"
            rel="noreferrer"
            className="ml-auto underline decoration-[var(--color-fg-subtle)] underline-offset-2 hover:text-[var(--color-fg)] hover:decoration-[var(--color-accent-amber)] transition-colors"
          >
            github.com/KibbeWater/tools
          </a>
        </div>
      </div>
    </div>
  );
}

function GithubMark({ size = 14 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 .5C5.65.5.5 5.65.5 12.02c0 5.1 3.29 9.42 7.86 10.95.58.11.79-.25.79-.56v-2c-3.2.7-3.87-1.36-3.87-1.36-.52-1.34-1.27-1.7-1.27-1.7-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.76 2.69 1.25 3.34.96.1-.74.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.16 1.18a10.94 10.94 0 0 1 5.76 0c2.2-1.49 3.16-1.18 3.16-1.18.62 1.58.23 2.75.11 3.04.74.81 1.18 1.84 1.18 3.1 0 4.43-2.7 5.41-5.27 5.69.41.36.78 1.06.78 2.14v3.18c0 .31.21.68.8.56A11.5 11.5 0 0 0 23.5 12.02C23.5 5.65 18.35.5 12 .5z" />
    </svg>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-4">
      <div className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.1em] text-[var(--color-fg-subtle)] mb-1.5">
        <Icon size={12} />
        {label}
      </div>
      <div className="text-[16px] font-semibold tracking-[-0.005em]">{value}</div>
    </div>
  );
}
