// Browser persistence for painting projects, via IndexedDB:
//   projects  Project JSON, keyed by project id
//   blobs     source images and pack icons, keyed by image id
import { fromStoredFile, openKeyValueDb, toStoredFile, type StoredFile } from '@/lib/idb';
import type { Project } from './project';

export { requestPersistence } from '@/lib/idb';

const { get, getAll, put, del } = openKeyValueDb('mellow-llama-mc-paintings', 1, ['projects', 'blobs']);

export const saveProject = (p: Project) => put('projects', p.id, p);
export const loadProject = (id: string) => get<Project>('projects', id);

export async function listProjects(): Promise<Project[]> {
  const all = await getAll<Project>('projects');
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function deleteProject(p: Project): Promise<void> {
  await del('projects', p.id);
  await Promise.all([
    ...p.art.map((a) => del('blobs', a.imageId)),
    ...(p.iconId ? [del('blobs', p.iconId)] : []),
  ]);
}

export const saveBlob = (id: string, file: File) => put('blobs', id, toStoredFile(file));

export const loadBlob = async (id: string) => fromStoredFile(await get<StoredFile>('blobs', id));

export const deleteBlob = (id: string) => del('blobs', id);
