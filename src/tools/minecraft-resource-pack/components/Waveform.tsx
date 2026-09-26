import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { cn } from '@/lib/cn';
import { peaks } from '../lib/preview';

interface WaveformProps {
  buffer: AudioBuffer;
  trimStart: number;
  /** 0 = end of file */
  trimEnd: number;
  onTrimChange: (start: number, end: number) => void;
  /** Seconds into the source file, or null when not playing. */
  playhead: number | null;
  onSeek: (sourceSec: number) => void;
}

const BARS = 140;
/** Pointer distance (px) at which a press grabs a trim handle instead of seeking. */
const GRAB_PX = 10;

export function Waveform({ buffer, trimStart, trimEnd, onTrimChange, playhead, onSeek }: WaveformProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<'start' | 'end' | null>(null);
  const bars = useMemo(() => peaks(buffer, BARS), [buffer]);
  const dur = buffer.duration;
  const end = trimEnd > 0 ? Math.min(trimEnd, dur) : dur;
  const pct = (sec: number) => `${(sec / dur) * 100}%`;

  const secAt = (clientX: number) => {
    const r = ref.current!.getBoundingClientRect();
    return Math.min(dur, Math.max(0, ((clientX - r.left) / r.width) * dur));
  };

  const onPointerDown = (e: PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    const px = (sec: number) => r.left + (sec / dur) * r.width;
    const dStart = Math.abs(e.clientX - px(trimStart));
    const dEnd = Math.abs(e.clientX - px(end));
    if (Math.min(dStart, dEnd) <= GRAB_PX) {
      setDrag(dStart <= dEnd ? 'start' : 'end');
      ref.current!.setPointerCapture(e.pointerId);
    } else {
      onSeek(secAt(e.clientX));
    }
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!drag) return;
    const s = Math.round(secAt(e.clientX) * 10) / 10;
    if (drag === 'start') onTrimChange(Math.min(s, end - 0.5), trimEnd);
    else {
      const next = Math.max(s, trimStart + 0.5);
      // Snapping to the very end means "no end trim".
      onTrimChange(trimStart, next >= dur - 0.05 ? 0 : next);
    }
  };

  useEffect(() => {
    if (!drag) return;
    const up = () => setDrag(null);
    window.addEventListener('pointerup', up);
    return () => window.removeEventListener('pointerup', up);
  }, [drag]);

  return (
    <div
      ref={ref}
      role="slider"
      aria-label="Trim and seek"
      aria-valuemin={0}
      aria-valuemax={Math.round(dur)}
      aria-valuenow={Math.round(playhead ?? trimStart)}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      className={cn(
        'relative h-20 select-none touch-none rounded-[14px] border-2 border-[var(--color-ink)] bg-[var(--color-bg-raised)] overflow-hidden',
        drag ? 'cursor-ew-resize' : 'cursor-pointer',
      )}
    >
      <svg viewBox={`0 0 ${BARS} 100`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        {Array.from(bars, (v, i) => {
          const h = Math.max(3, v * 88);
          const sec = ((i + 0.5) / BARS) * dur;
          const kept = sec >= trimStart && sec <= end;
          return (
            <rect
              key={i}
              x={i + 0.15}
              y={50 - h / 2}
              width={0.7}
              height={h}
              rx={0.35}
              fill={kept ? 'var(--color-accent-deep)' : 'var(--color-border-hi)'}
            />
          );
        })}
      </svg>
      {/* Trimmed-away regions */}
      <div className="absolute inset-y-0 left-0 bg-[var(--color-surface)]/70" style={{ width: pct(trimStart) }} />
      <div className="absolute inset-y-0 right-0 bg-[var(--color-surface)]/70" style={{ width: `calc(100% - ${pct(end)})` }} />
      <Handle at={pct(trimStart)} active={drag === 'start'} />
      <Handle at={pct(end)} active={drag === 'end'} />
      {playhead !== null && (
        <div className="absolute inset-y-0 w-0.5 bg-[var(--color-ink)]" style={{ left: pct(playhead) }} />
      )}
    </div>
  );
}

function Handle({ at, active }: { at: string; active: boolean }) {
  return (
    <div className="absolute inset-y-0 -ml-[5px] w-[10px] flex justify-center" style={{ left: at }}>
      <div className={cn('w-1 h-full rounded-full bg-[var(--color-ink)] transition-transform', active && 'scale-x-150')} />
      <div className="absolute top-1/2 -translate-y-1/2 h-6 w-3 rounded-full border-2 border-[var(--color-ink)] bg-[var(--color-accent)]" />
    </div>
  );
}
