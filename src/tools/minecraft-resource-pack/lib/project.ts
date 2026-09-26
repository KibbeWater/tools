// A pack project: everything needed to rebuild a pack, minus the audio bytes
// themselves (those live in IndexedDB, keyed by `audioId`).
import { DISCS, getVersion, LATEST_VERSION, supportsCustomDiscs, type McVersion } from './discs';

export interface AudioSettings {
  gainDb: number;
  trimStart: number; // seconds
  trimEnd: number; // seconds, 0 = "to end"
  fadeInSec: number;
  fadeOutSec: number;
  mono: boolean;
  quality: number; // Vorbis VBR, -1..10
}

export const DEFAULT_SETTINGS: AudioSettings = {
  gainDb: 0,
  trimStart: 0,
  trimEnd: 0,
  fadeInSec: 0,
  fadeOutSec: 0,
  mono: false,
  quality: 5,
};

interface TrackBase {
  key: string;
  audioId: string;
  fileName: string;
  fileSize: number;
  /** Source duration, from the browser's decoder. Undefined until measured. */
  durationSec?: number;
  settings: AudioSettings;
}

/** Replaces the audio of a vanilla disc. */
export interface VanillaTrack extends TrackBase {
  kind: 'vanilla';
  discId: string;
}

/** A brand-new disc registered through a datapack `jukebox_song` (1.21+). */
export interface CustomTrack extends TrackBase {
  kind: 'custom';
  namespace: string;
  id: string;
  displayName: string;
}

export type Track = VanillaTrack | CustomTrack;

export interface Project {
  id: string;
  name: string;
  description: string;
  versionId: string;
  iconId: string | null;
  tracks: Track[];
  createdAt: number;
  updatedAt: number;
}

export function newProject(name = 'My Music Pack'): Project {
  const now = Date.now();
  return {
    id: uid(),
    name,
    description: 'Custom music discs, made with mellow llama.',
    versionId: LATEST_VERSION.id,
    iconId: null,
    tracks: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** Lowercase `[a-z0-9_]`, the only characters Minecraft allows in ids. */
export function sanitizeId(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export const isValidId = (s: string) => /^[a-z0-9_]+$/.test(s);

export const stripExtension = (name: string) => name.replace(/\.[^.]+$/, '');

export const trackLabel = (t: Track): string =>
  t.kind === 'vanilla' ? (DISCS.find((d) => d.id === t.discId)?.label ?? t.discId) : t.displayName;

/** Problems that would stop this track from building, or `null` if it's fine. */
export function trackProblem(t: Track, version: McVersion): string | null {
  if (t.kind === 'vanilla') {
    if (!version.discs.includes(t.discId)) return `Not a disc in Minecraft ${version.id}`;
    return null;
  }
  if (!supportsCustomDiscs(version)) return 'Custom discs need Minecraft 1.21 or newer';
  if (!isValidId(t.namespace)) return 'Namespace can only use a–z, 0–9 and _';
  if (!isValidId(t.id)) return 'Id can only use a–z, 0–9 and _';
  return null;
}

/** Custom tracks whose `namespace:id` collides with another custom track. */
export function duplicateCustomIds(tracks: Track[]): Set<string> {
  const seen = new Map<string, number>();
  for (const t of tracks) {
    if (t.kind !== 'custom') continue;
    const k = `${t.namespace}:${t.id}`;
    seen.set(k, (seen.get(k) ?? 0) + 1);
  }
  return new Set([...seen].filter(([, n]) => n > 1).map(([k]) => k));
}

/**
 * Guess which vanilla disc a file is meant for from its name, e.g.
 * `pigstep.mp3`, `music_disc_cat.ogg` or `02 - Lava Chicken (remix).flac`.
 * Matches whole words only, so `farewell.mp3` doesn't land on "far".
 */
export function matchDiscByFileName(fileName: string, available: string[]): string | undefined {
  const base = stripExtension(fileName).toLowerCase();
  const words = base.split(/[^a-z0-9]+/).filter(Boolean);
  const joined = `_${words.join('_')}_`;
  // Longest ids first so "creator_music_box" wins over "creator".
  const candidates = [...available].sort((a, b) => b.length - a.length);
  for (const id of candidates) {
    const disc = DISCS.find((d) => d.id === id);
    const forms = [id, disc ? sanitizeId(disc.label) : id];
    for (const form of forms) {
      if (joined.includes(`_music_disc_${form}_`)) return id;
      // Bare numbers ("5", "11", "13") are too common in file names ("track 5"),
      // so only accept them in the explicit music_disc_ form above.
      if (/^\d+$/.test(form)) continue;
      if (joined.includes(`_${form}_`)) return id;
    }
  }
  return undefined;
}

export interface Assignment {
  file: File;
  target: { kind: 'vanilla'; discId: string } | { kind: 'custom' };
}

/**
 * Decide where each dropped file goes: a vanilla disc named in the file name,
 * otherwise the next free vanilla disc, otherwise (on 1.21+) a new custom disc.
 */
export function planDrop(files: File[], project: Project): { assignments: Assignment[]; skipped: File[] } {
  const version = getVersion(project.versionId);
  const taken = new Set(
    project.tracks.filter((t): t is VanillaTrack => t.kind === 'vanilla').map((t) => t.discId),
  );
  const free = () => version.discs.filter((id) => !taken.has(id));
  const assignments: Assignment[] = [];
  const skipped: File[] = [];
  const unmatched: File[] = [];

  for (const file of files) {
    const id = matchDiscByFileName(file.name, free());
    if (id) {
      taken.add(id);
      assignments.push({ file, target: { kind: 'vanilla', discId: id } });
    } else {
      unmatched.push(file);
    }
  }
  for (const file of unmatched) {
    const [id] = free();
    if (id) {
      taken.add(id);
      assignments.push({ file, target: { kind: 'vanilla', discId: id } });
    } else if (supportsCustomDiscs(version)) {
      assignments.push({ file, target: { kind: 'custom' } });
    } else {
      skipped.push(file);
    }
  }
  return { assignments, skipped };
}

export function defaultNamespace(project: Project): string {
  return sanitizeId(project.name) || 'custom';
}

/** A custom id derived from the file name that doesn't clash with existing ones. */
export function uniqueCustomId(fileName: string, namespace: string, tracks: Track[]): string {
  const base = sanitizeId(stripExtension(fileName)) || 'disc';
  const used = new Set(
    tracks.filter((t): t is CustomTrack => t.kind === 'custom' && t.namespace === namespace).map((t) => t.id),
  );
  if (!used.has(base)) return base;
  for (let n = 2; ; n++) if (!used.has(`${base}_${n}`)) return `${base}_${n}`;
}

export const isAudioFile = (f: File) =>
  f.type.startsWith('audio/') || /\.(mp3|wav|flac|ogg|oga|m4a|aac|mp4)$/i.test(f.name);
