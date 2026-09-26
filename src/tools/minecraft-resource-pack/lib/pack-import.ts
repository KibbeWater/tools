// Turn an existing resource pack zip back into an editable project. Packs this
// tool built carry a manifest with disc names; any other music pack still
// imports, using the disc audio it finds under assets/*/sounds/records/.
import { loadMcPackWasm } from '../hooks/useMcPackWasm';
import { DISCS, MC_VERSIONS, LATEST_VERSION, type PackFormat } from './discs';
import {
  DEFAULT_SETTINGS,
  newProject,
  stripExtension,
  uid,
  type CustomTrack,
  type Project,
  type Track,
  type VanillaTrack,
} from './project';
import { MANIFEST_PATH, type PackManifest } from './pack-builder';
import { saveBlob } from './storage';

interface ZipEntry {
  path: string;
  bytes: Uint8Array;
}

export async function importPack(zipFile: File): Promise<Project> {
  const wasm = await loadMcPackWasm();
  let entries: ZipEntry[];
  try {
    entries = wasm.read_zip(new Uint8Array(await zipFile.arrayBuffer())) as ZipEntry[];
  } catch {
    throw new Error(`${zipFile.name} isn't a zip file`);
  }
  // Packs are sometimes zipped with a top-level folder; strip it if pack.mcmeta lives there.
  const meta = entries.find((e) => /^([^/]+\/)?pack\.mcmeta$/.test(e.path));
  if (!meta) throw new Error(`${zipFile.name} has no pack.mcmeta, so it isn't a resource pack`);
  const prefix = meta.path.slice(0, -'pack.mcmeta'.length);
  const files = new Map(
    entries.filter((e) => e.path.startsWith(prefix)).map((e) => [e.path.slice(prefix.length), e.bytes]),
  );

  const mcmeta = parseJson(files.get('pack.mcmeta'))?.pack ?? {};
  const manifest = parseJson(files.get(MANIFEST_PATH)) as PackManifest | undefined;

  const project = newProject(manifest?.name ?? stripExtension(zipFile.name));
  project.description = typeof mcmeta.description === 'string' ? mcmeta.description : project.description;
  project.versionId = manifest?.versionId ?? versionForFormat(mcmeta).id;

  const icon = files.get('pack.png');
  if (icon) {
    project.iconId = uid();
    await saveBlob(project.iconId, new File([icon as BlobPart], 'pack.png', { type: 'image/png' }));
  }

  const addTrack = async (bytes: Uint8Array, fileName: string, base: TrackIdentity) => {
    const audioId = uid();
    await saveBlob(audioId, new File([bytes as BlobPart], fileName, { type: 'audio/ogg' }));
    project.tracks.push({
      ...base,
      key: uid(),
      audioId,
      fileName,
      fileSize: bytes.byteLength,
      // The audio in a built pack is already trimmed and faded; start from neutral settings.
      settings: { ...DEFAULT_SETTINGS },
    } as Track);
  };

  for (const [path, bytes] of files) {
    const vanilla = path.match(/^assets\/minecraft\/sounds\/records\/([a-z0-9_]+)\.ogg$/);
    if (vanilla && DISCS.some((d) => d.id === vanilla[1])) {
      const discId = vanilla[1]!;
      const m = manifest?.tracks.find((t) => t.kind === 'vanilla' && t.discId === discId);
      await addTrack(bytes, m?.fileName ?? `${discId}.ogg`, { kind: 'vanilla', discId });
      continue;
    }
    const custom = path.match(/^assets\/([a-z0-9_.-]+)\/sounds\/records\/([a-z0-9_]+)\.ogg$/);
    if (custom && custom[1] !== 'minecraft') {
      const [, namespace, id] = custom as unknown as [string, string, string];
      const m = manifest?.tracks.find((t) => t.kind === 'custom' && t.namespace === namespace && t.id === id);
      await addTrack(bytes, m?.fileName ?? `${id}.ogg`, {
        kind: 'custom',
        namespace,
        id,
        displayName: m && m.kind === 'custom' ? m.displayName : id.replace(/_/g, ' '),
      });
    }
  }

  if (project.tracks.length === 0) {
    throw new Error(`${zipFile.name} doesn't contain any music disc audio`);
  }
  // Keep the in-game disc order rather than zip order.
  const order = (t: Track) => (t.kind === 'vanilla' ? DISCS.findIndex((d) => d.id === t.discId) : 1000);
  project.tracks.sort((a, b) => order(a) - order(b));
  return project;
}

type TrackCommon = 'key' | 'audioId' | 'fileName' | 'fileSize' | 'durationSec' | 'settings';
/** What identifies a track, per kind (Omit over the union would merge the kinds). */
type TrackIdentity = Omit<VanillaTrack, TrackCommon> | Omit<CustomTrack, TrackCommon>;

function parseJson(bytes: Uint8Array | undefined): any {
  if (!bytes) return undefined;
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return undefined;
  }
}

/** Newest version whose resource format matches the pack's, else the latest. */
function versionForFormat(pack: { pack_format?: number; min_format?: PackFormat; max_format?: PackFormat }) {
  const major = (f: PackFormat | undefined) => (Array.isArray(f) ? f[0] : f);
  const want = major(pack.max_format) ?? pack.pack_format;
  const match = [...MC_VERSIONS].reverse().find((v) => major(v.resourceFormat) === want);
  return match ?? LATEST_VERSION;
}
