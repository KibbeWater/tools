import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-[560px] px-4 py-24 text-center space-y-4">
      <p className="font-mono text-[12px] text-[var(--color-fg-subtle)] uppercase tracking-[0.1em]">
        404
      </p>
      <h1 className="text-[28px] font-semibold tracking-[-0.01em]">That page moved — or never existed.</h1>
      <p className="text-[14px] text-[var(--color-fg-muted)]">
        <Link
          to="/"
          viewTransition
          className="underline decoration-[var(--color-fg-subtle)] underline-offset-2 hover:text-[var(--color-fg)]"
        >
          Back to home
        </Link>
      </p>
    </div>
  );
}
