// Builds a project into a resource pack zip (plus a datapack zip when it has
// custom discs). Encodes are cached per track, so rebuilding after a small
// change only re-encodes the tracks that changed.
import { loadMcPackWasm } from '../hooks/useMcPackWasm';
import { encodePlanarToOgg } from './audio-encoder';
import { getVersion, giveCommand, packMeta, type McVersion } from './discs';
import { duplicateCustomIds, trackLabel, trackProblem, type Project, type Track } from './project';
import { loadBlob, loadEncoded, saveEncoded } from './storage';

export interface BuildProgress {
  current: number;
  total: number;
  message: string;
}

export interface CustomSong {
  label: string;
  songId: string;
  give: string;
}

export interface BuildResult {
  resourcePack: Blob;
  /** Only present when the project has custom discs. */
  datapack: Blob | null;
  encodedCount: number;
  reusedCount: number;
  customSongs: CustomSong[];
}

/** Written into every resource pack so the tool can reopen it later. */
export const MANIFEST_PATH = 'mellow-llama.json';

export interface PackManifest {
  version: 1;
  name: string;
  versionId: string;
  tracks: (
    | { kind: 'vanilla'; discId: string; fileName: string }
    | { kind: 'custom'; namespace: string; id: string; displayName: string; fileName: string }
  )[];
}

type ProgressCb = (p: BuildProgress) => void;

export const vanillaSoundPath = (discId: string) => `assets/minecraft/sounds/records/${discId}.ogg`;
export const customSoundPath = (ns: string, id: string) => `assets/${ns}/sounds/records/${id}.ogg`;

/**
 * Bump when the decode/encode output changes, so encodes cached by an older
 * version of the tool are redone instead of reused.
 */
const ENCODER_REVISION = 2;

const fingerprint = (t: Track) => `r${ENCODER_REVISION}|${t.audioId}|${JSON.stringify(t.settings)}`;

export async function buildPack(project: Project, onProgress: ProgressCb = () => {}): Promise<BuildResult> {
  const version = getVersion(project.versionId);
  const dupes = duplicateCustomIds(project.tracks);
  const problems = project.tracks
    .map((t) => {
      const p = trackProblem(t, version);
      if (p) return `${trackLabel(t)}: ${p}`;
      if (t.kind === 'custom' && dupes.has(`${t.namespace}:${t.id}`)) {
        return `${trackLabel(t)}: ${t.namespace}:${t.id} is used by another disc`;
      }
      return null;
    })
    .filter(Boolean);
  if (problems.length) throw new Error(problems.join('; '));
  if (project.tracks.length === 0) throw new Error('Add at least one disc first');

  const wasm = await loadMcPackWasm();
  const total = project.tracks.length;
  const rp: Entry[] = [];
  const dp: Entry[] = [];
  const sounds: Record<string, Record<string, unknown>> = {};
  const customSongs: CustomSong[] = [];
  let encodedCount = 0;
  let reusedCount = 0;

  for (const [i, t] of project.tracks.entries()) {
    const label = trackLabel(t);
    let encoded = await loadEncoded(project.id, t.key);
    if (encoded && encoded.fingerprint === fingerprint(t)) {
      reusedCount++;
      onProgress({ current: i, total, message: `${label}: unchanged` });
    } else {
      onProgress({ current: i, total, message: `Converting ${label}` });
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
      await saveEncoded(project.id, t.key, encoded);
      encodedCount++;
    }

    if (t.kind === 'vanilla') {
      rp.push({ path: vanillaSoundPath(t.discId), bytes: encoded.ogg });
      continue;
    }

    rp.push({ path: customSoundPath(t.namespace, t.id), bytes: encoded.ogg });
    (sounds[t.namespace] ??= {})[`music_disc.${t.id}`] = {
      sounds: [{ name: `${t.namespace}:records/${t.id}`, stream: true }],
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

  onProgress({ current: total, total, message: 'Zipping' });

  for (const [ns, obj] of Object.entries(sounds)) {
    rp.push({ path: `assets/${ns}/sounds.json`, bytes: json(obj) });
  }
  const icon = project.iconId ? await loadBlob(project.iconId) : undefined;
  const iconBytes = icon ? new Uint8Array(await icon.arrayBuffer()) : null;

  rp.push({ path: 'pack.mcmeta', bytes: json({ pack: packMeta(version.resourceFormat, project.description) }) });
  rp.push({ path: MANIFEST_PATH, bytes: json(manifestFor(project)) });
  if (iconBytes) rp.push({ path: 'pack.png', bytes: iconBytes });

  let datapack: Blob | null = null;
  if (dp.length) {
    dp.push({ path: 'pack.mcmeta', bytes: json({ pack: packMeta(dataFormatOf(version), project.description) }) });
    if (iconBytes) dp.push({ path: 'pack.png', bytes: iconBytes });
    datapack = zip(wasm, dp);
  }

  return {
    resourcePack: zip(wasm, rp),
    datapack,
    encodedCount,
    reusedCount,
    customSongs,
  };
}

function manifestFor(p: Project): PackManifest {
  return {
    version: 1,
    name: p.name,
    versionId: p.versionId,
    tracks: p.tracks.map((t) =>
      t.kind === 'vanilla'
        ? { kind: 'vanilla', discId: t.discId, fileName: t.fileName }
        : { kind: 'custom', namespace: t.namespace, id: t.id, displayName: t.displayName, fileName: t.fileName },
    ),
  };
}

function dataFormatOf(v: McVersion) {
  if (v.dataFormat === undefined) throw new Error(`Minecraft ${v.id} has no custom disc support`);
  return v.dataFormat;
}

interface Entry {
  path: string;
  bytes: Uint8Array;
}

function zip(wasm: Awaited<ReturnType<typeof loadMcPackWasm>>, entries: Entry[]): Blob {
  const bytes = wasm.build_zip(
    entries.map((e) => e.path),
    entries.map((e) => e.bytes),
  );
  return new Blob([bytes as BlobPart], { type: 'application/zip' });
}

const json = (v: unknown) => new TextEncoder().encode(JSON.stringify(v, null, 2));

/** A file name that's safe on every OS, from a pack name. */
export const safeFileName = (name: string, fallback: string) =>
  name.replace(/[^a-z0-9_\- ]+/gi, '').trim() || fallback;

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5_000);
}
