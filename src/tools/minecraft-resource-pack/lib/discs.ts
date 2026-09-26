// Canonical Minecraft music disc registry.
// Values verified against https://minecraft.wiki/w/Music_Disc (September 2026).
import {
  FIRST_RELEASE,
  MC_RELEASES,
  packMeta,
  releaseOrder,
  releaseOptions,
  supportsDataRegistries,
  type McRelease,
} from '@/lib/minecraft';

export { packMeta };
export type { PackFormat } from '@/lib/minecraft';

export interface McVersion extends McRelease {
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

const FIRST = FIRST_RELEASE.id;

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

export const MC_VERSIONS: McVersion[] = MC_RELEASES.map((r) => ({
  ...r,
  discs: DISCS.filter((d) => releaseOrder(d.since) <= r.order).map((d) => d.id),
}));

export const LATEST_VERSION = MC_VERSIONS[MC_VERSIONS.length - 1]!;

export const versionOptions = releaseOptions;

export const getVersion = (id: string): McVersion =>
  MC_VERSIONS.find((v) => v.id === id) ?? LATEST_VERSION;

export const getDisc = (id: string): DiscMeta | undefined => DISCS.find((d) => d.id === id);

/** Custom discs need the `jukebox_song` registry, added in 1.21. */
export const supportsCustomDiscs = (v: McVersion): boolean => supportsDataRegistries(v);

/**
 * Whether `jukebox_playable` takes a bare song id (1.21.5+) or the older
 * `{song:"..."}` compound (1.21 – 1.21.4).
 */
const usesBareJukeboxPlayable = (v: McVersion): boolean => v.order >= releaseOrder('1.21.5');

/** A `/give` command for a disc that plays a custom jukebox song. */
export function giveCommand(v: McVersion, songId: string): string {
  const component = usesBareJukeboxPlayable(v)
    ? `minecraft:jukebox_playable="${songId}"`
    : `minecraft:jukebox_playable={song:"${songId}"}`;
  return `/give @s minecraft:music_disc_13[${component}]`;
}

/** Item sprite for a vanilla disc (Java Edition texture, via minecraft.wiki). */
export const discImage = (id: string): string =>
  `${import.meta.env.BASE_URL}images/minecraft/discs/${id}.png`;
