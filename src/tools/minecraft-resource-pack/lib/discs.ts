// Canonical Minecraft music disc registry and pack format table.
// Values verified against https://minecraft.wiki/w/Pack_format and
// https://minecraft.wiki/w/Music_Disc (September 2026).

/** A pack format. Since 1.21.9 formats have a minor part, written `[major, minor]`. */
export type PackFormat = number | [number, number];

export interface McVersion {
  id: string; // user-facing label
  resourceFormat: PackFormat;
  /** Data pack format. Only listed from 1.21, the first version with `jukebox_song`. */
  dataFormat?: PackFormat;
  /** Position in MC_VERSIONS; higher is newer. */
  order: number;
  /** The disc ids available in this version (in display order). */
  discs: string[];
}

export interface DiscMeta {
  id: string; // internal asset name: assets/minecraft/sounds/records/<id>.ogg
  label: string; // display label shown in the picker
  composer?: string;
  /** Id of the first MC_VERSIONS entry that has this disc. */
  since: string;
}

const FIRST = '1.16 – 1.16.1';

// Order matches in-game sort.
export const DISCS: DiscMeta[] = [
  { id: '13', label: '13', composer: 'C418', since: FIRST },
  { id: 'cat', label: 'Cat', composer: 'C418', since: FIRST },
  { id: 'blocks', label: 'Blocks', composer: 'C418', since: FIRST },
  { id: 'chirp', label: 'Chirp', composer: 'C418', since: FIRST },
  { id: 'far', label: 'Far', composer: 'C418', since: FIRST },
  { id: 'mall', label: 'Mall', composer: 'C418', since: FIRST },
  { id: 'mellohi', label: 'Mellohi', composer: 'C418', since: FIRST },
  { id: 'stal', label: 'Stal', composer: 'C418', since: FIRST },
  { id: 'strad', label: 'Strad', composer: 'C418', since: FIRST },
  { id: 'ward', label: 'Ward', composer: 'C418', since: FIRST },
  { id: '11', label: '11', composer: 'C418', since: FIRST },
  { id: 'wait', label: 'Wait', composer: 'C418', since: FIRST },
  { id: 'pigstep', label: 'Pigstep', composer: 'Lena Raine', since: FIRST },
  { id: 'otherside', label: 'Otherside', composer: 'Lena Raine', since: '1.18.x' },
  { id: '5', label: '5', composer: 'Samuel Åberg', since: '1.19 – 1.19.2' },
  { id: 'relic', label: 'Relic', composer: 'Aaron Cherof', since: '1.20 – 1.20.1' },
  { id: 'creator', label: 'Creator', composer: 'Lena Raine', since: '1.21 – 1.21.1' },
  {
    id: 'creator_music_box',
    label: 'Creator (Music Box)',
    composer: 'Lena Raine',
    since: '1.21 – 1.21.1',
  },
  { id: 'precipice', label: 'Precipice', composer: 'Aaron Cherof', since: '1.21 – 1.21.1' },
  { id: 'tears', label: 'Tears', composer: 'Amos Roddy', since: '1.21.6' },
  { id: 'lava_chicken', label: 'Lava Chicken', composer: 'Hyper Potions', since: '1.21.7 – 1.21.8' },
  { id: 'bounce', label: 'Bounce', composer: 'fingerspit', since: '26.2' },
];

const VERSIONS: Omit<McVersion, 'order' | 'discs'>[] = [
  { id: FIRST, resourceFormat: 5 },
  { id: '1.16.2 – 1.16.5', resourceFormat: 6 },
  { id: '1.17.x', resourceFormat: 7 },
  { id: '1.18.x', resourceFormat: 8 },
  { id: '1.19 – 1.19.2', resourceFormat: 9 },
  { id: '1.19.3', resourceFormat: 12 },
  { id: '1.19.4', resourceFormat: 13 },
  { id: '1.20 – 1.20.1', resourceFormat: 15 },
  { id: '1.20.2', resourceFormat: 18 },
  { id: '1.20.3 – 1.20.4', resourceFormat: 22 },
  { id: '1.20.5 – 1.20.6', resourceFormat: 32 },
  { id: '1.21 – 1.21.1', resourceFormat: 34, dataFormat: 48 },
  { id: '1.21.2 – 1.21.3', resourceFormat: 42, dataFormat: 57 },
  { id: '1.21.4', resourceFormat: 46, dataFormat: 61 },
  { id: '1.21.5', resourceFormat: 55, dataFormat: 71 },
  { id: '1.21.6', resourceFormat: 63, dataFormat: 80 },
  { id: '1.21.7 – 1.21.8', resourceFormat: 64, dataFormat: 81 },
  { id: '1.21.9 – 1.21.10', resourceFormat: [69, 0], dataFormat: [88, 0] },
  { id: '1.21.11', resourceFormat: [75, 0], dataFormat: [94, 1] },
  { id: '26.1 – 26.1.2', resourceFormat: [84, 0], dataFormat: [101, 1] },
  { id: '26.2', resourceFormat: [88, 0], dataFormat: [107, 1] },
  { id: '26.3', resourceFormat: [97, 1], dataFormat: [121, 0] },
];

const orderOf = (id: string) => VERSIONS.findIndex((v) => v.id === id);

export const MC_VERSIONS: McVersion[] = VERSIONS.map((v, order) => ({
  ...v,
  order,
  discs: DISCS.filter((d) => orderOf(d.since) <= order).map((d) => d.id),
}));

export const LATEST_VERSION = MC_VERSIONS[MC_VERSIONS.length - 1]!;

/** Newest first, since that's what most people are on. */
export const versionOptions = [...MC_VERSIONS]
  .reverse()
  .map((v) => ({ value: v.id, label: v.id }));

export const getVersion = (id: string): McVersion =>
  MC_VERSIONS.find((v) => v.id === id) ?? LATEST_VERSION;

export const getDisc = (id: string): DiscMeta | undefined => DISCS.find((d) => d.id === id);

/** Custom discs need the `jukebox_song` registry, added in 1.21. */
export const supportsCustomDiscs = (v: McVersion): boolean => v.dataFormat !== undefined;

/**
 * Whether `jukebox_playable` takes a bare song id (1.21.5+) or the older
 * `{song:"..."}` compound (1.21 – 1.21.4).
 */
const usesBareJukeboxPlayable = (v: McVersion): boolean => v.order >= orderOf('1.21.5');

/** A `/give` command for a disc that plays a custom jukebox song. */
export function giveCommand(v: McVersion, songId: string): string {
  const component = usesBareJukeboxPlayable(v)
    ? `minecraft:jukebox_playable="${songId}"`
    : `minecraft:jukebox_playable={song:"${songId}"}`;
  return `/give @s minecraft:music_disc_13[${component}]`;
}

/** `pack` section for pack.mcmeta. 1.21.9+ uses min/max formats instead of `pack_format`. */
export function packMeta(format: PackFormat, description: string): Record<string, unknown> {
  if (Array.isArray(format)) {
    return { description, min_format: format, max_format: format };
  }
  return { description, pack_format: format };
}

/** Item sprite for a vanilla disc (Java Edition texture, via minecraft.wiki). */
export const discImage = (id: string): string =>
  `${import.meta.env.BASE_URL}images/minecraft/discs/${id}.png`;
