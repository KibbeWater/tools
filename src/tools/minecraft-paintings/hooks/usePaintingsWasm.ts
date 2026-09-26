import { useEffect, useState } from 'react';

type WasmModule = typeof import('../wasm/minecraft_paintings');

let cached: Promise<WasmModule> | null = null;

/**
 * Lazily load the Rust-compiled WASM module for the painting tool.
 * The dynamic import is wrapped by `vite-plugin-wasm` so the `.wasm`
 * file is fetched on demand only when the tool page mounts.
 */
export function loadPaintingsWasm(): Promise<WasmModule> {
  if (!cached) {
    cached = import('../wasm/minecraft_paintings');
    // Let a later call retry after a failed fetch.
    cached.catch(() => (cached = null));
  }
  return cached;
}

export type PaintingsWasmState =
  | { status: 'loading' }
  | { status: 'ready'; mod: WasmModule }
  | { status: 'error'; error: Error };

export function usePaintingsWasm(): PaintingsWasmState {
  const [state, setState] = useState<PaintingsWasmState>({ status: 'loading' });

  useEffect(() => {
    let alive = true;
    loadPaintingsWasm()
      .then((mod) => {
        if (alive) setState({ status: 'ready', mod });
      })
      .catch((err: unknown) => {
        if (alive) setState({ status: 'error', error: err instanceof Error ? err : new Error(String(err)) });
      });
    return () => {
      alive = false;
    };
  }, []);

  return state;
}
