# mellow llama

A static site hosting small browser-based tools, built with Vite + React + TypeScript. Every tool runs locally in your browser — nothing is uploaded. Optional Rust-built WebAssembly modules are fetched on demand the first time you open a tool and then cached for offline use.

Deployed to https://kibbewater.github.io/tools/.

## Tools

- **Minecraft Resource Pack Builder** — drop in custom music disc replacements (vanilla mode) or scaffold a full datapack + resource pack for your own custom discs (advanced mode). Supports every pack format from 1.16 through the current release.

## Stack

- Vite 6 + React 19 + TypeScript
- React Router v7 (with `viewTransition` navigation)
- Tailwind CSS v4
- framer-motion
- `@tanstack/react-hotkeys` + `cmdk` command palette
- Rust → WASM via `wasm-pack`; `symphonia` (decode) + `zip` in-crate
- OGG Vorbis encoding via `wasm-media-encoders` (precompiled Vorbis WASM wrapped in JS)
- Deployed fully statically via GitHub Pages (`actions/deploy-pages`)

## Layout

Each tool is a **self-contained feature slice** under `src/tools/<id>/`. The registry at `src/tools/registry.ts` is the single source of truth consumed by both the router and the home gallery — adding a new tool is one entry + one folder.

```
src/
  layouts/Root.tsx
  router.tsx
  pages/ (Home, About, NotFound)
  tools/
    registry.ts
    <id>/
      meta.ts
      route.tsx          (default export — route component)
      {Vanilla,Advanced}Mode.tsx
      components/
      hooks/
      lib/
      wasm/              (wasm-pack output — gitignored)
  components/            (SHARED UI primitives only)
  lib/                   (SHARED utilities only)
  hooks/                 (SHARED hooks only)
  styles/index.css
crates/
  <id>/                  (Rust WASM source — mirrors src/tools/<id>/)
```

## Develop

```bash
# one-time
rustup target add wasm32-unknown-unknown
cargo install wasm-pack --locked
npm install

# build all WASM modules once (re-run whenever a crate changes)
npm run build:wasm

# then start the dev server
npm run dev
```

Open http://localhost:5173/tools/.

## Keyboard shortcuts

Hit `?` anywhere for the full cheatsheet. Highlights:

- `⌘K` / `Ctrl+K` — command palette
- `g h` — go home
- `g m` — go to the Minecraft tool
- `n` — (on MC tool) pick a disc to replace
- `b` — (on MC tool) build the pack

## CI

A single workflow (`.github/workflows/deploy.yml`) installs Rust, loops over `crates/*/` building each to WASM, runs `npm run build`, and publishes the `dist/` directory via `actions/deploy-pages@v4`. Adding a new Rust-powered tool only requires dropping a new crate into `crates/` — no workflow edit needed.
