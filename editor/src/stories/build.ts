// Transforme une StoryDef en projet Herodio éditable : blocs, mixages (voix + bruitages + ambiance) et illustrations.
import { autoLayout } from '../actions';
import { decode, putBlob } from '../audio/media';
import {
  newBlock, newProject, uid, type Block, type ChoiceBlock, type Clip, type Media, type MediaCategory, type Project, type Sound, type Track,
} from '../model/project';
import { VOICE_CREDIT } from '../audio/tts';
import { imagesOf, narrationTexts, soundsOf, textHash, type Def, type Media as NodeMedia, type StoryDef } from './dsl';

/** Média déjà enregistré : identifiant et durée (0 pour une image). */
export type Assets = (kind: 'voix' | 'son' | 'image', name: string) => { id: string; duration: number } | null;

const clip = (media: string, start: number, duration: number, extra: Partial<Clip> = {}): Clip =>
  ({ id: uid(), media, start, offset: 0, duration, gain: 1, fadeIn: 0, fadeOut: 0, ...extra });

const track = (name: string, role: Track['role'], volume: number, clips: Clip[]): Track =>
  ({ id: uid(), name, role, volume, muted: false, solo: false, clips });

/** Mixage d'un moment : narration, bruitages calés sur la voix, ambiance de fond avec fondus. */
function mix(text: string, m: NodeMedia, assets: Assets): Sound | null {
  const voice = assets('voix', textHash(text));
  const vStart = m.voiceAt ?? (m.fx?.some(([, s = 0]) => s === 0) ? 0.8 : 0.3);
  const vEnd = voice ? vStart + voice.duration : vStart;
  const tracks: Track[] = [];
  if (voice) tracks.push(track('Voix', 'voix', 1, [clip(voice.id, vStart, voice.duration)]));
  for (const [name, at = 0, vol = 1] of m.fx ?? []) {
    const fx = assets('son', name);
    if (!fx) continue;
    const start = at >= 0 ? at : Math.max(0, vEnd + at + 1);
    tracks.push(track(name, 'bruitage', vol, [clip(fx.id, start, fx.duration)]));
  }
  if (m.amb) {
    const amb = assets('son', m.amb[0]);
    if (amb) {
      const len = Math.min(amb.duration, Math.max(vEnd + 1.5, 4));
      tracks.push(track(m.amb[0], 'ambiance', m.amb[1] ?? 0.4, [clip(amb.id, 0, len, { fadeIn: 1, fadeOut: 1.5 })]));
    }
  }
  if (!tracks.length) return null;
  return { duck: tracks.some((t) => t.role === 'ambiance') && !!voice, tracks };
}

/** Construction pure (testable sans navigateur) à partir de médias déjà disponibles. */
export function projectFromDef(def: StoryDef, assets: Assets): Project {
  const p = newProject(def.title);
  Object.assign(p, { id: 'histoire-' + def.id, description: def.description, author: 'Herodio', level: def.level ?? 'avance', color: def.color });
  p.items = def.items ?? [];
  p.variables = def.variables ?? [];
  p.cover = assets('image', 'couverture')?.id ?? null;
  p.credits = [
    ...(def.source ? [`D’après ${def.source} (domaine public), adaptation Herodio`] : []),
    VOICE_CREDIT,
    'Illustrations, bruitages et musiques : Herodio (CC0)',
  ];
  const bid = (key: string) => `${def.id}-${key}`;
  const start = p.blocks[0];
  if (start.type === 'start') start.next = bid(def.start);

  for (const [key, d] of Object.entries(def.nodes) as [string, Def][]) {
    let b: Block;
    const img = 'img' in d && d.img ? assets('image', d.img)?.id ?? null : null;
    switch (d.k) {
      case 'scene':
        b = { ...newBlock('scene'), title: d.title, text: d.text, image: img, sound: mix(d.text, d, assets), next: bid(d.next) } as Block;
        break;
      case 'choice':
        b = {
          ...newBlock('choice'), title: d.title, text: d.text, image: img, sound: mix(d.text, d, assets),
          options: d.options.map(([text, to]) => ({ id: uid(), text, sound: mix(text, {}, assets), next: bid(to) })),
        } as ChoiceBlock;
        break;
      case 'end':
        b = { ...newBlock('end'), kind: d.kind, title: d.title, text: d.text, image: img, sound: mix(d.text, d, assets) } as Block;
        break;
      case 'give': case 'take':
        b = { ...newBlock('item'), op: d.k, item: d.item, next: bid(d.next) } as Block;
        break;
      case 'has':
        b = { ...newBlock('item'), op: 'has', item: d.item, next: bid(d.yes), else: bid(d.no) } as Block;
        break;
      case 'add': case 'set':
        b = { ...newBlock('var'), op: d.k, var: d.var, value: d.value, next: bid(d.next) } as Block;
        break;
      case 'cond':
        b = { ...newBlock('cond'), test: { kind: 'var', var: d.var, op: d.op, value: d.value }, then: bid(d.yes), else: bid(d.no) } as Block;
        break;
      case 'visited':
        b = { ...newBlock('cond'), test: { kind: 'visited', node: bid(d.node) }, then: bid(d.yes), else: bid(d.no) } as Block;
        break;
      case 'loop':
        b = { ...newBlock('loop'), target: bid(d.target), reset: !!d.reset } as Block;
        break;
    }
    b.id = bid(key);
    p.blocks.push(b);
  }
  const pos = autoLayout(p);
  for (const b of p.blocks) Object.assign(b, pos.get(b.id));
  return p;
}

/** Charge les médias d'une histoire fournie (narration, sons communs, illustrations) puis construit le projet. */
export async function buildStory(def: StoryDef): Promise<Project> {
  const base = `examples/${def.id}/`;
  const media: Media[] = [];
  const found = new Map<string, { id: string; duration: number }>();
  const load = async (kind: 'voix' | 'son' | 'image', name: string, url: string, category: MediaCategory, ext: string, type: string) => {
    const res = await fetch(url);
    if (!res.ok || (res.headers.get('content-type') ?? '').includes('text/html')) return; // média manquant : le bloc restera sans
    const id = `${def.id}-${kind}-${name}`;
    await putBlob(id, new Blob([await res.blob()], { type }));
    const duration = kind === 'image' ? 0 : (await decode(id)).duration;
    found.set(`${kind}:${name}`, { id, duration });
    media.push({ id, name: kind === 'voix' ? `Narration ${name.slice(0, 6)}` : name, category, ext, duration });
  };
  await Promise.all([
    ...narrationTexts(def).map((t) => load('voix', textHash(t), `${base}voix/${textHash(t)}.ogg`, 'voix', 'ogg', 'audio/ogg')),
    ...soundsOf(def).map((s) => load('son', s, `examples/sons/${s}.ogg`, /^musique/.test(s) ? 'musique' : /^(campagne|foret|nuit|marmite)$/.test(s) ? 'ambiance' : 'bruitage', 'ogg', 'audio/ogg')),
    ...imagesOf(def).map((i) => load('image', i, `${base}img/${i}.svg`, 'image', 'svg', 'image/svg+xml')),
  ]);
  const p = projectFromDef(def, (kind, name) => found.get(`${kind}:${name}`) ?? null);
  // Narration : noms lisibles dans la bibliothèque
  for (const [key, d] of Object.entries(def.nodes)) {
    if (!('text' in d)) continue;
    const m = media.find((x) => x.id === `${def.id}-voix-${textHash(d.text)}`);
    if (m) m.name = `Narration – ${d.title ?? key}`;
  }
  p.media = media;
  return p;
}
