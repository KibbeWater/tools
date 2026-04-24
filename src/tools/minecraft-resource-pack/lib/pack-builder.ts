// Orchestrates the full build: decode → encode → zip.
import { loadMcPackWasm } from '../hooks/useMcPackWasm';
import { encodePlanarToOgg } from './audio-encoder';
import type { DiscReplacement } from './state';
import type { McVersion } from './discs';

export interface BuildProgress {
  step: 'decoding' | 'encoding' | 'packing' | 'done';
  current: number;
  total: number;
  message: string;
}

export interface PackMetadata {
  name: string;
  description: string;
  iconFile?: File | null;
}

export interface BuildInput {
  version: McVersion;
  replacements: DiscReplacement[];
  metadata: PackMetadata;
}

export interface AdvancedDisc {
  namespace: string;
  id: string;
  displayName: string;
  source: File;
  mono: boolean;
  gain: number;
  quality: number;
}

export interface AdvancedBuildInput {
  version: McVersion;
  discs: AdvancedDisc[];
  metadata: PackMetadata;
  /**
   * 1.21+ ships native "jukebox_song" datapack entries. For older versions we
   * emit a `sounds.json`-only resource pack (no datapack) — users will need a
   * helper mod for item + loot registration, which is out of scope.
   */
  emitDatapack: boolean;
}

type ProgressCb = (p: BuildProgress) => void;

export async function buildVanillaPack(
  input: BuildInput,
  onProgress: ProgressCb = () => {},
): Promise<Blob> {
  const wasm = await loadMcPackWasm();
  const total = input.replacements.length;
  const entries: { path: string; bytes: Uint8Array }[] = [];

  for (let i = 0; i < input.replacements.length; i++) {
    const r = input.replacements[i]!;
    onProgress({
      step: 'decoding',
      current: i,
      total,
      message: `Decoding ${r.source.name}`,
    });
    const bytes = new Uint8Array(await r.source.arrayBuffer());
    const decoded = wasm.decode_audio(bytes, {
      mono: r.mono,
      target_sample_rate: 44100,
      trim_start_sec: r.trimStart,
      trim_end_sec: r.trimEnd,
      gain: dbToGain(r.gainDb),
      fade_in_sec: r.fadeInSec,
      fade_out_sec: r.fadeOutSec,
    }) as { channels: Float32Array[]; sampleRate: number; durationSec: number };

    onProgress({
      step: 'encoding',
      current: i,
      total,
      message: `Encoding ${r.disc.label} → ogg`,
    });

    const ogg = await encodePlanarToOgg(decoded.channels, decoded.sampleRate, {
      quality: r.quality,
    });

    entries.push({
      path: `assets/minecraft/sounds/records/${r.disc.id}.ogg`,
      bytes: ogg,
    });
  }

  entries.push({
    path: 'pack.mcmeta',
    bytes: textBytes(
      JSON.stringify(
        {
          pack: {
            pack_format: input.version.packFormat,
            description:
              input.metadata.description ||
              `${input.metadata.name} — custom music disc pack`,
          },
        },
        null,
        2,
      ),
    ),
  });

  if (input.metadata.iconFile) {
    entries.push({
      path: 'pack.png',
      bytes: new Uint8Array(await input.metadata.iconFile.arrayBuffer()),
    });
  }

  onProgress({
    step: 'packing',
    current: total,
    total,
    message: 'Building zip',
  });
  const zipBytes = wasm.build_zip({ entries }) as Uint8Array;
  onProgress({
    step: 'done',
    current: total,
    total,
    message: 'Pack ready',
  });

  return new Blob([zipBytes], { type: 'application/zip' });
}

export async function buildAdvancedPack(
  input: AdvancedBuildInput,
  onProgress: ProgressCb = () => {},
): Promise<Blob> {
  const wasm = await loadMcPackWasm();
  const total = input.discs.length;
  const entries: { path: string; bytes: Uint8Array }[] = [];

  // sounds.json for the resource pack side. Grouped per namespace.
  const soundsJsonByNamespace: Record<string, Record<string, unknown>> = {};

  for (let i = 0; i < input.discs.length; i++) {
    const d = input.discs[i]!;
    onProgress({
      step: 'decoding',
      current: i,
      total,
      message: `Decoding ${d.source.name}`,
    });
    const bytes = new Uint8Array(await d.source.arrayBuffer());
    const decoded = wasm.decode_audio(bytes, {
      mono: d.mono,
      target_sample_rate: 44100,
      gain: dbToGain(d.gain),
    }) as { channels: Float32Array[]; sampleRate: number; durationSec: number };

    onProgress({
      step: 'encoding',
      current: i,
      total,
      message: `Encoding ${d.displayName} → ogg`,
    });
    const ogg = await encodePlanarToOgg(decoded.channels, decoded.sampleRate, {
      quality: d.quality,
    });

    entries.push({
      path: `assets/${d.namespace}/sounds/${d.id}.ogg`,
      bytes: ogg,
    });

    const soundKey = `music_disc.${d.id}`;
    soundsJsonByNamespace[d.namespace] ??= {};
    soundsJsonByNamespace[d.namespace]![soundKey] = {
      category: 'record',
      sounds: [
        {
          name: `${d.namespace}:${d.id}`,
          stream: true,
        },
      ],
    };

    if (input.emitDatapack && input.version.packFormat >= 32) {
      entries.push({
        path: `data/${d.namespace}/jukebox_song/${d.id}.json`,
        bytes: textBytes(
          JSON.stringify(
            {
              sound_event: {
                sound_id: `${d.namespace}:music_disc.${d.id}`,
                range: 64,
              },
              description: { translate: d.displayName, fallback: d.displayName },
              length_in_seconds: Math.max(1, Math.round(decoded.durationSec)),
              comparator_output: 1,
            },
            null,
            2,
          ),
        ),
      });
    }
  }

  for (const [ns, obj] of Object.entries(soundsJsonByNamespace)) {
    entries.push({
      path: `assets/${ns}/sounds.json`,
      bytes: textBytes(JSON.stringify(obj, null, 2)),
    });
  }

  entries.push({
    path: 'pack.mcmeta',
    bytes: textBytes(
      JSON.stringify(
        {
          pack: {
            pack_format: input.version.packFormat,
            description:
              input.metadata.description ||
              `${input.metadata.name} — custom disc pack (advanced)`,
          },
        },
        null,
        2,
      ),
    ),
  });

  if (input.emitDatapack && input.version.packFormat >= 32) {
    // Datapack needs its own pack.mcmeta to be valid. We keep the combined
    // zip but split the metadata files across the subdirectories that MC
    // recognises.
    entries.push({
      path: 'data/pack.mcmeta',
      bytes: textBytes(
        JSON.stringify(
          {
            pack: {
              pack_format: input.version.packFormat,
              description: `${input.metadata.name} — datapack`,
            },
          },
          null,
          2,
        ),
      ),
    });
  }

  if (input.metadata.iconFile) {
    entries.push({
      path: 'pack.png',
      bytes: new Uint8Array(await input.metadata.iconFile.arrayBuffer()),
    });
  }

  onProgress({
    step: 'packing',
    current: total,
    total,
    message: 'Building zip',
  });
  const zipBytes = wasm.build_zip({ entries }) as Uint8Array;
  onProgress({
    step: 'done',
    current: total,
    total,
    message: 'Pack ready',
  });

  return new Blob([zipBytes], { type: 'application/zip' });
}

function textBytes(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

function dbToGain(db: number): number {
  return Math.pow(10, db / 20);
}

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
