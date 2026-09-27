// Strip a PNG down to the chunks that affect how it's drawn. Text, timestamps,
// EXIF, colour profiles and the like can say who made an image and with what,
// and Minecraft's decoder (stb_image) ignores them anyway.

const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/**
 * Ancillary chunks worth keeping. `tRNS` holds transparency for palette and
 * grey/RGB images without alpha, so dropping it would change the picture.
 * Critical chunks (IHDR, PLTE, IDAT, IEND, …) are always kept.
 */
const KEEP_ANCILLARY = new Set(['tRNS']);

export const isPng = (bytes: Uint8Array) => bytes.length >= 8 && SIGNATURE.every((b, i) => bytes[i] === b);

/**
 * The same PNG without metadata chunks. Chunks are copied byte for byte, so
 * their CRCs stay valid. Anything that doesn't parse as a PNG comes back as is.
 */
export function stripPngMetadata(bytes: Uint8Array): Uint8Array {
  if (!isPng(bytes)) return bytes;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const keep: [number, number][] = [];
  let pos = 8;
  let sawEnd = false;
  while (pos + 12 <= bytes.length) {
    const length = view.getUint32(pos);
    const end = pos + 12 + length;
    if (end > bytes.length) return bytes; // truncated; leave it alone
    const type = String.fromCharCode(bytes[pos + 4]!, bytes[pos + 5]!, bytes[pos + 6]!, bytes[pos + 7]!);
    // Bit 5 of the first byte (lowercase) marks a chunk as ancillary.
    const critical = (bytes[pos + 4]! & 0x20) === 0;
    if (critical || KEEP_ANCILLARY.has(type)) keep.push([pos, end]);
    pos = end;
    if (type === 'IEND') {
      sawEnd = true;
      break;
    }
  }
  if (!sawEnd) return bytes;

  const size = 8 + keep.reduce((n, [a, b]) => n + (b - a), 0);
  if (size === bytes.length) return bytes; // nothing to strip
  // Build a fresh file; this also drops anything tacked on after IEND.
  const out = new Uint8Array(size);
  out.set(bytes.subarray(0, 8));
  let at = 8;
  for (const [a, b] of keep) {
    out.set(bytes.subarray(a, b), at);
    at += b - a;
  }
  return out;
}

/** Pixel dimensions from the IHDR, or `undefined` if this isn't a PNG. */
export function pngSize(bytes: Uint8Array): { width: number; height: number } | undefined {
  if (!isPng(bytes) || bytes.length < 24) return undefined;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}
