import { lazy } from 'react';
import type { ComponentType, LazyExoticComponent } from 'react';

export type ToolAccent = 'peach' | 'pink' | 'butter' | 'mint' | 'sky' | 'lavender';

/** CSS value for a tool's accent; set it as `--color-accent` on the tool's subtree. */
export const accentVar = (accent: ToolAccent) => `var(--color-accent-${accent})`;

export interface ToolMeta {
  id: string;
  name: string;
  tagline: string;
  description: string;
  /** Identity color. Tints the tool's card, header, buttons and focus rings. */
  accent: ToolAccent;
  iconName: string;
  /** Optional pixel-art image shown next to the tool in listings. */
  image?: { src: string; alt: string };
  path: string;
  status: 'stable' | 'beta' | 'wip';
  component: LazyExoticComponent<ComponentType>;
}

// Each tool exposes a lazy-loaded default export from its `route.tsx`.
// The wasm bundle inside the tool page's module graph will only load
// once the route is actually visited.
const minecraftResourcePack: ToolMeta = {
  id: 'minecraft-resource-pack',
  name: 'Minecraft Resource Pack Builder',
  tagline: 'Swap music discs, export a drop-in pack.',
  description:
    'Replace the music discs in Minecraft with your own audio and get back a resource pack zip. Works with pack formats from 1.16 to the current release, and can also register brand-new discs.',
  accent: 'butter',
  iconName: 'compact-disc',
  image: {
    src: `${import.meta.env.BASE_URL}images/minecraft/jukebox.png`,
    alt: 'Minecraft jukebox',
  },
  path: '/minecraft-resource-pack',
  status: 'beta',
  component: lazy(() => import('./minecraft-resource-pack/route')),
};

export const tools: readonly ToolMeta[] = [minecraftResourcePack] as const;

export const toolById = (id: string): ToolMeta | undefined =>
  tools.find((t) => t.id === id);
