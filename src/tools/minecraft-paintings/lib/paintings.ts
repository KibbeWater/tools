// Canonical Minecraft painting registry.
// Values verified against https://minecraft.wiki/w/Painting and
// https://minecraft.wiki/w/Painting_variant_definition (September 2026).
import {
  commandsAcross,
  dataRange,
  FIRST_RELEASE,
  isAtLeast,
  MC_RELEASES,
  packRange,
  releaseOrder,
  supportsDataRegistries,
  type McRelease,
  type VersionedCommand,
  type VersionRange,
} from '@/lib/minecraft';

export interface PaintingMeta {
  id: string; // texture: assets/minecraft/textures/painting/<id>.png
  title: string; // in-game name
  artist?: string;
  width: number; // blocks
  height: number; // blocks
  /** Id of the first MC_RELEASES entry that has this painting. */
  since: string;
  /** Only obtainable with commands (not in the #placeable tag). */
  unused?: true;
}

export interface McVersion extends McRelease {
  /** The painting ids available in this version (in display order). */
  paintings: string[];
}

const FIRST = FIRST_RELEASE.id;
const KZ = 'Kristoffer Zetterstrand';
const SB = 'Sarah Boeving';

const p = (id: string, title: string, width: number, height: number, since = FIRST, artist: string | undefined = KZ): PaintingMeta => ({
  id,
  title,
  artist,
  width,
  height,
  since,
});

// Grouped by size, in the wiki's order.
export const PAINTINGS: PaintingMeta[] = [
  p('kebab', 'Kebab med tre pepperoni', 1, 1),
  p('aztec', 'de_aztec', 1, 1),
  p('alban', 'Albanian', 1, 1),
  p('aztec2', 'de_aztec', 1, 1),
  p('bomb', 'Target Successfully Bombed', 1, 1),
  p('plant', 'Paradisträd', 1, 1),
  p('wasteland', 'Wasteland', 1, 1),
  p('meditative', 'Meditative', 1, 1, '1.21 – 1.21.1', SB),
  p('wanderer', 'Wanderer', 1, 2),
  p('graham', 'Graham', 1, 2),
  p('prairie_ride', 'Prairie Ride', 1, 2, '1.21 – 1.21.1', SB),
  p('pool', 'The Pool', 2, 1),
  p('courbet', 'Bonjour Monsieur Courbet', 2, 1),
  p('sunset', 'sunset_dense', 2, 1),
  p('sea', 'Seaside', 2, 1),
  p('creebet', 'Creebet', 2, 1),
  p('match', 'Match', 2, 2),
  p('bust', 'Bust', 2, 2),
  p('stage', 'The Stage Is Set', 2, 2),
  p('void', 'The Void', 2, 2),
  p('skull_and_roses', 'Skull and Roses', 2, 2),
  p('wither', 'Wither', 2, 2, FIRST, 'Jens Bergensten'),
  p('baroque', 'Baroque', 2, 2, '1.21 – 1.21.1', SB),
  p('humble', 'Humble', 2, 2, '1.21 – 1.21.1', SB),
  { ...p('earth', 'Earth', 2, 2, '1.19 – 1.19.2', 'Mojang'), unused: true },
  { ...p('wind', 'Wind', 2, 2, '1.19 – 1.19.2', 'Mojang'), unused: true },
  { ...p('fire', 'Fire', 2, 2, '1.19 – 1.19.2', 'Mojang'), unused: true },
  { ...p('water', 'Water', 2, 2, '1.19 – 1.19.2', 'Mojang'), unused: true },
  p('bouquet', 'Bouquet', 3, 3, '1.21 – 1.21.1'),
  p('cavebird', 'Cavebird', 3, 3, '1.21 – 1.21.1'),
  p('cotan', 'Cotán', 3, 3, '1.21 – 1.21.1'),
  p('endboss', 'Endboss', 3, 3, '1.21 – 1.21.1'),
  p('fern', 'Fern', 3, 3, '1.21 – 1.21.1'),
  p('owlemons', 'Owlemons', 3, 3, '1.21 – 1.21.1'),
  p('sunflowers', 'Sunflowers', 3, 3, '1.21 – 1.21.1'),
  p('tides', 'Tides', 3, 3, '1.21 – 1.21.1'),
  p('dennis', 'Dennis', 3, 3, '1.21.7 – 1.21.8', SB),
  p('backyard', 'Backyard', 3, 4, '1.21 – 1.21.1'),
  p('pond', 'Pond', 3, 4, '1.21 – 1.21.1'),
  p('fighters', 'Fighters', 4, 2),
  p('changing', 'Changing', 4, 2, '1.21 – 1.21.1'),
  p('finding', 'Finding', 4, 2, '1.21 – 1.21.1'),
  p('lowmist', 'Lowmist', 4, 2, '1.21 – 1.21.1'),
  p('passage', 'Passage', 4, 2, '1.21 – 1.21.1'),
  p('skeleton', 'Mortal Coil', 4, 3),
  p('donkey_kong', 'Kong', 4, 3),
  p('pointer', 'Pointer', 4, 4),
  p('pigscene', 'Pigscene', 4, 4),
  p('burning_skull', 'Skull On Fire', 4, 4),
  p('orb', 'Orb', 4, 4, '1.21 – 1.21.1'),
  p('unpacked', 'Unpacked', 4, 4, '1.21 – 1.21.1', SB),
];

