// Canonical Minecraft music disc registry and pack_format table.
// Values verified against https://minecraft.wiki/w/Pack_format and
// https://minecraft.wiki/w/Music_Disc as of early 2026.

export interface McVersion {
  id: string; // user-facing label
  packFormat: number;
  sortKey: number; // for ordering, higher = newer
  /** The disc ids available in this version (in display order). */
  discs: string[];
}

export interface DiscMeta {
  id: string; // internal asset name: assets/minecraft/sounds/records/<id>.ogg
  label: string; // display label shown in the picker
  composer?: string;
  sinceSortKey: number; // minimum sortKey at which this disc exists
}

// A small but comfortably wide disc table. Order matches in-game sort.
export const DISCS: DiscMeta[] = [
  { id: '13', label: '13', composer: 'C418', sinceSortKey: 116 },
  { id: 'cat', label: 'Cat', composer: 'C418', sinceSortKey: 116 },
  { id: 'blocks', label: 'Blocks', composer: 'C418', sinceSortKey: 116 },
  { id: 'chirp', label: 'Chirp', composer: 'C418', sinceSortKey: 116 },
  { id: 'far', label: 'Far', composer: 'C418', sinceSortKey: 116 },
  { id: 'mall', label: 'Mall', composer: 'C418', sinceSortKey: 116 },
  { id: 'mellohi', label: 'Mellohi', composer: 'C418', sinceSortKey: 116 },
  { id: 'stal', label: 'Stal', composer: 'C418', sinceSortKey: 116 },
  { id: 'strad', label: 'Strad', composer: 'C418', sinceSortKey: 116 },
  { id: 'ward', label: 'Ward', composer: 'C418', sinceSortKey: 116 },
  { id: '11', label: '11', composer: 'C418', sinceSortKey: 116 },
  { id: 'wait', label: 'Wait', composer: 'C418', sinceSortKey: 116 },
  { id: 'pigstep', label: 'Pigstep', composer: 'Lena Raine', sinceSortKey: 116 },
  { id: 'otherside', label: 'Otherside', composer: 'Lena Raine', sinceSortKey: 118 },
  { id: '5', label: '5', composer: 'Samuel Åberg', sinceSortKey: 119 },
  { id: 'relic', label: 'Relic', composer: 'Aaron Cherof', sinceSortKey: 120 },
  { id: 'creator', label: 'Creator', composer: 'Lena Raine', sinceSortKey: 1205 },
  {
    id: 'creator_music_box',
    label: 'Creator (Music Box)',
    composer: 'Lena Raine',
    sinceSortKey: 1205,
  },
  { id: 'precipice', label: 'Precipice', composer: 'Aaron Cherof', sinceSortKey: 1205 },
  { id: 'tears', label: 'Tears', composer: 'Amos Roddy', sinceSortKey: 1215 },
  { id: 'lava_chicken', label: 'Lava Chicken', composer: 'HDSounDI', sinceSortKey: 1215 },
];

// Minecraft version → pack_format. `sortKey` is a monotonically-increasing
// integer used to gate which discs appear for the selected version. The id is
// what the user sees in the dropdown.
export const MC_VERSIONS: McVersion[] = [
  { id: '1.16 – 1.16.1', packFormat: 5, sortKey: 116, discs: [] },
  { id: '1.16.2 – 1.16.5', packFormat: 6, sortKey: 1162, discs: [] },
  { id: '1.17.x', packFormat: 7, sortKey: 117, discs: [] },
  { id: '1.18.x', packFormat: 8, sortKey: 118, discs: [] },
  { id: '1.19 – 1.19.2', packFormat: 9, sortKey: 119, discs: [] },
  { id: '1.19.3', packFormat: 12, sortKey: 1193, discs: [] },
  { id: '1.19.4', packFormat: 13, sortKey: 1194, discs: [] },
  { id: '1.20 – 1.20.1', packFormat: 15, sortKey: 120, discs: [] },
  { id: '1.20.2', packFormat: 18, sortKey: 1202, discs: [] },
  { id: '1.20.3 – 1.20.4', packFormat: 22, sortKey: 1204, discs: [] },
  { id: '1.20.5 – 1.20.6', packFormat: 32, sortKey: 1205, discs: [] },
  { id: '1.21 – 1.21.1', packFormat: 34, sortKey: 1210, discs: [] },
  { id: '1.21.2 – 1.21.3', packFormat: 42, sortKey: 1212, discs: [] },
  { id: '1.21.4', packFormat: 46, sortKey: 1214, discs: [] },
  { id: '1.21.5+', packFormat: 55, sortKey: 1215, discs: [] },
].map((v) => ({
  ...v,
  discs: DISCS.filter((d) => v.sortKey >= d.sinceSortKey).map((d) => d.id),
}));

export const LATEST_VERSION = MC_VERSIONS[MC_VERSIONS.length - 1]!;

export const versionOptions = MC_VERSIONS.map((v) => ({ value: v.id, label: v.id }));

export const getVersion = (id: string): McVersion =>
  MC_VERSIONS.find((v) => v.id === id) ?? LATEST_VERSION;

export const getDisc = (id: string): DiscMeta | undefined =>
  DISCS.find((d) => d.id === id);
