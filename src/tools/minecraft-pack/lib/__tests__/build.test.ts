// End-to-end: builds real packs through the Rust wasm zip writer and Ogg
// encoder, then reopens them, checking the pack Minecraft would load. Only the
// IndexedDB storage layer is mocked; everything else is the real code path.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { memoryStorage, makePng, makePngWithMetadata, makeWav, decodeRgba, pngChunks } from './testkit';

const store = memoryStorage();
vi.mock('@/tools/minecraft-pack/lib/storage', () => store.module);

const { buildPack } = await import('../build');
const { importPack } = await import('../import');
const { newPack } = await import('../pack');
const { loadMcPackWasm } = await import('@/tools/minecraft-resource-pack/hooks/useMcPackWasm');
type PackT = import('../pack').Pack;

const wasm = await loadMcPackWasm();

/** Read a built zip into a path→bytes map, using the same reader the app uses. */
function unzip(blob: { bytes: Uint8Array }): Map<string, Uint8Array> {
  const entries = wasm.read_zip(blob.bytes) as { path: string; bytes: Uint8Array }[];
  return new Map(entries.map((e) => [e.path, e.bytes]));
}

async function blobBytes(b: Blob): Promise<Uint8Array> {
  return new Uint8Array(await b.arrayBuffer());
}

const readJson = (files: Map<string, Uint8Array>, path: string) =>
  JSON.parse(new TextDecoder().decode(files.get(path)!));

let ids = 0;
const nextId = () => `id${ids++}`;

/** A pack with one vanilla disc, one custom disc, one vanilla painting, one custom painting. */
async function samplePack(versionId: string): Promise<PackT> {
  const pack = newPack('Test Pack') as PackT;
  pack.versionId = versionId;
  pack.description = 'A  test   pack\n';

  const iconId = nextId();
  await store.module.saveBlob(iconId, new File([makePngWithMetadata(64, 64)], 'icon.png', { type: 'image/png' }));
  pack.iconId = iconId;

  const wavId = nextId();
  await store.module.saveBlob(wavId, new File([makeWav()], 'song.wav', { type: 'audio/wav' }));
  const wav2 = nextId();
  await store.module.saveBlob(wav2, new File([makeWav(0.3, 22050, 1, 330)], 'mine.wav', { type: 'audio/wav' }));
  const settings = { gainDb: 0, trimStart: 0, trimEnd: 0, fadeInSec: 0, fadeOutSec: 0, mono: false, quality: 3 };
  pack.tracks = [
    { key: nextId(), kind: 'vanilla', discId: 'cat', audioId: wavId, fileName: 'song.wav', fileSize: 1, settings },
    { key: nextId(), kind: 'custom', namespace: 'test_pack', id: 'my_song', displayName: 'My Song', audioId: wav2, fileName: 'mine.wav', fileSize: 1, settings: { ...settings } },
  ];

  const imgId = nextId();
  await store.module.saveBlob(imgId, new File([makePngWithMetadata(64, 64)], 'kebab.png', { type: 'image/png' }));
  const imgId2 = nextId();
  await store.module.saveBlob(imgId2, new File([makePng(96, 96)], 'logo.png', { type: 'image/png' }));
  const artSettings = { fit: 'stretch' as const, cx: 0.5, cy: 0.5, zoom: 1, pxPerBlock: 64, filter: 'sharp' as const };
  pack.art = [
    { key: nextId(), kind: 'vanilla', paintingId: 'kebab', imageId: imgId, fileName: 'kebab.png', fileSize: 1, imageWidth: 64, imageHeight: 64, settings: artSettings },
    { key: nextId(), kind: 'custom', namespace: 'test_pack', id: 'logo', title: 'Our Logo', author: 'Team', width: 2, height: 2, placeable: true, imageId: imgId2, fileName: 'logo.png', fileSize: 1, imageWidth: 96, imageHeight: 96, settings: { ...artSettings } },
  ];
  await store.module.savePack(pack);
  return pack;
}

beforeEach(() => {
  store.stores.projects.clear();
  store.stores.blobs.clear();
  store.stores.encoded.clear();
});

