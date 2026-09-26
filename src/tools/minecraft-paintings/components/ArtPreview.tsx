import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { previewBitmap } from '../lib/images';
import { cropRect, outputSize, type Art } from '../lib/project';

interface ArtPreviewProps {
  art: Art;
  /** Cap on the canvas's long side, in pixels. The real texture size is used when it's smaller. */
  maxPx: number;
  className?: string;
}

/**
 * The painting as it will look in game: the crop, resampled to the texture's
 * size and shown with hard pixel edges. Uses the browser's scaler, so it's a
 * close approximation of the Rust build rather than byte-identical.
 */
export function ArtPreview({ art, maxPx, className }: ArtPreviewProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const bitmap = usePreviewBitmap(art.imageId);
  const out = outputSize(art);
  const scale = Math.min(1, maxPx / Math.max(out.width, out.height));
  const w = Math.max(1, Math.round(out.width * scale));
  const h = Math.max(1, Math.round(out.height * scale));
  const { x, y, w: cw, h: ch } = cropRect(art);
  const filter = art.settings.filter;

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !bitmap) return;
    // The preview bitmap may be downscaled from the original; map the crop onto it.
    const k = bitmap.width / art.imageWidth;
    ctx.clearRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = filter === 'smooth';
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, x * k, y * k, cw * k, ch * k, 0, 0, w, h);
  }, [bitmap, art.imageWidth, x, y, cw, ch, w, h, filter]);

  return (
    <canvas
      ref={ref}
      width={w}
      height={h}
      className={cn('pixelated block h-full w-full bg-[var(--color-surface)]', className)}
    />
  );
}

export function usePreviewBitmap(imageId: string): ImageBitmap | null {
  const [state, setState] = useState<{ id: string; bitmap: ImageBitmap | null }>({ id: imageId, bitmap: null });
  useEffect(() => {
    let alive = true;
    previewBitmap(imageId)
      .then((bitmap) => alive && setState({ id: imageId, bitmap }))
      .catch(() => alive && setState({ id: imageId, bitmap: null }));
    return () => {
      alive = false;
    };
  }, [imageId]);
  return state.id === imageId ? state.bitmap : null;
}
