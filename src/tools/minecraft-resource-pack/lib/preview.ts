// In-browser preview that approximates what the build will produce: the same
// trim, gain, fades and mono downmix, applied live with Web Audio.
import type { AudioSettings } from './project';

let ctx: AudioContext | null = null;
const audioContext = () => (ctx ??= new AudioContext());

const buffers = new Map<string, Promise<AudioBuffer>>();

/** Decode (once per audio id) with the browser's own decoder. */
export function decodeForPreview(audioId: string, file: File): Promise<AudioBuffer> {
  let p = buffers.get(audioId);
  if (!p) {
    p = file.arrayBuffer().then((b) => audioContext().decodeAudioData(b));
    p.catch(() => buffers.delete(audioId));
    buffers.set(audioId, p);
  }
  return p;
}

/** Peak per bucket across all channels, scaled so the loudest bucket is 1. */
export function peaks(buffer: AudioBuffer, buckets: number): Float32Array {
  const out = new Float32Array(buckets);
  const size = Math.max(1, Math.floor(buffer.length / buckets));
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const data = buffer.getChannelData(c);
    for (let b = 0; b < buckets; b++) {
      let max = 0;
      const end = Math.min(data.length, (b + 1) * size);
      // Stride through long buckets; exact peaks don't matter for a thumbnail.
      const step = Math.max(1, Math.floor(size / 256));
      for (let i = b * size; i < end; i += step) {
        const v = Math.abs(data[i]!);
        if (v > max) max = v;
      }
      if (max > out[b]!) out[b] = max;
    }
  }
  // Quiet recordings would draw as a flat line; normalise so the shape shows.
  let loudest = 0;
  for (const v of out) if (v > loudest) loudest = v;
  if (loudest > 0) for (let b = 0; b < buckets; b++) out[b]! /= loudest;
  return out;
}

export interface Playback {
  stop: () => void;
  /** Seconds into the trimmed clip. */
  position: () => number;
  duration: number;
  ended: Promise<void>;
}

let current: Playback | null = null;

/** Play `buffer` as the build would render it. Stops any other preview first. */
export function play(buffer: AudioBuffer, s: AudioSettings, fromSec = 0): Playback {
  current?.stop();
  const ac = audioContext();
  void ac.resume();

  const start = Math.min(s.trimStart, buffer.duration);
  const end = s.trimEnd > 0 ? Math.min(s.trimEnd, buffer.duration) : buffer.duration;
  const duration = Math.max(0, end - start);
  const offset = Math.min(Math.max(0, fromSec), duration);

  const src = ac.createBufferSource();
  src.buffer = buffer;
  const gain = ac.createGain();
  if (s.mono) {
    // Forcing one channel makes Web Audio downmix, like the build's mono option.
    gain.channelCount = 1;
    gain.channelCountMode = 'explicit';
    gain.channelInterpretation = 'speakers';
  }

  // Automate gain to match the build's linear fades. The curve is laid out in
  // clip time; `t0` is where clip time 0 would have been.
  const g = Math.pow(10, s.gainDb / 20);
  const now = ac.currentTime;
  const t0 = now - offset;
  const at = (clipSec: number) => Math.max(now, t0 + clipSec);
  const level = (clipSec: number) => {
    let v = g;
    if (s.fadeInSec > 0 && clipSec < s.fadeInSec) v *= clipSec / s.fadeInSec;
    const fromEnd = duration - clipSec;
    if (s.fadeOutSec > 0 && fromEnd < s.fadeOutSec) v *= Math.max(0, fromEnd) / s.fadeOutSec;
    return v;
  };
  gain.gain.setValueAtTime(level(offset), now);
  if (s.fadeInSec > 0 && offset < s.fadeInSec) gain.gain.linearRampToValueAtTime(g, at(s.fadeInSec));
  const fadeOutStart = Math.max(0, duration - s.fadeOutSec);
  if (s.fadeOutSec > 0) {
    if (offset < fadeOutStart) gain.gain.setValueAtTime(level(fadeOutStart), at(fadeOutStart));
    gain.gain.linearRampToValueAtTime(0, at(duration));
  }

  src.connect(gain).connect(ac.destination);
  src.start(now, start + offset, duration - offset);

  let resolveEnded!: () => void;
  const ended = new Promise<void>((r) => (resolveEnded = r));
  src.onended = () => {
    if (current === playback) current = null;
    resolveEnded();
  };
  const playback: Playback = {
    duration,
    ended,
    position: () => Math.min(duration, ac.currentTime - t0),
    stop: () => {
      try {
        src.stop();
      } catch {
        // already stopped
      }
    },
  };
  current = playback;
  return playback;
}

export const stopPreview = () => current?.stop();