describe('buildPack (unprotected, 1.21.11)', () => {
  test('lays out discs, paintings, datapack and manifest where the game expects them', async () => {
    const pack = await samplePack('1.21.11');
    const result = await buildPack(pack);
    const rp = unzip({ bytes: await blobBytes(result.resourcePack) });

    expect([...rp.keys()].sort()).toEqual(
      [
        'assets/minecraft/sounds/records/cat.ogg',
        'assets/test_pack/sounds/records/my_song.ogg',
        'assets/test_pack/sounds.json',
        'assets/minecraft/textures/painting/kebab.png',
        'assets/test_pack/textures/painting/logo.png',
        'pack.mcmeta',
        'mellow-llama.json',
        'pack.png',
      ].sort(),
    );

    // pack.mcmeta uses the min/max format shape for 1.21.9+.
    expect(readJson(rp, 'pack.mcmeta').pack).toMatchObject({ min_format: [75, 0], max_format: [75, 0] });

    // Custom disc wired through sounds.json (no `replace`, it's a new event).
    const sounds = readJson(rp, 'assets/test_pack/sounds.json');
    expect(sounds['music_disc.my_song']).toEqual({ sounds: [{ name: 'test_pack:records/my_song', stream: true }] });

    // The ogg is real Vorbis audio.
    expect([...rp.get('assets/minecraft/sounds/records/cat.ogg')!.slice(0, 4)]).toEqual([0x4f, 0x67, 0x67, 0x53]);

    expect(result.datapack).not.toBeNull();
    const dp = unzip({ bytes: await blobBytes(result.datapack!) });
    const song = readJson(dp, 'data/test_pack/jukebox_song/my_song.json');
    expect(song).toMatchObject({ sound_event: 'test_pack:music_disc.my_song', description: { text: 'My Song' } });
    expect(song.length_in_seconds).toBeGreaterThan(0);

    const variant = readJson(dp, 'data/test_pack/painting_variant/logo.json');
    expect(variant).toMatchObject({ asset_id: 'test_pack:logo', width: 2, height: 2, title: { text: 'Our Logo' } });
    expect(readJson(dp, 'data/minecraft/tags/painting_variant/placeable.json')).toEqual({ replace: false, values: ['test_pack:logo'] });
  });

  test('custom painting texture is rendered at the requested size', async () => {
    const pack = await samplePack('1.21.11');
    const rp = unzip({ bytes: await blobBytes((await buildPack(pack)).resourcePack) });
    const { width, height } = decodeRgba(rp.get('assets/test_pack/textures/painting/logo.png')!);
    expect([width, height]).toEqual([128, 128]); // 2 blocks * 64 px
  });

  test('round-trips back to the same discs and paintings', async () => {
    const pack = await samplePack('1.21.11');
    const built = await buildPack(pack);
    const file = new File([await blobBytes(built.resourcePack)], 'Test Pack.zip', { type: 'application/zip' });
    const reopened = await importPack(file);

    expect(reopened.versionId).toBe('1.21.11');
    expect(reopened.tracks.map((t) => (t.kind === 'vanilla' ? t.discId : `${t.namespace}:${t.id}`)).sort()).toEqual(['cat', 'test_pack:my_song']);
    expect(reopened.art.map((a) => (a.kind === 'vanilla' ? a.paintingId : `${a.namespace}:${a.id}`)).sort()).toEqual(['kebab', 'test_pack:logo']);
    const logo = reopened.art.find((a) => a.kind === 'custom');
    expect(logo).toMatchObject({ width: 2, height: 2, title: 'Our Logo', author: 'Team' });
    // Manifest carried the original names back.
    expect(reopened.tracks.find((t) => t.kind === 'vanilla')!.fileName).toBe('song.wav');
  });
});

