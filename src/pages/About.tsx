export default function About() {
  return (
    <div className="mx-auto max-w-[680px] px-4 py-16 sm:py-24 space-y-8">
      <h1 className="text-[28px] font-semibold tracking-[-0.01em]">About</h1>
      <div className="space-y-4 text-[14.5px] text-[var(--color-fg-muted)] leading-relaxed">
        <p>
          <span className="text-[var(--color-fg)] font-medium">mellow llama</span> is a
          static site hosting small browser-based tools. Everything runs locally; nothing
          is uploaded.
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
            className="underline decoration-[var(--color-fg-subtle)] underline-offset-2 hover:text-[var(--color-fg)] transition-colors"
            href="https://github.com/KibbeWater/tools"
            target="_blank"
            rel="noreferrer"
          >
            open source
          </a>
          . Hit <span className="font-mono text-[var(--color-fg)]">?</span> anywhere for
          the keyboard shortcuts.
        </p>
      </div>
    </div>
  );
}
