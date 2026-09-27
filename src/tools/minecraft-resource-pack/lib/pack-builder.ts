// The music disc part of a pack build: disc audio and sounds.json for the
// resource pack, jukebox songs for the datapack. Encodes are cached per track,
// so rebuilding after a small change only re-encodes the tracks that changed.
import type { BuildProgress, PackEntry } from '@/tools/minecraft-pack/lib/build';
import type { Pack } from '@/tools/minecraft-pack/lib/pack';
import { loadBlob, loadEncoded, saveEncoded } from '@/tools/minecraft-pack/lib/storage';
import { loadMcPackWasm } from '../hooks/useMcPackWasm';
import { encodePlanarToOgg } from './audio-encoder';
import { getVersion, giveCommand } from './discs';
import { duplicateCustomIds, trackLabel, trackProblem, type Track } from './project';

export interface CustomSong {
  label: string;
  songId: string;
  give: string;
}

export interface DiscFiles {
  rp: PackEntry[];
  dp: PackEntry[];
  encodedCount: number;
  reusedCount: number;
  customSongs: CustomSong[];
}

/** How discs are recorded in the pack's `mellow-llama.json`. */
export type DiscManifestEntry =
  | { kind: 'vanilla'; discId: string; fileName: string }
  | { kind: 'custom'; namespace: string; id: string; displayName: string; fileName: string };

/** Where a sound named `path` (relative to `sounds/`, no extension) lives in namespace `ns`. */
const soundFile = (ns: string, path: string) => `assets/${ns}/sounds/${path}.ogg`;

/**
 * Bump when the decode/encode output changes, so encodes cached by an older
 * version of the tool are redone instead of reused.
 */
const ENCODER_REVISION = 2;

const fingerprint = (t: Track) => `r${ENCODER_REVISION}|${t.audioId}|${JSON.stringify(t.settings)}`;

/** Problems that would stop the discs from building, one line per disc. */
export function discProblems(pack: Pick<Pack, 'versionId' | 'tracks'>): string[] {
  const version = getVersion(pack.versionId);
  const dupes = duplicateCustomIds(pack.tracks);
  return pack.tracks.flatMap((t) => {
    const p = trackProblem(t, version);
    if (p) return [`${trackLabel(t)}: ${p}`];
    if (t.kind === 'custom' && dupes.has(`${t.namespace}:${t.id}`)) {
      return [`${trackLabel(t)}: ${t.namespace}:${t.id} is used by another disc`];
    }
    return [];
  });
}

/**
 * Encode each disc and lay out its files. `step` numbers progress across the
 * whole build. With `randomName`, audio is stored under random names and
 * linked up through sounds.json instead of sitting at the paths vanilla uses.
 */
export async function buildDiscs(
  pack: Pack,
  onProgress: (p: BuildProgress) => void,
  step: { offset: number; total: number },
  randomName: (() => string) | null = null,
): Promise<DiscFiles> {
  const version = getVersion(pack.versionId);
  const rp: PackEntry[] = [];
  const dp: PackEntry[] = [];
  const sounds: Record<string, Record<string, unknown>> = {};
  const customSongs: CustomSong[] = [];
  let encodedCount = 0;
  let reusedCount = 0;

  for (const [i, t] of pack.tracks.entries()) {
    const label = trackLabel(t);
    const current = step.offset + i;
    let encoded = await loadEncoded(pack.id, t.key);
    if (encoded && encoded.fingerprint === fingerprint(t)) {
      reusedCount++;
      onProgress({ current, total: step.total, message: `${label}: unchanged` });
    } else {
      onProgress({ current, total: step.total, message: `Converting ${label}` });
      const wasm = await loadMcPackWasm();
      const file = await loadBlob(t.audioId);
      if (!file) throw new Error(`${label}: the audio file is missing, add it again`);
      const decoded = wasm.decode_audio(new Uint8Array(await file.arrayBuffer()), {
        mono: t.settings.mono,
        target_sample_rate: 44100,
        trim_start_sec: t.settings.trimStart,
        trim_end_sec: t.settings.trimEnd,
        gain: Math.pow(10, t.settings.gainDb / 20),
        fade_in_sec: t.settings.fadeInSec,
        fade_out_sec: t.settings.fadeOutSec,
      }) as { channels: Float32Array[]; sampleRate: number; durationSec: number };
      const ogg = await encodePlanarToOgg(decoded.channels, decoded.sampleRate, {
        quality: t.settings.quality,
      });
      encoded = { fingerprint: fingerprint(t), ogg, durationSec: decoded.durationSec };
      await saveEncoded(pack.id, t.key, encoded);
      encodedCount++;
    }

    if (t.kind === 'vanilla') {
      if (!randomName) {
        rp.push({ path: soundFile('minecraft', `records/${t.discId}`), bytes: encoded.ogg });
        continue;
      }
      const name = randomName();
      rp.push({ path: soundFile('minecraft', name), bytes: encoded.ogg });
      // `replace` drops vanilla's own entry for the event, so only ours plays.
      (sounds.minecraft ??= {})[`music_disc.${t.discId}`] = {
        replace: true,
        sounds: [{ name: `minecraft:${name}`, stream: true }],
      };
      continue;
    }

    const name = randomName ? randomName() : `records/${t.id}`;
    rp.push({ path: soundFile(t.namespace, name), bytes: encoded.ogg });
    (sounds[t.namespace] ??= {})[`music_disc.${t.id}`] = {
      sounds: [{ name: `${t.namespace}:${name}`, stream: true }],
    };
    const songId = `${t.namespace}:${t.id}`;
    dp.push({
      path: `data/${t.namespace}/jukebox_song/${t.id}.json`,
      bytes: json({
        sound_event: `${t.namespace}:music_disc.${t.id}`,
        description: { text: t.displayName },
        length_in_seconds: Math.max(1, Math.round(encoded.durationSec * 10) / 10),
        // Comparators read 1–15 from a playing jukebox; spread them so discs are distinguishable.
        comparator_output: (customSongs.length % 15) + 1,
      }),
    });
    customSongs.push({ label, songId, give: giveCommand(version, songId) });
  }

  for (const [ns, obj] of Object.entries(sounds)) {
    rp.push({ path: `assets/${ns}/sounds.json`, bytes: json(obj) });
  }

  return { rp, dp, encodedCount, reusedCount, customSongs };
}

export function discManifest(tracks: Track[]): DiscManifestEntry[] {
  return tracks.map((t) =>
    t.kind === 'vanilla'
      ? { kind: 'vanilla', discId: t.discId, fileName: t.fileName }
      : { kind: 'custom', namespace: t.namespace, id: t.id, displayName: t.displayName, fileName: t.fileName },
  );
}

const json = (v: unknown) => new TextEncoder().encode(JSON.stringify(v, null, 2));