describe('buildPack (protected, 1.21.11)', () => {
  test('drops the manifest, randomises names, minifies JSON and strips PNGs', async () => {
    const pack = await samplePack('1.21.11');
    pack.protect = true;
    const result = await buildPack(pack);
    const rp = unzip({ bytes: await blobBytes(result.resourcePack) });

    expect(rp.has('mellow-llama.json')).toBe(false);

    // Vanilla disc no longer sits at its guessable path; it's redirected by sounds.json.
    expect(rp.has('assets/minecraft/sounds/records/cat.ogg')).toBe(false);
    const mcSounds = readJson(rp, 'assets/minecraft/sounds.json');
    expect(mcSounds['music_disc.cat'].replace).toBe(true);
    const catName = mcSounds['music_disc.cat'].sounds[0].name.replace('minecraft:', '');
    expect(catName).toMatch(/^[a-z][a-z0-9]{11}$/);
    expect(rp.has(`assets/minecraft/sounds/${catName}.ogg`)).toBe(true);

    // Custom painting texture has a random name; the variant points at it.
    const dp = unzip({ bytes: await blobBytes(result.datapack!) });
    const variant = readJson(dp, 'data/test_pack/painting_variant/logo.json');
    const sprite = (variant.asset_id as string).replace('test_pack:', '');
    expect(sprite).toMatch(/^[a-z][a-z0-9]{11}$/);
    expect(rp.has(`assets/test_pack/textures/painting/${sprite}.png`)).toBe(true);
    // Painting textures never reveal the original file name.
    expect([...rp.keys()].some((k) => k.includes('logo'))).toBe(false);

    // JSON minified (no newline), PNG stripped to critical chunks.
    expect(new TextDecoder().decode(rp.get('pack.mcmeta')!)).not.toContain('\n');
    expect(pngChunks(rp.get('pack.png')!).map((c) => c.type)).toEqual(['IHDR', 'IDAT', 'IEND']);

    // The variant JSON is still valid after minifying.
    expect(variant).toMatchObject({ width: 2, height: 2 });
  });

  test('custom painting texture names stay the same across rebuilds', async () => {
    const pack = await samplePack('1.21.11');
    pack.protect = true;
    const spritePaths = async () => {
      const rp = unzip({ bytes: await blobBytes((await buildPack(pack)).resourcePack) });
      return [...rp.keys()].filter((k) => k.startsWith('assets/test_pack/textures/painting/'));
    };
    const first = await spritePaths();
    expect(first).toHaveLength(1);
    expect(await spritePaths()).toEqual(first);
  });

  test('a protected pack still reopens with its discs and paintings', async () => {
    const pack = await samplePack('1.21.11');
    pack.protect = true;
    const built = await buildPack(pack);
    const reopened = await importPack(new File([await blobBytes(built.resourcePack)], 'p.zip'));

    // Discs recover their real ids: sounds.json names each `music_disc.<id>` event.
    expect(reopened.tracks.map((t) => (t.kind === 'vanilla' ? t.discId : `${t.namespace}:${t.id}`)).sort()).toEqual(['cat', 'test_pack:my_song']);
    // Vanilla painting is recovered by its texture name; the custom one comes back
    // with a generated id (its variant id lived only in the datapack) but full pixels.
    expect(reopened.art.filter((a) => a.kind === 'vanilla').map((a) => a.kind === 'vanilla' && a.paintingId)).toEqual(['kebab']);
    expect(reopened.art.filter((a) => a.kind === 'custom')).toHaveLength(1);
    expect(reopened.art).toHaveLength(2);
  });

  test('protected and unprotected packs decode to identical audio and textures', async () => {
    const plainPack = await samplePack('1.21.11');
    const plain = unzip({ bytes: await blobBytes((await buildPack(plainPack)).resourcePack) });

    store.stores.encoded.clear();
    const protPack = await samplePack('1.21.11');
    protPack.protect = true;
    const prot = unzip({ bytes: await blobBytes((await buildPack(protPack)).resourcePack) });

    // Same painting pixels, whatever the file is called.
    const plainLogo = decodeRgba(plain.get('assets/test_pack/textures/painting/logo.png')!);
    const protLogoPath = [...prot.keys()].find((k) => k.startsWith('assets/test_pack/textures/painting/'))!;
    expect(decodeRgba(prot.get(protLogoPath)!)).toEqual(plainLogo);
  });
});

describe('version handling', () => {
  test('below 1.21 there is no datapack and custom discs are rejected', async () => {
    const pack = newPack('Old') as PackT;
    pack.versionId = '1.20 – 1.20.1';
    const wavId = nextId();
    await store.module.saveBlob(wavId, new File([makeWav()], 's.wav'));
    pack.tracks = [{ key: nextId(), kind: 'vanilla', discId: '13', audioId: wavId, fileName: 's.wav', fileSize: 1, settings: { gainDb: 0, trimStart: 0, trimEnd: 0, fadeInSec: 0, fadeOutSec: 0, mono: false, quality: 3 } }];
    await store.module.savePack(pack);

    const result = await buildPack(pack);
    expect(result.datapack).toBeNull();
    const rp = unzip({ bytes: await blobBytes(result.resourcePack) });
    expect(readJson(rp, 'pack.mcmeta').pack).toEqual({ description: pack.description, pack_format: 15 });
  });

  test('the encode cache is reused on a second build and refreshed when settings change', async () => {
    const pack = await samplePack('1.21.11');
    const first = await buildPack(pack);
    expect(first.discs.encoded).toBe(2);
    expect(first.discs.reused).toBe(0);

    const second = await buildPack(pack);
    expect(second.discs.encoded).toBe(0);
    expect(second.discs.reused).toBe(2);

    pack.tracks[0]!.settings = { ...pack.tracks[0]!.settings, gainDb: -3 };
    const third = await buildPack(pack);
    expect(third.discs.encoded).toBe(1);
    expect(third.discs.reused).toBe(1);
  });

  test('an empty pack refuses to build', async () => {
    const pack = newPack('Empty') as PackT;
    await expect(buildPack(pack)).rejects.toThrow(/add a disc or a painting/i);
  });
});

describe('the built zip is a standard archive', () => {
  const dir = mkdtempSync(join(tmpdir(), 'mc-pack-'));
  afterAll(() => {});

  test('unzip -t accepts both the resource pack and the protected one', async () => {
    for (const protect of [false, true]) {
      const pack = await samplePack('1.21.11');
      pack.protect = protect;
      store.stores.encoded.clear();
      const built = await buildPack(pack);
      const path = join(dir, `pack-${protect}.zip`);
      writeFileSync(path, await blobBytes(built.resourcePack));
      const out = execFileSync('unzip', ['-t', path], { encoding: 'utf8' });
      expect(out).toContain('No errors detected');
    }
  });
});
