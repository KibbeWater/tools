// A pack: one resource pack (plus datapack) that every Minecraft pack feature
// adds to. Discs and paintings each keep their own list; the rest is shared.
// Source files live in IndexedDB, keyed by the ids stored here.
import { LATEST_RELEASE } from '@/lib/minecraft';
import type { Track } from '@/tools/minecraft-resource-pack/lib/project';
import type { Art } from '@/tools/minecraft-paintings/lib/project';

export interface Pack {
  id: string;
  name: string;
  description: string;
  /** Newest Minecraft version the pack targets. */
  versionId: string;
  /** Oldest version it targets. Missing (or equal) means just `versionId`. */
  minVersionId?: string;
  iconId: string | null;
  /** Music discs. */
  tracks: Track[];
  /** Paintings. */
  art: Art[];
  /** Build with protection (see lib/protection.ts). Missing on packs saved before it existed. */
  protect?: boolean;
  createdAt: number;
  updatedAt: number;
}

export function newPack(name = 'My Pack'): Pack {
  const now = Date.now();
  return {
    id: uid(),
    name,
    description: 'Made with mellow llama.',
    versionId: LATEST_RELEASE.id,
    minVersionId: LATEST_RELEASE.id,
    iconId: null,
    tracks: [],
    art: [],
    protect: false,
    createdAt: now,
    updatedAt: now,
  };
}

export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** What a pack holds, e.g. "3 discs · 1 painting". */
export function describePack(p: Pick<Pack, 'tracks' | 'art'>): string {
  const parts = [
    p.tracks.length && plural(p.tracks.length, 'disc'),
    p.art.length && plural(p.art.length, 'painting'),
  ].filter(Boolean);
  return parts.join(' · ') || 'No discs or paintings yet';
}

export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
