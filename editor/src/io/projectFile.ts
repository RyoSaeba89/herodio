// Fichier projet .herodio : archive ZIP contenant project.json et les sons d'origine (media/).
import { strFromU8, strToU8, unzipSync, zipSync, type Zippable } from 'fflate';
import type { Project } from '../model/project';
import { getBlob, putBlob } from '../audio/media';

export const PROJECT_VERSION = 1;
export const PROJECT_FILTER = { name: 'Histoire Herodio', extensions: ['herodio'] };

export async function packProject(p: Project): Promise<Uint8Array> {
  const files: Zippable = { 'project.json': [strToU8(JSON.stringify(p, null, 1)), { level: 6 }] };
  for (const m of p.media) {
    const b = getBlob(m.id);
    if (b) files[`media/${m.id}.${m.ext}`] = [new Uint8Array(await b.arrayBuffer()), { level: 0 }];
  }
  return zipSync(files);
}

/** Met à niveau un project.json d'une version antérieure. */
export function migrate(raw: any): Project {
  if (raw?.format !== 'herodio-project') throw new Error('Ce fichier n’est pas une histoire Herodio.');
  const v = raw.version ?? 1;
  if (v > PROJECT_VERSION) throw new Error('Cette histoire a été créée avec une version plus récente d’Herodio. Mets à jour le logiciel.');
  // v1 : version actuelle. Les futures migrations s'ajoutent ici : if (v < 2) { ...; raw.version = 2 }
  raw.items ??= [];
  raw.variables ??= [];
  raw.media ??= [];
  raw.level ??= 'decouverte';
  return raw as Project;
}

/** Lit une archive .herodio ; les sons sont rangés dans le stockage local. */
export async function unpackProject(bytes: Uint8Array): Promise<Project> {
  let files: Record<string, Uint8Array>;
  try { files = unzipSync(bytes); } catch { throw new Error('Le fichier est abîmé ou n’est pas une histoire Herodio.'); }
  if (!files['project.json']) throw new Error('Le fichier ne contient pas de project.json.');
  const p = migrate(JSON.parse(strFromU8(files['project.json'])));
  for (const m of p.media) {
    const data = files[`media/${m.id}.${m.ext}`];
    if (data) await putBlob(m.id, new Blob([data as Uint8Array<ArrayBuffer>], { type: mimeOf(m.ext) }));
  }
  return p;
}

export const mimeOf = (ext: string) =>
  ({ wav: 'audio/wav', mp3: 'audio/mpeg', ogg: 'audio/ogg', webm: 'audio/webm', flac: 'audio/flac', m4a: 'audio/mp4' } as Record<string, string>)[ext] ?? 'application/octet-stream';
