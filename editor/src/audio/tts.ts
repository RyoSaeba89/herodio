// Voix automatique : synthèse vocale libre et hors ligne (Piper : voix « Siwis » en français, « LJ Speech » en anglais),
// exécutée dans public/tts/worker.js.
// Les sons générés sont mis en cache (IndexedDB) : un même texte n'est synthétisé qu'une fois.
import { get as idbGet, set as idbSet } from 'idb-keyval';
import { t, type Lang } from '../i18n';
import { uid, type Sound } from '../model/project';
import { useStore } from '../store';
import { decode, getBlob, registerBlob } from './media';
import { encodeWav } from './mixer';

export interface Voice { id: string; name: string; credit: string }
/** Une voix par langue d'histoire. Le crédit, écrit dans la langue de l'histoire, accompagne ses packs :
 *  attribution exigée par la licence CC BY 4.0 des données SIWIS ; LJ Speech est dans le domaine public. */
export const VOICES: Record<Lang, Voice> = {
  fr: { id: 'fr_FR-siwis-medium', name: 'Siwis', credit: 'Voix de synthèse : Piper « fr_FR-siwis-medium », données SIWIS (Université d’Édimbourg), licence CC BY 4.0' },
  en: { id: 'en_US-ljspeech-medium', name: 'LJ Speech', credit: 'Synthetic voice: Piper “en_US-ljspeech-medium”, LJ Speech data (public domain)' },
};
/** Voix de l'histoire ouverte (les histoires d'avant la 0.2.1, sans langue, sont en français). */
export const storyVoice = (): Voice => VOICES[useStore.getState().project.lang ?? 'fr'];
/** Un peu plus lent que la normale : plus facile à suivre pour un enfant de 6-8 ans. */
const RATE = 1.08;

let worker: Worker | undefined;
const pending = new Map<number, { resolve: (b: Blob) => void; reject: (e: Error) => void }>();
let seq = 0;

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('tts/worker.js', document.baseURI));
    worker.onmessage = (e) => {
      const p = pending.get(e.data.id);
      if (!p) return;
      pending.delete(e.data.id);
      if (e.data.error) p.reject(new Error(e.data.error));
      else p.resolve(new Blob([encodeWav(e.data.pcm, e.data.sampleRate) as Uint8Array<ArrayBuffer>], { type: 'audio/wav' }));
    };
  }
  return worker;
}

const installed = new Map<string, Promise<boolean>>();
/** Vrai si la voix est présente dans l'application (voir scripts/setup-tts.mjs). */
export function ttsInstalled(voice = storyVoice().id): Promise<boolean> {
  if (!installed.has(voice)) installed.set(voice, fetch(`tts/voices/${voice}.onnx.json`).then((r) => r.ok && r.headers.get('content-type') !== 'text/html').catch(() => false));
  return installed.get(voice)!;
}

/** Empreinte courte et stable d'un texte (FNV-1a 32 bits ×2). */
function hash(s: string): string {
  let a = 0x811c9dc5, b = 0x01000193;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    a = Math.imul(a ^ c, 0x01000193) >>> 0;
    b = Math.imul(b ^ c, 0x85ebca6b) >>> 0;
  }
  return a.toString(16).padStart(8, '0') + b.toString(16).padStart(8, '0');
}

export const cleanText = (t: string) => t.replace(/\s+/g, ' ').trim();

/** Synthétise un texte en WAV (avec cache), avec la voix de l'histoire ouverte ou `voice`. */
export async function synthesize(text: string, voice = storyVoice().id): Promise<Blob> {
  text = cleanText(text);
  const key = `tts:${voice}:${RATE}:${hash(text)}`;
  const cached = await idbGet<Blob>(key);
  if (cached) return cached;
  const id = ++seq;
  const blob = await new Promise<Blob>((resolve, reject) => {
    pending.set(id, { resolve, reject });
    getWorker().postMessage({ id, text, voice, rate: RATE });
  });
  await idbSet(key, blob);
  return blob;
}

/** Son temporaire (non enregistré dans le projet) lisant `text` : pour la prévisualisation et l'export. */
export async function autoSound(text: string): Promise<Sound | null> {
  text = cleanText(text);
  if (!text) return null;
  const voice = storyVoice().id;
  const id = `tts-${hash(voice + RATE + text)}`;
  if (!getBlob(id)) registerBlob(id, await synthesize(text, voice));
  const buf = await decode(id);
  return {
    duck: false,
    tracks: [{ id: uid(), name: t('Voix automatique'), role: 'voix', volume: 1, muted: false, solo: false,
      clips: [{ id: uid(), media: id, start: 0, offset: 0, duration: buf.duration, gain: 1, fadeIn: 0, fadeOut: 0 }] }],
  };
}
