import { describe, expect, test } from 'vitest';
import { getRelease, MC_RELEASES } from '@/lib/minecraft';
import { createNamer, minifyJson, protectEntries, protectionsFor, stableName } from '../protection';
import { makePngWithMetadata, pngChunks } from './testkit';

const one = (id: string) => ({ from: getRelease(id), to: getRelease(id) });
const ids = (versionId: string) => protectionsFor(one(versionId)).applied.map((p) => p.id);

describe('protectionsFor', () => {
  test('before 1.21 there is nothing custom to rename', () => {
    for (const v of ['1.16 – 1.16.1', '1.18.x', '1.20.5 – 1.20.6']) {
      expect(ids(v)).toEqual(['manifest', 'json', 'png', 'vanilla-disc-names']);
      expect(protectionsFor(one(v)).limits.join(' ')).toContain('1.21');
    }
  });

  test('from 1.21 new discs and paintings get random names too', () => {
    for (const v of ['1.21 – 1.21.1', '1.21.4', '1.21.11', '26.3']) {
      expect(ids(v)).toContain('custom-names');
    }
  });

  test('covers every release we build for', () => {
    for (const r of MC_RELEASES) expect(ids(r.id)).toContain('vanilla-disc-names');
  });
});

describe('createNamer', () => {
  test('makes valid, unique resource names', () => {
    const next = createNamer();
    const names = Array.from({ length: 2000 }, next);
    expect(new Set(names).size).toBe(names.length);
    for (const n of names) expect(n).toMatch(/^[a-z][a-z0-9]{11}$/);
  });

  test('retries on a collision', () => {
    const seq = [0, 0, 1];
    const next = createNamer((n) => new Uint8Array(n).fill(seq.shift() ?? 2));
    const a = next();
    const b = next();
    expect(a).not.toBe(b);
  });
});

describe('stableName', () => {
  test('is the same for the same seed and key, and looks like a random name', async () => {
    const a = await stableName('pack-1', 'painting:ns:logo');
    expect(a).toMatch(/^[a-z][a-z0-9]{11}$/);
    expect(await stableName('pack-1', 'painting:ns:logo')).toBe(a);
  });

  test('changes with the seed or the key', async () => {
    const a = await stableName('pack-1', 'painting:ns:logo');
    expect(await stableName('pack-2', 'painting:ns:logo')).not.toBe(a);
    expect(await stableName('pack-1', 'painting:ns:other')).not.toBe(a);
  });
});

describe('protectEntries', () => {
  const enc = (s: string) => new TextEncoder().encode(s);
  const dec = (b: Uint8Array) => new TextDecoder().decode(b);

  test('minifies JSON and mcmeta without changing the data', () => {
    const value = { pack: { description: 'Hi  there\n', pack_format: 34 }, list: [1, 2, { a: null }] };
    const [meta, sounds] = protectEntries([
      { path: 'pack.mcmeta', bytes: enc(JSON.stringify(value, null, 2)) },
      { path: 'assets/x/sounds.json', bytes: enc(JSON.stringify(value, null, 4)) },
    ]);
    expect(dec(meta!.bytes)).toBe(JSON.stringify(value));
    expect(JSON.parse(dec(sounds!.bytes))).toEqual(value);
  });

  test('keeps non-ASCII text intact', () => {
    const out = minifyJson(enc('{ "text": "Ünïcødé ♪ 音楽" }'));
    expect(JSON.parse(dec(out)).text).toBe('Ünïcødé ♪ 音楽');
  });

  test('leaves broken JSON and other files alone', () => {
    const broken = enc('{ nope');
    const ogg = new Uint8Array([0x4f, 0x67, 0x67, 0x53, 1, 2, 3]);
    const [a, b] = protectEntries([
      { path: 'x.json', bytes: broken },
      { path: 'assets/minecraft/sounds/abc.ogg', bytes: ogg },
    ]);
    expect(a!.bytes).toBe(broken);
    expect(b!.bytes).toBe(ogg);
  });

  test('strips PNG metadata', () => {
    const [out] = protectEntries([{ path: 'pack.png', bytes: makePngWithMetadata(8, 8) }]);
    expect(pngChunks(out!.bytes).map((c) => c.type)).toEqual(['IHDR', 'IDAT', 'IEND']);
  });
});
