// Export d'un pack de lecture (.aistory) : story.json + metadata.json + sons prémixés en WAV mono.
// Chaque son multipiste est mixé ici, une fois pour toutes : les lecteurs n'ont qu'un seul fichier à lire à la fois.
import { strToU8, zipSync, type Zippable } from 'fflate';
import { encodeWav, renderSound } from '../audio/mixer';
import { compile } from '../model/compile';
import { hasAudio, soundDuration, soundSlots, type Project, type Sound } from '../model/project';

export interface Platform {
  id: 'windows' | 'rpi' | 'android' | 'android2' | 'cardputer';
  name: string;
  icon: string;
  desc: string;
  sampleRate: number;
  /** 'pack' = fichier .aistory ; 'sd' = archive à décompresser à la racine de la carte microSD. */
  output: 'pack' | 'sd';
  maxBytes?: number;
}

export const PLATFORMS: Platform[] = [
  { id: 'windows', name: 'Windows', icon: '🪟', desc: 'Lecteur Herodio pour PC', sampleRate: 44100, output: 'pack' },
  { id: 'android', name: 'Android', icon: '📱', desc: 'Téléphones et tablettes récents', sampleRate: 44100, output: 'pack' },
  { id: 'rpi', name: 'Raspberry Pi', icon: '🍓', desc: 'Conteuse autonome', sampleRate: 44100, output: 'pack' },
  { id: 'android2', name: 'Android 2.3', icon: '📟', desc: 'Anciens téléphones (Xperia Play…)', sampleRate: 22050, output: 'pack', maxBytes: 150e6 },
  { id: 'cardputer', name: 'Cardputer ADV', icon: '⌨️', desc: 'M5Stack, carte microSD', sampleRate: 16000, output: 'sd', maxBytes: 2e9 },
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
  return { unique: [...byJson.values()], slotFile };
}

export function estimate(p: Project, pf: Platform) {
  const { unique } = collect(p);
  const seconds = unique.reduce((a, u) => a + soundDuration(u.sound), 0);
  return { seconds, bytes: seconds * pf.sampleRate * 2 + unique.length * 44 + 20000, files: unique.length };
}

export function slug(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'histoire';
}

/** Messages spécifiques à la plateforme choisie. */
export function diagnose(p: Project, pf: Platform): string[] {
  const out: string[] = [];
  const est = estimate(p, pf);
  if (pf.maxBytes && est.bytes > pf.maxBytes) out.push(`Le pack est très gros (${mb(est.bytes)}) pour ${pf.name} : raccourcis les sons ou retire des ambiances.`);
  if (pf.id === 'cardputer') {
    if (p.blocks.length > 400) out.push('Plus de 400 blocs : le Cardputer risque de manquer de mémoire.');
    const longTitle = p.blocks.find((b) => 'title' in b && b.title.length > 40);
    if (longTitle) out.push('Certains titres sont longs : ils seront coupés sur le petit écran du Cardputer.');
  }
  if (pf.id === 'android2' && est.seconds > 1800) out.push('Plus de 30 minutes de son : vérifie qu’il reste assez de place sur le vieux téléphone.');
  return out;
}

export const mb = (b: number) => `${(b / 1e6).toFixed(b < 1e7 ? 1 : 0).replace('.', ',')} Mo`;

export async function buildPack(p: Project, pf: Platform, progress: (done: number, total: number) => void): Promise<{ name: string; bytes: Uint8Array }> {
  const { unique, slotFile } = collect(p);
  const story = compile(p, (key) => slotFile.get(key) ?? null);
  const metadata = {
    format: 'herodio-pack', version: PACK_FORMAT_VERSION,
    id: p.id, title: p.title, author: p.author, description: p.description,
    platform: pf.id, audio: { codec: 'pcm_s16le', channels: 1, sampleRate: pf.sampleRate },
    files: unique.length,
    duration: Math.round(unique.reduce((a, u) => a + soundDuration(u.sound), 0)),
    created: new Date().toISOString(), generator: 'Herodio Studio',
  };
  const root = pf.output === 'sd' ? `herodio/${slug(p.title)}-${p.id.slice(0, 4)}/` : '';
  const files: Zippable = {
    [root + 'story.json']: strToU8(JSON.stringify(story)),
    [root + 'metadata.json']: strToU8(JSON.stringify(metadata, null, 1)),
  };
  for (let i = 0; i < unique.length; i++) {
    progress(i, unique.length);
    const data = await renderSound(unique[i].sound, pf.sampleRate);
    if (data) files[root + unique[i].file] = [encodeWav(data, pf.sampleRate), { level: 0 }];
  }
  progress(unique.length, unique.length);
  const ext = pf.output === 'sd' ? '-carte-sd.zip' : '.aistory';
  return { name: slug(p.title) + (pf.id === 'android2' ? '-android23' : pf.id === 'cardputer' ? '-cardputer' : '') + ext, bytes: zipSync(files) };
}
