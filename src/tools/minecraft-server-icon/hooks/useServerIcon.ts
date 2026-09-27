import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_SETTINGS, renderOptions, settingsForImage, type IconSettings } from '../lib/icon';
import { loadImage, type LoadedImage } from '../lib/source';

export interface RenderedIcon {
  png: Uint8Array;
  /** Object URL for the PNG; revoked when the icon changes. */
  url: string;
}

/** The open image, its settings, and the icon rendered from them in Rust. */
export function useServerIcon() {
  const [image, setImage] = useState<LoadedImage | null>(null);
  const [settings, setSettings] = useState<IconSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [icon, setIcon] = useState<RenderedIcon | null>(null);
  const openCount = useRef(0);

  const open = useCallback(async (file: File) => {
    const n = ++openCount.current;
    setLoading(true);
    setError(null);
    try {
      const img = await loadImage(file);
      // A newer file was dropped while this one decoded.
      if (n !== openCount.current) return release(img);
      setImage(img);
      setSettings(settingsForImage(img.width, img.height));
    } catch (e) {
      if (n === openCount.current) setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (n === openCount.current) setLoading(false);
    }
  }, []);

  const update = useCallback((patch: Partial<IconSettings>) => setSettings((s) => ({ ...s, ...patch })), []);

  // Free each image once it's replaced or the page closes. This cleanup runs in
  // the same commit that cancels the render frame below, so no frame can touch
  // a freed image.
  useEffect(() => {
    if (!image) return;
    return () => release(image);
  }, [image]);

  // Re-render at most once a frame while the crop is being dragged.
  useEffect(() => {
    if (!image) return;
    const frame = requestAnimationFrame(() => {
      try {
        const png = image.source.render(renderOptions(image.width, image.height, settings));
        setIcon({ png, url: URL.createObjectURL(new Blob([png as BlobPart], { type: 'image/png' })) });
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [image, settings]);

  useEffect(() => {
    if (!icon) return;
    return () => URL.revokeObjectURL(icon.url);
  }, [icon]);

  return { image, settings, update, open, loading, error, icon };
}

function release(img: LoadedImage) {
  img.source.free();
  img.preview.close();
}
