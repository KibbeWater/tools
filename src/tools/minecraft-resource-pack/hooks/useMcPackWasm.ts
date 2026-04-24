import { useEffect, useState } from 'react';

type WasmModule = typeof import('../wasm/minecraft_resource_pack');

let cached: Promise<WasmModule> | null = null;

/**
 * Lazily load the Rust-compiled WASM module for the Minecraft tool.
 * The dynamic import is wrapped by `vite-plugin-wasm` so the `.wasm`
 * file is fetched on demand only when the tool page mounts.
 */
export function loadMcPackWasm(): Promise<WasmModule> {
  if (!cached) {
    cached = import('../wasm/minecraft_resource_pack');
  }
  return cached;
}

export type McPackWasmState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; mod: WasmModule }
  | { status: 'error'; error: Error };

export function useMcPackWasm(): McPackWasmState {
  const [state, setState] = useState<McPackWasmState>({ status: 'idle' });

  useEffect(() => {
    let alive = true;
    setState({ status: 'loading' });
    loadMcPackWasm()
      .then((mod) => {
        if (alive) setState({ status: 'ready', mod });
      })
      .catch((err: unknown) => {
        if (alive)
          setState({
            status: 'error',
            error: err instanceof Error ? err : new Error(String(err)),
          });
      });
    return () => {
      alive = false;
    };
  }, []);

  return state;
}