export const MC_VERSIONS: McVersion[] = MC_RELEASES.map((r) => ({
  ...r,
  paintings: PAINTINGS.filter((x) => releaseOrder(x.since) <= r.order).map((x) => x.id),
}));

export const LATEST_VERSION = MC_VERSIONS[MC_VERSIONS.length - 1]!;

export const getVersion = (id: string): McVersion => MC_VERSIONS.find((v) => v.id === id) ?? LATEST_VERSION;

/** The versions a pack targets, with each one's paintings. */
export const getVersionRange = (p: { versionId: string; minVersionId?: string }): VersionRange<McVersion> =>
  packRange(p, getVersion);

export const getPainting = (id: string): PaintingMeta | undefined => PAINTINGS.find((x) => x.id === id);

/** Custom paintings need the `painting_variant` registry, added in 1.21. */
export const supportsCustomPaintings = (v: McVersion): boolean => supportsDataRegistries(v);

/** `title` and `author` on painting variants arrived in 1.21.2. */
export const supportsTitleAndAuthor = (v: McVersion): boolean => isAtLeast(v, '1.21.2 – 1.21.3');

/** Custom paintings can be 1 to 16 blocks on each side. */
export const MAX_CUSTOM_BLOCKS = 16;

/**
 * A `/give` command for a painting item that places one variant. 1.21.5 added
 * the `painting/variant` component; before that the variant rode along in
 * `entity_data`.
 */
export function giveCommand(v: McVersion, variantId: string): string {
  return isAtLeast(v, '1.21.5')
    ? `/give @s minecraft:painting[minecraft:painting/variant="${variantId}"]`
    : `/give @s minecraft:painting[minecraft:entity_data={id:"minecraft:painting",variant:"${variantId}"}]`;
}

/**
 * `/give` commands for a custom painting across the part of `range` that can
 * load it (1.21+): one command, or one each side of 1.21.5 if the range spans it.
 */
export function giveCommands(range: VersionRange<McVersion>, variantId: string): VersionedCommand[] {
  const data = dataRange(range);
  if (!data) return [];
  return commandsAcross({ from: getVersion(data.from.id), to: range.to }, '1.21.5', MC_VERSIONS, (v) =>
    giveCommand(v, variantId),
  );
}

/** Vanilla painting texture at 16 px per block (Java Edition, via minecraft.wiki). */
export const paintingImage = (id: string): string =>
  `${import.meta.env.BASE_URL}images/minecraft/paintings/${id}.png`;

export const sizeLabel = (w: number, h: number) => `${w}×${h}`;
