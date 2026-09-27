// Optional pack protection: makes a built pack harder to pick apart and reuse,
// using only changes Minecraft reads exactly like an ordinary pack. The zip
// itself stays a standard zip. This deters casual copying; it can't stop
// someone determined, since the game has to be able to read everything.
import { supportsDataRegistries, type McRelease } from '@/lib/minecraft';
import type { PackEntry } from './build';
import { stripPngMetadata } from './png';

export type ProtectionId = 'manifest' | 'json' | 'png' | 'vanilla-disc-names' | 'custom-names';

export interface Protection {
  id: ProtectionId;
  label: string;
}

export interface ProtectionPlan {
  /** What protection does for this version. */
  applied: Protection[];
  /** What it can't do for this version, and why. */
  limits: string[];
}

/** Which protections a pack for `version` gets. */
export function protectionsFor(version: McRelease): ProtectionPlan {
  const applied: Protection[] = [
    { id: 'manifest', label: 'Leaves out the file that lets this site reopen the pack with its original file names' },
    { id: 'json', label: 'Minifies every JSON file' },
    { id: 'png', label: 'Strips metadata (text, timestamps, EXIF, colour profiles) from every PNG' },
    // Disc sound events have been `music_disc.<id>` since 1.13, before any version we build for.
    { id: 'vanilla-disc-names', label: 'Stores disc audio under random file names, linked up through sounds.json' },
  ];
  const limits = ['Replaced vanilla painting textures keep their names, since the game looks them up by name.'];
  if (supportsDataRegistries(version)) {
    applied.push({ id: 'custom-names', label: 'Gives new discs and new paintings random asset names' });
  } else {
    limits.push(`New discs and paintings need 1.21 or newer, so on ${version.id} there are none to rename.`);
  }
  return { applied, limits };
}

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

/** A letter first, so names never look like numbers. */
function nameFromBytes(bytes: Uint8Array): string {
  let name = ALPHABET[bytes[0]! % 26]!;
  for (let i = 1; i < bytes.length; i++) name += ALPHABET[bytes[i]! % ALPHABET.length];
  return name;
}

/** Makes random resource names: lowercase letters and digits, unique per namer. */
export function createNamer(random: (n: number) => Uint8Array = randomBytes): () => string {
  const used = new Set<string>();
  return () => {
    for (;;) {
      const name = nameFromBytes(random(12));
      if (!used.has(name)) {
        used.add(name);
        return name;
      }
    }
  };
}

const randomBytes = (n: number) => crypto.getRandomValues(new Uint8Array(n));

/**
 * A name that looks like a `createNamer` one but is the same on every build:
 * a hash of `seed` (kept out of the pack) and `key`. Rebuilding a pack then
 * keeps its file names, so an updated resource pack still matches a datapack
 * players already have.
 */
export async function stableName(seed: string, key: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${seed}\0${key}`));
  return nameFromBytes(new Uint8Array(digest).subarray(0, 12));
}

/** Minify JSON and strip PNG metadata. Files that don't parse are left alone. */
export function protectEntries(entries: PackEntry[]): PackEntry[] {
  return entries.map((e) => {
    if (/\.(json|mcmeta)$/.test(e.path)) return { ...e, bytes: minifyJson(e.bytes) };
    if (e.path.endsWith('.png')) return { ...e, bytes: stripPngMetadata(e.bytes) };
    return e;
  });
}

export function minifyJson(bytes: Uint8Array): Uint8Array {
  try {
    return new TextEncoder().encode(JSON.stringify(JSON.parse(new TextDecoder().decode(bytes))));
  } catch {
    return bytes;
  }
}
