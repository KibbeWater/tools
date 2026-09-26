import { Kbd } from '@/components/ui/Kbd';
import { REPO_URL } from '@/lib/site';
import { BrandIcon } from '@/components/ui/BrandIcon';
import github from 'thesvg/github';

export default function About() {
  return (
    <div className="mx-auto max-w-[1040px] px-4 sm:px-6 pt-16 sm:pt-24">
      <div className="max-w-[640px]">
        <h1 className="font-display text-[40px] sm:text-[52px] leading-[1.05] font-medium tracking-[-0.02em] mb-8">
          About
        </h1>

        <div className="space-y-5 text-[16px] text-[var(--color-fg-muted)] leading-relaxed">
          <p>
            mellow llama is a static site with a handful of small browser tools.
            Each one works on files you give it and hands a file back. None of it
            leaves your machine.
          </p>
          <p>
            Where JavaScript would be too slow, a tool loads a small WebAssembly
            module written in Rust. It's fetched the first time you open that tool
            and cached by the browser after that.
          </p>
        </div>

        <dl className="mt-12 border-t border-[var(--color-border-hi)] text-[14px]">
          <Row term="Hosting">GitHub Pages, fully static</Row>
          <Row term="Source">
            <BrandIcon icon={github} size={14} className="mr-1.5 align-[-2px]" />
            <a href={REPO_URL} target="_blank" rel="noreferrer" className="link">
              github.com/KibbeWater/tools
            </a>
          </Row>
          <Row term="Shortcuts">
            Press <Kbd keys="?" /> anywhere
          </Row>
          <Row term="Feedback">Issues and pull requests are welcome</Row>
          <Row term="Minecraft art">
            Disc, jukebox and painting textures are Mojang's, via the{' '}
            <a href="https://minecraft.wiki" target="_blank" rel="noreferrer" className="link">
              Minecraft Wiki
            </a>
            . Not affiliated with Mojang or Microsoft.
          </Row>
        </dl>
      </div>
    </div>
  );
}

function Row({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-4 py-3 border-b border-[var(--color-border)]">
      <dt className="text-[var(--color-fg-subtle)]">{term}</dt>
      <dd className="text-[var(--color-fg)]">{children}</dd>
    </div>
  );
}
