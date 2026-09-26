import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { cropRect, artSize, MAX_ZOOM, type Art, type ImageSettings } from '../lib/project';
import { usePreviewBitmap } from './ArtPreview';

interface CropEditorProps {
  art: Art;
  onChange: (patch: Partial<ImageSettings>) => void;
}

/**
 * The whole source image with the painting's frame over it. Drag the frame to
 * move it, scroll to zoom, arrow keys to nudge. Lines inside the frame mark
 * block edges.
 */
export function CropEditor({ art, onChange }: CropEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; cx: number; cy: number } | null>(null);
  const bitmap = usePreviewBitmap(art.imageId);
  const W = art.imageWidth;
  const H = art.imageHeight;
  const r = cropRect(art);
  const blocks = artSize(art);
  const s = art.settings;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !bitmap) return;
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    ctx.drawImage(bitmap, 0, 0);
  }, [bitmap]);

  // Where the frame's centre should go, kept inside the image.
  const centreAt = (cx: number, cy: number) => {
    const hw = r.w / W / 2;
    const hh = r.h / H / 2;
    onChange({ cx: clamp(cx, hw, 1 - hw), cy: clamp(cy, hh, 1 - hh) });
  };
  // Start from the frame's real centre, which the renderer may have clamped.
  const centre = { cx: (r.x + r.w / 2) / W, cy: (r.y + r.h / 2) / H };

  const onPointerDown = (e: ReactPointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ...centre };
  };
  const onPointerMove = (e: ReactPointerEvent) => {
    const d = drag.current;
    const box = boxRef.current?.getBoundingClientRect();
    if (!d || !box) return;
    centreAt(d.cx + (e.clientX - d.x) / box.width, d.cy + (e.clientY - d.y) / box.height);
  };
  const endDrag = () => (drag.current = null);

  // React's wheel listener is passive, so preventDefault needs a native one.
  const latest = useRef({ zoom: s.zoom, onChange });
  latest.current = { zoom: s.zoom, onChange };
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { zoom, onChange: set } = latest.current;
      set({ zoom: clamp(zoom * Math.exp(-e.deltaY * 0.0015), 1, MAX_ZOOM) });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const nudge = (dx: number, dy: number) => centreAt(centre.cx + dx * (r.w / W), centre.cy + dy * (r.h / H));

  const pct = (v: number, of: number) => `${(v / of) * 100}%`;

  return (
    <div
      ref={boxRef}
      className="relative mx-auto max-h-[320px] overflow-hidden rounded-[14px] border-2 border-[var(--color-ink)] bg-[var(--color-surface)] select-none touch-none"
      style={{ aspectRatio: `${W} / ${H}`, maxWidth: `calc(320px * ${W / H})` }}
      onDoubleClick={() => onChange({ cx: 0.5, cy: 0.5, zoom: 1 })}
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
      <div
        role="slider"
        tabIndex={0}
        aria-label="Crop position. Arrow keys move it, plus and minus zoom."
        aria-valuetext={`Zoom ${s.zoom.toFixed(1)}×`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={(e) => {
          const step = e.shiftKey ? 0.25 : 0.05;
          const keys: Record<string, () => void> = {
            ArrowLeft: () => nudge(-step, 0),
            ArrowRight: () => nudge(step, 0),
            ArrowUp: () => nudge(0, -step),
            ArrowDown: () => nudge(0, step),
            '+': () => onChange({ zoom: clamp(s.zoom * 1.15, 1, MAX_ZOOM) }),
            '=': () => onChange({ zoom: clamp(s.zoom * 1.15, 1, MAX_ZOOM) }),
            '-': () => onChange({ zoom: clamp(s.zoom / 1.15, 1, MAX_ZOOM) }),
          };
          const fn = keys[e.key];
          if (!fn) return;
          e.preventDefault();
          fn();
        }}
        className="absolute cursor-move outline-2 outline-offset-2 outline-[var(--color-accent-deep)] focus-visible:outline"
        style={{
          left: pct(r.x, W),
          top: pct(r.y, H),
          width: pct(r.w, W),
          height: pct(r.h, H),
          // Dim everything outside the frame.
          boxShadow: '0 0 0 9999px color-mix(in oklch, var(--color-ink) 55%, transparent)',
          border: '2px solid white',
          backgroundImage: blockGrid(blocks.width, blocks.height),
        }}
      />
    </div>
  );
}

/** Faint lines on block edges, drawn as gradients so they scale with the frame. */
function blockGrid(w: number, h: number): string {
  const line = 'rgb(255 255 255 / 0.45)';
  const layers: string[] = [];
  for (let i = 1; i < w; i++) {
    const at = (i / w) * 100;
    layers.push(`linear-gradient(to right, transparent calc(${at}% - 0.5px), ${line} calc(${at}% - 0.5px), ${line} calc(${at}% + 0.5px), transparent calc(${at}% + 0.5px))`);
  }
  for (let i = 1; i < h; i++) {
    const at = (i / h) * 100;
    layers.push(`linear-gradient(to bottom, transparent calc(${at}% - 0.5px), ${line} calc(${at}% - 0.5px), ${line} calc(${at}% + 0.5px), transparent calc(${at}% + 0.5px))`);
  }
  return layers.join(', ') || 'none';
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
