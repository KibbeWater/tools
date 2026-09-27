import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { clamp, cropRect, MAX_ZOOM, type IconSettings } from '../lib/icon';
import type { LoadedImage } from '../lib/source';

interface CropEditorProps {
  image: LoadedImage;
  settings: IconSettings;
  onChange: (patch: Partial<IconSettings>) => void;
}

/**
 * The whole source image with a square frame over it. Drag the frame to move
 * it, scroll to zoom, arrow keys to nudge.
 */
export function CropEditor({ image, settings: s, onChange }: CropEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; cx: number; cy: number } | null>(null);
  const { width: W, height: H, preview } = image;
  const r = cropRect(W, H, s);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    canvas.width = preview.width;
    canvas.height = preview.height;
    ctx.drawImage(preview, 0, 0);
  }, [preview]);

  // Where the frame's centre should go, kept inside the image.
  const centreAt = (cx: number, cy: number) => {
    const hw = r.w / W / 2;
    const hh = r.h / H / 2;
    onChange({ cx: clamp(cx, hw, 1 - hw), cy: clamp(cy, hh, 1 - hh) });
  };
  // Start from the frame's real centre, which cropRect may have clamped.
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
  const zoomBy = (k: number) => onChange({ zoom: clamp(s.zoom * k, 1, MAX_ZOOM) });

  const pct = (v: number, of: number) => `${(v / of) * 100}%`;

  return (
    <div
      ref={boxRef}
      className="checker relative mx-auto max-h-[320px] overflow-hidden rounded-[14px] border-2 border-[var(--color-ink)] select-none touch-none"
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
            '+': () => zoomBy(1.15),
            '=': () => zoomBy(1.15),
            '-': () => zoomBy(1 / 1.15),
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
        }}
      />
    </div>
  );
}
