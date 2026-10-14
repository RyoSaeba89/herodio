// Modèle du projet éditable (.herodio). Voir docs/format.md.
import type { EndKind, Test } from '../engine/engine';

export interface Clip {
  id: string;
  media: string;      // identifiant stable du média
  start: number;      // position sur la piste (secondes)
  offset: number;     // début dans le fichier source (secondes)
  duration: number;   // durée jouée (secondes)
  gain: number;       // 1 = volume d'origine
  fadeIn: number;     // secondes
  fadeOut: number;    // secondes
}

export type TrackRole = 'voix' | 'ambiance' | 'bruitage';

export interface Track {
  id: string;
  name: string;
  role: TrackRole;
  volume: number;
  muted: boolean;
  solo: boolean;
  clips: Clip[];
}

/** Le son d'un bloc : une ou plusieurs pistes mixées à l'export. */
export interface Sound { tracks: Track[]; duck: boolean }

export interface ChoiceOption { id: string; text: string; sound: Sound | null; next: string | null }

interface Base { id: string; x: number; y: number }
export type StartBlock = Base & { type: 'start'; next: string | null };
export type SceneBlock = Base & { type: 'scene'; title: string; text: string; sound: Sound | null; next: string | null };
export type ChoiceBlock = Base & { type: 'choice'; title: string; text: string; sound: Sound | null; options: ChoiceOption[] };
export type ItemBlock = Base & { type: 'item'; op: 'give' | 'take' | 'has'; item: string | null; next: string | null; else: string | null };
export type CondBlock = Base & { type: 'cond'; test: Test | null; then: string | null; else: string | null };
export type VarBlock = Base & { type: 'var'; op: 'set' | 'add'; var: string | null; value: number; next: string | null };
export type LoopBlock = Base & { type: 'loop'; target: string | null; reset: boolean };
export type EndBlock = Base & { type: 'end'; kind: EndKind; title: string; text: string; sound: Sound | null };

export type Block = StartBlock | SceneBlock | ChoiceBlock | ItemBlock | CondBlock | VarBlock | LoopBlock | EndBlock;
export type BlockType = Block['type'];

export type MediaCategory = 'enregistrement' | 'voix' | 'ambiance' | 'bruitage' | 'musique';

export interface Media {
  id: string;
  name: string;
  category: MediaCategory;
  ext: string;          // extension du fichier source dans media/
  duration: number;     // secondes
  owner?: string;       // bloc (ou bloc/option) pour lequel la prise a été enregistrée
}

export interface Project {
  format: 'herodio-project';
  version: 1;
  id: string;
  title: string;
  author: string;
  description: string;
  level: 'decouverte' | 'avance';
  blocks: Block[];
  items: { id: string; name: string; icon: string }[];
  variables: { id: string; name: string; initial: number }[];
  media: Media[];
}

export const uid = () => crypto.randomUUID().replace(/-/g, '').slice(0, 10);

export const ADVANCED_TYPES: BlockType[] = ['item', 'cond', 'var', 'loop'];

export function newBlock(type: BlockType, x = 0, y = 0): Block {
  const b = { id: uid(), x, y };
  switch (type) {
    case 'start': return { ...b, type, next: null };
    case 'scene': return { ...b, type, title: 'Nouvelle scène', text: '', sound: null, next: null };
    case 'choice': return {
      ...b, type, title: 'Un choix', text: '', sound: null,
      options: [
        { id: uid(), text: 'Choix 1', sound: null, next: null },
        { id: uid(), text: 'Choix 2', sound: null, next: null },
      ],
    };
    case 'item': return { ...b, type, op: 'give', item: null, next: null, else: null };
    case 'cond': return { ...b, type, test: null, then: null, else: null };
    case 'var': return { ...b, type, op: 'add', var: null, value: 1, next: null };
    case 'loop': return { ...b, type, target: null, reset: false };
    case 'end': return { ...b, type, kind: 'happy', title: 'Fin', text: '', sound: null };
  }
}

export function newProject(title = 'Mon histoire'): Project {
  const start = newBlock('start', 0, 0);
  return {
    format: 'herodio-project', version: 1, id: uid(), title, author: '', description: '',
    level: 'decouverte', blocks: [start], items: [], variables: [], media: [],
  };
}

/** Une sortie de bloc : nom du port, libellé et bloc visé. */
export interface Port { port: string; label: string; target: string | null; dashed?: boolean }

export function ports(b: Block): Port[] {
  switch (b.type) {
    case 'start':
    case 'scene':
    case 'var': return [{ port: 'next', label: 'Ensuite', target: b.next }];
    case 'choice': return b.options.map((o, i) => ({ port: 'opt:' + o.id, label: o.text || `Choix ${i + 1}`, target: o.next }));
    case 'item': return b.op === 'has'
      ? [{ port: 'next', label: 'Oui', target: b.next }, { port: 'else', label: 'Non', target: b.else }]
      : [{ port: 'next', label: 'Ensuite', target: b.next }];
    case 'cond': return [{ port: 'then', label: 'Oui', target: b.then }, { port: 'else', label: 'Non', target: b.else }];
    case 'loop': return [{ port: 'target', label: 'Revenir à', target: b.target, dashed: true }];
    case 'end': return [];
  }
}

/** Retourne une copie du bloc avec la sortie `port` reliée à `target`. */
export function withPort(b: Block, port: string, target: string | null): Block {
  if (port.startsWith('opt:') && b.type === 'choice') {
    const id = port.slice(4);
    return { ...b, options: b.options.map((o) => (o.id === id ? { ...o, next: target } : o)) };
  }
  if (port in b) return { ...b, [port]: target } as Block;
  return b;
}

/** Tous les emplacements sonores d'un bloc (clé stable → son). */
export function soundSlots(b: Block): { key: string; label: string; sound: Sound | null }[] {
  if (b.type === 'scene' || b.type === 'end') return [{ key: b.id, label: b.title, sound: b.sound }];
  if (b.type === 'choice') return [
    { key: b.id, label: b.title, sound: b.sound },
    ...b.options.map((o, i) => ({ key: `${b.id}/${o.id}`, label: o.text || `Choix ${i + 1}`, sound: o.sound })),
  ];
  return [];
}

export function hasAudio(s: Sound | null): s is Sound {
  return !!s && s.tracks.some((t) => t.clips.length > 0);
}

export function soundDuration(s: Sound | null): number {
  if (!s) return 0;
  let d = 0;
  for (const t of s.tracks) for (const c of t.clips) d = Math.max(d, c.start + c.duration);
  return d;
}

/** Son simple : une piste « voix » contenant tout le média. */
export function simpleSound(m: Media, role: TrackRole = 'voix'): Sound {
  return {
    duck: false,
    tracks: [{
      id: uid(), name: role === 'voix' ? 'Voix' : m.name, role, volume: 1, muted: false, solo: false,
      clips: [{ id: uid(), media: m.id, start: 0, offset: 0, duration: m.duration, gain: 1, fadeIn: 0, fadeOut: 0 }],
    }],
  };
}

export function mediaUsage(p: Project): Map<string, number> {
  const used = new Map<string, number>();
  for (const b of p.blocks) for (const s of soundSlots(b))
    for (const t of s.sound?.tracks ?? []) for (const c of t.clips) used.set(c.media, (used.get(c.media) ?? 0) + 1);
  return used;
}
