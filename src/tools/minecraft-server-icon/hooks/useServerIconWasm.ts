import { useEffect, useState } from 'react';

type WasmModule = typeof import('../wasm/minecraft_server_icon');

let cached: Promise<WasmModule> | null = null;

/**
 * Lazily load the Rust-compiled WASM module for the server icon tool.
 * The dynamic import is wrapped by `vite-plugin-wasm` so the `.wasm`
 * file is fetched on demand only when the tool page mounts.
 */
export function loadServerIconWasm(): Promise<WasmModule> {
  if (!cached) {
    cached = import('../wasm/minecraft_server_icon');
    // Let a later call retry after a failed fetch.
    cached.catch(() => (cached = null));
  }
  return cached;
}

export type ServerIconWasmState =
  | { status: 'loading' }
  | { status: 'ready'; mod: WasmModule }
  | { status: 'error'; error: Error };

export function useServerIconWasm(): ServerIconWasmState {
  const [state, setState] = useState<ServerIconWasmState>({ status: 'loading' });

  useEffect(() => {
    let alive = true;
    loadServerIconWasm()
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
