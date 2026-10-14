// Ouverture / enregistrement de fichiers : dialogues natifs dans l'application Windows (Tauri),
// téléchargement / sélecteur de fichier dans un navigateur (développement).
import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';

export const isDesktop = '__TAURI_INTERNALS__' in window;

export interface Filter { name: string; extensions: string[] }

/** Renvoie le nom choisi, ou null si l'utilisateur annule. */
export async function saveBytes(defaultName: string, bytes: Uint8Array, filter: Filter): Promise<string | null> {
  if (isDesktop) {
    const path = await save({ defaultPath: defaultName, filters: [filter] });
    if (!path) return null;
    await invoke('write_file', bytes, { headers: { path: encodeURIComponent(path) } });
    return path;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([bytes as Uint8Array<ArrayBuffer>]));
  a.download = defaultName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
  return defaultName;
}

export async function openBytes(filter: Filter): Promise<{ name: string; bytes: Uint8Array } | null> {
  if (isDesktop) {
    const path = await open({ multiple: false, filters: [filter] });
    if (!path) return null;
    const buf = await invoke<ArrayBuffer>('read_file', { path });
    return { name: path.split(/[\\/]/).pop()!, bytes: new Uint8Array(buf) };
  }
  const f = await pickFiles(filter.extensions.map((e) => '.' + e).join(','));
  return f[0] ? { name: f[0].name, bytes: new Uint8Array(await f[0].arrayBuffer()) } : null;
}

/** Sélecteur de fichiers du navigateur (aussi utilisé pour importer des sons). */
export function pickFiles(accept: string, multiple = false): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.multiple = multiple;
    input.onchange = () => resolve([...(input.files ?? [])]);
    input.oncancel = () => resolve([]);
    input.click();
  });
}
