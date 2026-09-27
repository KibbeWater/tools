// Helpers for the pack tests: PNG and WAV fixtures, and an in-memory stand-in
// for the IndexedDB storage module.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

// ---------- PNG ----------

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** A PNG chunk with a correct CRC. */
export function chunk(type: string, data: Uint8Array = new Uint8Array()): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  const typeAndData = new Uint8Array(4 + data.length);
  typeAndData.set([...type].map((c) => c.charCodeAt(0)));
  typeAndData.set(data, 4);
  out.set(typeAndData, 4);
  view.setUint32(8 + data.length, crc32(typeAndData));
  return out;
}

export interface PngChunk {
  type: string;
  crcOk: boolean;
}

/** Every chunk in a PNG, in order, with whether its CRC checks out. */
export function pngChunks(bytes: Uint8Array): PngChunk[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const out: PngChunk[] = [];
  let pos = 8;
  while (pos + 12 <= bytes.length) {
    const len = view.getUint32(pos);
    const type = String.fromCharCode(...bytes.subarray(pos + 4, pos + 8));
    const crc = view.getUint32(pos + 8 + len);
    out.push({ type, crcOk: crc32(bytes.subarray(pos + 4, pos + 8 + len)) === crc });
    pos += 12 + len;
    if (type === 'IEND') break;
  }
  return out;
}

/** Insert chunks right after IHDR, and optionally append junk after IEND. */
export function withExtraChunks(png: Uint8Array, extra: Uint8Array[], trailer?: Uint8Array): Uint8Array {
  const ihdrEnd = 8 + 12 + 13;
  const parts = [png.subarray(0, ihdrEnd), ...extra, png.subarray(ihdrEnd), ...(trailer ? [trailer] : [])];
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

/** An RGBA gradient PNG with some transparent pixels. */
export function makePng(width: number, height: number): Uint8Array {
  const png = new PNG({ width, height });
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      png.data[i] = (x * 37) & 255;
      png.data[i + 1] = (y * 53) & 255;
      png.data[i + 2] = (x * y) & 255;
      png.data[i + 3] = (x + y) % 5 === 0 ? 0 : 255;
    }
  }
  return new Uint8Array(PNG.sync.write(png));
}

export const textChunk = (key: string, value: string) => chunk('tEXt', new TextEncoder().encode(`${key}\0${value}`));

/** A PNG with the kind of metadata an image editor or camera leaves behind. */
export function makePngWithMetadata(width: number, height: number): Uint8Array {
  return withExtraChunks(makePng(width, height), [
    textChunk('Author', 'Jane Private'),
    textChunk('Software', 'Photo Editor 9'),
    chunk('tIME', new Uint8Array([0x07, 0xea, 9, 27, 12, 0, 0])),
    chunk('gAMA', new Uint8Array([0, 0, 0xb1, 0x8f])),
    chunk('pHYs', new Uint8Array([0, 0, 0x0b, 0x13, 0, 0, 0x0b, 0x13, 1])),
  ]);
}

/** Decoded pixels as 8-bit RGBA, for comparing images regardless of encoding. */
export function decodeRgba(bytes: Uint8Array): { width: number; height: number; data: Uint8Array } {
  const png = PNG.sync.read(Buffer.from(bytes));
  return { width: png.width, height: png.height, data: new Uint8Array(png.data) };
}

export const fixture = (name: string) =>
  new Uint8Array(readFileSync(fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url))));

// ---------- WAV ----------

/** A short 16-bit PCM sine tone. */
export function makeWav(seconds = 0.4, sampleRate = 22050, channels = 2, freq = 440): Uint8Array {
  const frames = Math.round(seconds * sampleRate);
  const dataLen = frames * channels * 2;
  const buf = new ArrayBuffer(44 + dataLen);
  const v = new DataView(buf);
  const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF');
  v.setUint32(4, 36 + dataLen, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, channels, true);
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * channels * 2, true);
  v.setUint16(32, channels * 2, true);
  v.setUint16(34, 16, true);
  str(36, 'data');
  v.setUint32(40, dataLen, true);
  for (let i = 0; i < frames; i++) {
    const s = Math.round(Math.sin((2 * Math.PI * freq * i) / sampleRate) * 12000);
    for (let c = 0; c < channels; c++) v.setInt16(44 + (i * channels + c) * 2, s, true);
  }
  return new Uint8Array(buf);
}

// ---------- storage ----------

/** A drop-in for `lib/storage` that keeps everything in Maps. */
export function memoryStorage() {
  const stores = { projects: new Map<string, unknown>(), blobs: new Map<string, File>(), encoded: new Map<string, unknown>() };
  return {
    stores,
    module: {
      requestPersistence: () => {},
      savePack: async (p: { id: string }) => void stores.projects.set(p.id, structuredClone(p)),
      loadPack: async (id: string) => stores.projects.get(id),
      listPacks: async () => [...stores.projects.values()],
      deletePack: async (p: { id: string }) => void stores.projects.delete(p.id),
      saveBlob: async (id: string, file: File) => void stores.blobs.set(id, file),
      loadBlob: async (id: string) => stores.blobs.get(id),
      deleteBlob: async (id: string) => void stores.blobs.delete(id),
      loadEncoded: async (packId: string, key: string) => stores.encoded.get(`${packId}:${key}`),
      saveEncoded: async (packId: string, key: string, e: unknown) => void stores.encoded.set(`${packId}:${key}`, e),
      deleteEncoded: async (packId: string, key: string) => void stores.encoded.delete(`${packId}:${key}`),
    },
  };
}
