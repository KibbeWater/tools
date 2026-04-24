import { lazy } from 'react';
import type { ComponentType, LazyExoticComponent } from 'react';

export type ToolAccent = 'amber' | 'orange' | 'cyan' | 'violet';

export interface ToolMeta {
  id: string;
  name: string;
  tagline: string;
  description: string;
  accent: ToolAccent;
  iconName: string;
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
    'Build a ready-to-install resource pack that replaces Minecraft music discs with your own audio. Supports every pack format from 1.16 through the latest version, with an advanced mode for custom / modded discs.',
  accent: 'amber',
  iconName: 'Disc3',
  path: '/minecraft-resource-pack',
  status: 'beta',
  component: lazy(() => import('./minecraft-resource-pack/route')),
};

export const tools: readonly ToolMeta[] = [minecraftResourcePack] as const;

export const toolById = (id: string): ToolMeta | undefined =>
  tools.find((t) => t.id === id);
