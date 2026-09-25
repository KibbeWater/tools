import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-[1040px] px-4 sm:px-6 pt-16 sm:pt-24">
      <p className="text-[13px] text-[var(--color-fg-subtle)] tabular-nums mb-3">404</p>
      <h1 className="font-display text-[40px] sm:text-[52px] leading-[1.05] font-medium tracking-[-0.02em] mb-4">
        Nothing lives here.
      </h1>
      <p className="text-[16px] text-[var(--color-fg-muted)] mb-8 max-w-[52ch]">
        The address may be mistyped, or the tool may have moved.
      </p>
      <Link to="/" viewTransition className="link text-[15px]">
        Back to the tool list
      </Link>
    </div>
  );
}
