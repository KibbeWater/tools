// Pull music discs back out of an unzipped resource pack. Packs this tool
// built carry a manifest with disc names; any other music pack still imports,
// using the `music_disc.*` events in its sounds.json files and the disc audio
// it finds under assets/*/sounds/records/.
import { saveBlob } from '@/tools/minecraft-pack/lib/storage';
import { DISCS } from './discs';
import { DEFAULT_SETTINGS, uid, type CustomTrack, type Track, type VanillaTrack } from './project';
import type { DiscManifestEntry } from './pack-builder';

export async function extractDiscs(
  files: Map<string, Uint8Array>,
  manifest: DiscManifestEntry[] | undefined,
): Promise<Track[]> {
  const tracks: Track[] = [];

  const addTrack = async (bytes: Uint8Array, fileName: string, base: TrackIdentity) => {
    const audioId = uid();
    await saveBlob(audioId, new File([bytes as BlobPart], fileName, { type: 'audio/ogg' }));
    tracks.push({
      ...base,
      key: uid(),
      audioId,
      fileName,
      fileSize: bytes.byteLength,
      // The audio in a built pack is already trimmed and faded; start from neutral settings.
      settings: { ...DEFAULT_SETTINGS },
    } as Track);
  };

  const manifestFor = (id: TrackIdentity) =>
    manifest?.find((m) =>
      id.kind === 'vanilla'
        ? m.kind === 'vanilla' && m.discId === id.discId
        : m.kind === 'custom' && m.namespace === id.namespace && m.id === id.id,
    );
  const seen = new Set<string>();
  const add = async (path: string, id: TrackIdentity) => {
    const key = id.kind === 'vanilla' ? `v:${id.discId}` : `c:${id.namespace}:${id.id}`;
    const bytes = files.get(path);
    if (!bytes || seen.has(key)) return;
    seen.add(key);
    const m = manifestFor(id);
    const fallbackName = `${id.kind === 'vanilla' ? id.discId : id.id}.ogg`;
    if (id.kind === 'custom' && m?.kind === 'custom') id = { ...id, displayName: m.displayName };
    await addTrack(bytes, m?.fileName ?? fallbackName, id);
  };

  // Discs linked up through sounds.json come first: that's what the game plays.
  for (const [path, id] of fromSoundsJson(files)) await add(path, id);

  for (const path of files.keys()) {
    const vanilla = path.match(/^assets\/minecraft\/sounds\/records\/([a-z0-9_]+)\.ogg$/);
    if (vanilla && DISCS.some((d) => d.id === vanilla[1])) {
      await add(path, { kind: 'vanilla', discId: vanilla[1]! });
      continue;
    }
    const custom = path.match(/^assets\/([a-z0-9_.-]+)\/sounds\/records\/([a-z0-9_]+)\.ogg$/);
    if (custom && custom[1] !== 'minecraft') {
      const [, namespace, id] = custom as unknown as [string, string, string];
      await add(path, { kind: 'custom', namespace, id, displayName: id.replace(/_/g, ' ') });
    }
  }

  // Keep the in-game disc order rather than zip order.
  const order = (t: Track) => (t.kind === 'vanilla' ? DISCS.findIndex((d) => d.id === t.discId) : 1000);
  return tracks.sort((a, b) => order(a) - order(b));
}

type TrackCommon = 'key' | 'audioId' | 'fileName' | 'fileSize' | 'durationSec' | 'settings';
/** What identifies a track, per kind (Omit over the union would merge the kinds). */
type TrackIdentity = Omit<VanillaTrack, TrackCommon> | Omit<CustomTrack, TrackCommon>;

/**
 * Disc audio named by `music_disc.<id>` events in each namespace's sounds.json,
 * as `[audio path, identity]`. Vanilla discs are overridden in the minecraft
 * namespace; new discs live in their own.
 */
function fromSoundsJson(files: Map<string, Uint8Array>): [string, TrackIdentity][] {
  const out: [string, TrackIdentity][] = [];
  for (const [path, bytes] of files) {
    const ns = path.match(/^assets\/([a-z0-9_.-]+)\/sounds\.json$/)?.[1];
    if (!ns) continue;
    const events = parseJson(bytes);
    if (!events || typeof events !== 'object') continue;
    for (const [event, def] of Object.entries(events as Record<string, any>)) {
      const id = event.match(/^music_disc\.([a-z0-9_]+)$/)?.[1];
      const first = def?.sounds?.[0];
      const name = typeof first === 'string' ? first : first?.type === 'event' ? undefined : first?.name;
      if (!id || typeof name !== 'string') continue;
      const [fileNs, file] = name.includes(':') ? (name.split(':', 2) as [string, string]) : ['minecraft', name];
      const audio = `assets/${fileNs}/sounds/${file}.ogg`;
      if (!files.has(audio)) continue;
      if (ns === 'minecraft') {
        if (DISCS.some((d) => d.id === id)) out.push([audio, { kind: 'vanilla', discId: id }]);
      } else {
        out.push([audio, { kind: 'custom', namespace: ns, id, displayName: id.replace(/_/g, ' ') }]);
      }
    }
  }
  return out;
}

function parseJson(bytes: Uint8Array): unknown {
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return undefined;
  }
}
