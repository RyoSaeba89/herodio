// Fichiers audio du projet : octets d'origine (persistés dans IndexedDB) et version décodée en cache.
import { get as idbGet, set as idbSet } from 'idb-keyval';
import { uid, type Media, type MediaCategory } from '../model/project';
import { useStore } from '../store';

const blobs = new Map<string, Blob>();
const decoded = new Map<string, Promise<AudioBuffer>>();
let ctx: AudioContext | undefined;
export const audioContext = () => (ctx ??= new AudioContext());

export const getBlob = (id: string) => blobs.get(id);

/** Son temporaire, gardé seulement en mémoire (ex. voix automatique, déjà en cache ailleurs). */
export const registerBlob = (id: string, blob: Blob) => void blobs.set(id, blob);

export async function putBlob(id: string, blob: Blob) {
  blobs.set(id, blob);
  await idbSet('media:' + id, blob);
}

/** Recharge depuis IndexedDB les fichiers d'un projet récupéré ; renvoie les identifiants absents. */
export async function restoreBlobs(ids: string[]): Promise<string[]> {
  const missing: string[] = [];
  for (const id of ids) {
    if (blobs.has(id)) continue;
    const b = await idbGet<Blob>('media:' + id);
    if (b) blobs.set(id, b); else missing.push(id);
  }
  return missing;
}

export function decode(id: string): Promise<AudioBuffer> {
  let p = decoded.get(id);
  if (!p) {
    const blob = blobs.get(id);
    if (!blob) return Promise.reject(new Error('Son introuvable'));
    p = blob.arrayBuffer().then((buf) => audioContext().decodeAudioData(buf));
    p.catch(() => decoded.delete(id));
    decoded.set(id, p);
  }
  return p;
}

const EXT: Record<string, string> = {
  'audio/webm': 'webm', 'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'audio/wav': 'wav', 'audio/x-wav': 'wav',
  'audio/wave': 'wav', 'audio/flac': 'flac', 'audio/mp4': 'm4a', 'audio/aac': 'aac',
};

export function extOf(blob: Blob, name = ''): string {
  return EXT[blob.type.split(';')[0]] ?? (name.match(/\.(\w+)$/)?.[1]?.toLowerCase() || 'bin');
}

/** Ajoute un son au projet. Lève une erreur compréhensible si le fichier n'est pas lisible. */
export async function addMedia(blob: Blob, name: string, category: MediaCategory, owner?: string): Promise<Media> {
  const id = uid();
  blobs.set(id, blob);
  let buffer: AudioBuffer;
  try {
    buffer = await decode(id);
  } catch {
    blobs.delete(id);
    throw new Error(`Le fichier « ${name} » n’est pas un son que je sais lire.`);
  }
  await idbSet('media:' + id, blob);
  const m: Media = { id, name, category, ext: extOf(blob, name), duration: buffer.duration, ...(owner ? { owner } : {}) };
  useStore.getState().update((p) => { p.media.push(m); });
  return m;
}

export const AUDIO_ACCEPT = '.wav,.mp3,.ogg,.oga,.opus,.flac,.m4a,.aac,.webm,audio/*';
