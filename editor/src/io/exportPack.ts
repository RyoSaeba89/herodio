// Export d'un pack de lecture (.aistory) : story.json + metadata.json + sons prémixés en WAV mono.
// Chaque son multipiste est mixé ici, une fois pour toutes : les lecteurs n'ont qu'un seul fichier à lire à la fois.
import { strToU8, zipSync, type Zippable } from 'fflate';
import { autoVoiceSlots, withAutoVoices } from '../audio/autovoice';
import { VOICES } from '../audio/tts';
import { rasterize } from '../audio/images';
import { getBlob } from '../audio/media';
import { encodeWav, renderSound } from '../audio/mixer';
import { dec, t } from '../i18n';
import { compile } from '../model/compile';
import { blockImage, hasAudio, soundDuration, soundSlots, type Project, type Sound } from '../model/project';

export interface Platform {
  id: 'windows' | 'rpi' | 'android' | 'android2' | 'cardputer';
  name: string;
  icon: string;
  desc: string;
  sampleRate: number;
  /** 'pack' = fichier .aistory ; 'sd' = archive à décompresser à la racine de la carte microSD. */
  output: 'pack' | 'sd';
  maxBytes?: number;
  /** Taille des illustrations : `fit` = tenir dans le cadre, `cover` = remplir l'écran. */
  image: { w: number; h: number; mode: 'fit' | 'cover' };
}

export const PLATFORMS: Platform[] = [
  { id: 'windows', name: 'Windows', icon: '🪟', desc: t('Lecteur Herodio pour PC'), sampleRate: 44100, output: 'pack', image: { w: 1280, h: 960, mode: 'fit' } },
  { id: 'android', name: 'Android', icon: '📱', desc: t('Téléphones et tablettes récents'), sampleRate: 44100, output: 'pack', image: { w: 1280, h: 960, mode: 'fit' } },
  { id: 'rpi', name: 'Raspberry Pi', icon: '🍓', desc: t('Conteuse autonome'), sampleRate: 44100, output: 'pack', image: { w: 1024, h: 768, mode: 'fit' } },
  { id: 'android2', name: 'Android 2.3', icon: '📟', desc: t('Anciens téléphones (Xperia Play…)'), sampleRate: 22050, output: 'pack', maxBytes: 150e6, image: { w: 640, h: 480, mode: 'fit' } },
  { id: 'cardputer', name: 'Cardputer ADV', icon: '⌨️', desc: t('M5Stack, carte microSD'), sampleRate: 16000, output: 'sd', maxBytes: 2e9, image: { w: 240, h: 135, mode: 'cover' } },
];

export const PACK_FORMAT_VERSION = 1;

interface Unique { file: string; sound: Sound }

function collect(p: Project) {
  const byJson = new Map<string, Unique>();
  const slotFile = new Map<string, string>();
  for (const b of p.blocks) for (const s of soundSlots(b)) {
    if (!hasAudio(s.sound)) continue;
    const k = JSON.stringify(s.sound);
    let u = byJson.get(k);
    if (!u) { u = { file: `assets/audio/${String(byJson.size + 1).padStart(3, '0')}.wav`, sound: s.sound }; byJson.set(k, u); }
    slotFile.set(s.key, u.file);
  }
  // Illustrations (et couverture) : une seule fois chacune.
  const images = new Map<string, string>();
  for (const id of [p.cover, ...p.blocks.map(blockImage)]) {
    if (id && getBlob(id) && !images.has(id)) images.set(id, `assets/images/${String(images.size + 1).padStart(3, '0')}.jpg`);
  }
  return { unique: [...byJson.values()], slotFile, images };
}

export function estimate(p: Project, pf: Platform) {
  const { unique, images } = collect(p);
  // Voix automatique : environ 13 caractères lus par seconde.
  const auto = autoVoiceSlots(p);
  const seconds = unique.reduce((a, u) => a + soundDuration(u.sound), 0) + auto.reduce((a, s) => a + s.text.length / 13 + 0.3, 0);
  const imageBytes = images.size * (pf.image.w * pf.image.h * 0.25);
  return { seconds, bytes: seconds * pf.sampleRate * 2 + unique.length * 44 + 20000 + imageBytes, files: unique.length + auto.length, images: images.size };
}

export function slug(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || t('histoire');
}

/** Messages spécifiques à la plateforme choisie. */
export function diagnose(p: Project, pf: Platform): string[] {
  const out: string[] = [];
  const est = estimate(p, pf);
  if (pf.maxBytes && est.bytes > pf.maxBytes) out.push(t('Le pack est très gros ({size}) pour {name} : raccourcis les sons ou retire des ambiances.', { size: mb(est.bytes), name: pf.name }));
  if (pf.id === 'cardputer') {
    if (p.blocks.length > 400) out.push(t('Plus de 400 blocs : le Cardputer risque de manquer de mémoire.'));
    const longTitle = p.blocks.find((b) => 'title' in b && b.title.length > 40);
    if (longTitle) out.push(t('Certains titres sont longs : ils seront coupés sur le petit écran du Cardputer.'));
  }
  if (pf.id === 'android2' && est.seconds > 1800) out.push(t('Plus de 30 minutes de son : vérifie qu’il reste assez de place sur le vieux téléphone.'));
  return out;
}

export const mb = (b: number) => `${dec(b / 1e6, b < 1e7 ? 1 : 0)} ${t('Mo')}`;

export async function buildPack(p: Project, pf: Platform, progress: (done: number, total: number, step?: string) => void): Promise<{ name: string; bytes: Uint8Array }> {
  if (p.autoVoice) p = await withAutoVoices(p, (d, t) => progress(d, t, 'voix'));
  const { unique, slotFile, images } = collect(p);
  const story = compile(p, (key) => slotFile.get(key) ?? null, (m) => (m && images.get(m)) || null);
  const metadata = {
    format: 'herodio-pack', version: PACK_FORMAT_VERSION,
    id: p.id, title: p.title, author: p.author, description: p.description,
    platform: pf.id, audio: { codec: 'pcm_s16le', channels: 1, sampleRate: pf.sampleRate },
    files: unique.length,
    images: images.size,
    cover: p.cover ? images.get(p.cover) ?? null : null,
    color: p.color,
    duration: Math.round(unique.reduce((a, u) => a + soundDuration(u.sound), 0)),
    credits: [...new Set([...(p.credits ?? []), ...(p.autoVoice ? [VOICES[p.lang ?? 'fr'].credit] : [])])],
    created: new Date().toISOString(), generator: 'Herodio Studio',
  };
  const root = pf.output === 'sd' ? `herodio/${slug(p.title)}-${p.id.slice(0, 4)}/` : '';
  const files: Zippable = {
    [root + 'story.json']: strToU8(JSON.stringify(story)),
    [root + 'metadata.json']: strToU8(JSON.stringify(metadata, null, 1)),
  };
  for (const [id, path] of images) {
    files[root + path] = [await rasterize(getBlob(id)!, pf.image.w, pf.image.h, pf.image.mode), { level: 0 }];
  }
  for (let i = 0; i < unique.length; i++) {
    progress(i, unique.length);
    const data = await renderSound(unique[i].sound, pf.sampleRate);
    if (data) files[root + unique[i].file] = [encodeWav(data, pf.sampleRate), { level: 0 }];
  }
  progress(unique.length, unique.length);
  const ext = pf.output === 'sd' ? t('-carte-sd.zip') : '.aistory';
  return { name: slug(p.title) + (pf.id === 'android2' ? '-android23' : pf.id === 'cardputer' ? '-cardputer' : '') + ext, bytes: zipSync(files) };
}
