import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import github from 'thesvg/github';
import { tools } from '@/tools/registry';
import { ToolCard } from '@/components/ToolCard';
import { BrandIcon } from '@/components/ui/BrandIcon';
import { REPO_URL } from '@/lib/site';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { Icon } from '@/components/ui/Icon';
import { faStar } from '@fortawesome/free-solid-svg-icons/faStar';
import { faHeart } from '@fortawesome/free-solid-svg-icons/faHeart';

const ease = [0.2, 0, 0, 1] as const;

export default function Home() {
  return (
    <div className="mx-auto max-w-[1040px] px-4 sm:px-6">
      <section className="grid md:grid-cols-[1.15fr_1fr] items-center gap-4 md:gap-8 pt-10 pb-12 sm:pt-16 sm:pb-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
        >
          <HeroTitle />
          <p className="mt-6 text-[17px] text-[var(--color-fg-muted)] leading-relaxed max-w-[48ch]">
            Open a file, change it, download the result. Nothing gets uploaded: the
            work happens in this tab, with Rust compiled to WebAssembly for the heavy
            parts.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href="#tools"
              className="inline-flex items-center h-12 px-6 rounded-full border-2 border-[var(--color-ink)] bg-[var(--color-accent)] text-[var(--color-accent-fg)] text-[15px] font-semibold shadow-[3px_3px_0_var(--color-ink)] hover:bg-[var(--color-accent-hover)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_var(--color-ink)] transition-[background-color,translate,box-shadow]"
            >
              Browse the tools
            </a>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 h-12 px-6 rounded-full border-2 border-[var(--color-border-hi)] text-[15px] font-medium text-[var(--color-fg)] hover:border-[var(--color-ink)] hover:bg-[var(--color-bg-raised)] transition-colors"
            >
              <BrandIcon icon={github} size={15} />
              Source
            </a>
          </div>
        </motion.div>

        <Llama />
      </section>

      <section id="tools" aria-labelledby="tools-heading" className="scroll-mt-20">
        <div className="flex items-baseline justify-between mb-5">
          <h2 id="tools-heading" className="font-display text-[30px] font-semibold">
            The toolbox
          </h2>
          <span className="text-[13px] text-[var(--color-fg-subtle)]">
            {tools.length} {tools.length === 1 ? 'tool' : 'tools'} so far
          </span>
        </div>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {tools.map((t, i) => (
            <ToolCard key={t.id} tool={t} index={i} />
          ))}
          <motion.li
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 + tools.length * 0.06, duration: 0.32, ease }}
          >
            <a
              href={`${REPO_URL}/issues/new`}
              target="_blank"
              rel="noreferrer"
              className="group flex h-full min-h-[240px] flex-col justify-end rounded-[24px] border-2 border-dashed border-[var(--color-border-hi)] p-6 hover:border-[var(--color-ink)] hover:bg-[var(--color-bg-raised)] transition-colors"
            >
              <span className="font-display text-[24px] font-semibold leading-tight">
                Want a tool that isn't here?
              </span>
              <span className="mt-2 inline-flex items-center gap-2 text-[14px] text-[var(--color-fg-muted)] group-hover:text-[var(--color-fg)] transition-colors">
                <BrandIcon icon={github} size={14} />
                Suggest it on GitHub
              </span>
            </a>
          </motion.li>
        </ul>
      </section>
    </div>
  );
}

const titleWords = ['Tiny', 'tools', 'that'];

function HeroTitle() {
  const reduced = useReducedMotion();
  const word = (i: number) => ({
    initial: reduced ? false : { opacity: 0, y: 28, rotate: 4 },
    animate: { opacity: 1, y: 0, rotate: 0 },
    transition: { type: 'spring' as const, stiffness: 420, damping: 30, delay: 0.05 + i * 0.07 },
  });
  // Words are separate animated spans spaced by margin, so give the heading its real text.
  return (
    <h1
      aria-label="Tiny tools that do one thing well."
      className="font-display text-[46px] sm:text-[68px] leading-[1.02] font-semibold tracking-[-0.02em]"
    >
      {titleWords.map((w, i) => (
        <motion.span key={w} className="inline-block mr-[0.25em]" {...word(i)}>
          {w}
        </motion.span>
      ))}
      <motion.span className="relative isolate inline-block whitespace-nowrap mr-[0.25em]" {...word(3)}>
        {/* The highlight wipes in behind the words once they've landed. */}
        <motion.span
          aria-hidden
          className="absolute -inset-x-3 top-[0.1em] -bottom-[0.06em] origin-left -rotate-[2deg] rounded-full border-2 border-[var(--color-ink)] bg-[var(--color-accent-butter)]"
          initial={reduced ? false : { scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.5, ease: [0.65, 0, 0.35, 1], delay: 0.45 }}
        />
        <motion.span
          className="relative"
          initial={reduced ? false : { color: 'var(--color-fg)' }}
          animate={{ color: 'var(--color-fg)' }}
          transition={{ duration: 0.2, delay: 0.7 }}
        >
          do one thing
        </motion.span>
      </motion.span>
      <motion.span className="inline-block" {...word(4)}>
        well.
      </motion.span>
    </h1>
  );
}

/** The mascot: bobs on a loop and leans a little toward the cursor. */
function Llama() {
  const reduced = useReducedMotion();
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const x = useSpring(useTransform(px, [-1, 1], [-14, 14]), { stiffness: 120, damping: 20 });
  const y = useSpring(useTransform(py, [-1, 1], [-10, 10]), { stiffness: 120, damping: 20 });
  const rotate = useSpring(useTransform(px, [-1, 1], [-4, 4]), { stiffness: 120, damping: 20 });

  return (
    <div
      className="relative order-first md:order-none w-[70%] md:w-full max-w-[460px] mx-auto -my-6 md:my-0"
      onPointerMove={(e) => {
        if (reduced) return;
        const r = e.currentTarget.getBoundingClientRect();
        px.set(((e.clientX - r.left) / r.width) * 2 - 1);
        py.set(((e.clientY - r.top) / r.height) * 2 - 1);
      }}
      onPointerLeave={() => {
        px.set(0);
        py.set(0);
      }}
    >
      <motion.div
        initial={reduced ? false : { opacity: 0, scale: 0.9, rotate: -6 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 160, damping: 18, delay: 0.15 }}
        className="relative"
      >
        <Sparkles />
        <motion.img
          src={`${import.meta.env.BASE_URL}images/llama.webp`}
          alt="A fluffy baby llama in a pink scarf, holding a wrench"
          width={572}
          height={827}
          style={{ x, y, rotate }}
          className="relative mx-auto w-[78%] drop-shadow-[0_14px_18px_rgb(74_52_40_/_0.18)] motion-safe:animate-[float-idle_6s_ease-in-out_infinite]"
        />
      </motion.div>
    </div>
  );
}

// Little stickers around the llama. Each bobs on its own offset so they don't move in lockstep.
const sparkles = [
  { icon: faStar, color: 'var(--color-accent-butter)', size: 34, top: '6%', left: '6%', delay: '0s', rotate: -12 },
  { icon: faHeart, color: 'var(--color-accent-pink)', size: 26, top: '18%', left: '86%', delay: '-1.5s', rotate: 14 },
  { icon: faStar, color: 'var(--color-accent-sky)', size: 22, top: '62%', left: '0%', delay: '-3s', rotate: 8 },
  { icon: faHeart, color: 'var(--color-accent-lavender)', size: 20, top: '76%', left: '90%', delay: '-2.2s', rotate: -10 },
  { icon: faStar, color: 'var(--color-accent-mint)', size: 16, top: '40%', left: '94%', delay: '-4s', rotate: 20 },
];

function Sparkles() {
  return (
    <>
      {sparkles.map((s, i) => (
        <motion.span
          key={i}
          aria-hidden
          className="absolute"
          style={{ top: s.top, left: s.left, rotate: s.rotate }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 14, delay: 0.5 + i * 0.08 }}
        >
          {/* Ink outline via a stroke painted under the fill, so the pastel reads on cream. */}
          <span
            className="block motion-safe:animate-[float-idle_4s_ease-in-out_infinite] [&_path]:stroke-[var(--color-ink)] [&_path]:[stroke-width:40px] [&_path]:[paint-order:stroke]"
            style={{ color: s.color, animationDelay: s.delay }}
          >
            <Icon icon={s.icon} size={s.size} />
          </span>
        </motion.span>
      ))}
    </>
  );
}
