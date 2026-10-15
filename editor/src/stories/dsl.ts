// Description déclarative des histoires fournies, transformée en projet Herodio par buildStory().
// Narration : public/examples/<id>/voix/<empreinte du texte>.ogg (générée par scripts/gen-narration.mjs avec la voix automatique).
// Illustrations : public/examples/<id>/img/<nom>.svg ; bruitages et musiques communs : public/examples/sons/<nom>.ogg.
import type { CmpOp, EndKind } from '../engine/engine';

/** Bruitage : [nom, début (s), volume]. */
export type Fx = [string, number?, number?];

export interface Media { img?: string; fx?: Fx[]; amb?: [string, number?]; voiceAt?: number }

export type Def =
  | ({ k: 'scene'; title: string; text: string; next: string } & Media)
  | ({ k: 'choice'; title: string; text: string; options: [string, string][] } & Media)
  | ({ k: 'end'; kind: EndKind; title: string; text: string } & Media)
  | { k: 'give' | 'take'; item: string; next: string }
  | { k: 'has'; item: string; yes: string; no: string }
  | { k: 'add' | 'set'; var: string; value: number; next: string }
  | { k: 'cond'; var: string; op: CmpOp; value: number; yes: string; no: string }
  | { k: 'visited'; node: string; yes: string; no: string }
  | { k: 'loop'; target: string; reset?: boolean };

export interface StoryDef {
  id: string;
  title: string;
  description: string;
  color: string;
  icon: string;
  notion: string;
  /** Œuvre d'origine (domaine public) dont l'histoire est adaptée. */
  source?: string;
  /** Niveau d'interface à l'ouverture (par défaut : avancé, car la plupart utilisent la logique). */
  level?: 'decouverte' | 'avance';
  items?: { id: string; name: string; icon: string }[];
  variables?: { id: string; name: string; initial: number }[];
  start: string;
  nodes: Record<string, Def>;
}

// Petits constructeurs, pour des définitions lisibles.
export const scene = (title: string, text: string, next: string, m: Media = {}): Def => ({ k: 'scene', title, text, next, ...m });
export const choice = (title: string, text: string, options: [string, string][], m: Media = {}): Def => ({ k: 'choice', title, text, options, ...m });
export const end = (kind: EndKind, title: string, text: string, m: Media = {}): Def => ({ k: 'end', kind, title, text, ...m });
export const give = (item: string, next: string): Def => ({ k: 'give', item, next });
export const has = (item: string, yes: string, no: string): Def => ({ k: 'has', item, yes, no });
export const add = (v: string, value: number, next: string): Def => ({ k: 'add', var: v, value, next });
export const cond = (v: string, op: CmpOp, value: number, yes: string, no: string): Def => ({ k: 'cond', var: v, op, value, yes, no });
export const visited = (node: string, yes: string, no: string): Def => ({ k: 'visited', node, yes, no });
export const loop = (target: string, reset = false): Def => ({ k: 'loop', target, reset });

/** Empreinte stable d'un texte (nom du fichier de narration). */
export function textHash(text: string): string {
  let a = 0x811c9dc5, b = 0x01000193;
  const t = text.replace(/\s+/g, ' ').trim();
  for (let i = 0; i < t.length; i++) {
    const c = t.charCodeAt(i);
    a = Math.imul(a ^ c, 0x01000193) >>> 0;
    b = Math.imul(b ^ c, 0x85ebca6b) >>> 0;
  }
  return a.toString(16).padStart(8, '0') + b.toString(16).padStart(8, '0');
}

/** Tous les textes lus par le narrateur (scènes, questions, réponses, fins). */
export function narrationTexts(def: StoryDef): string[] {
  const out = new Set<string>();
  for (const n of Object.values(def.nodes)) {
    if (n.k === 'scene' || n.k === 'choice' || n.k === 'end') out.add(n.text);
    if (n.k === 'choice') for (const [t] of n.options) out.add(t);
  }
  return [...out];
}

export function imagesOf(def: StoryDef): string[] {
  const out = new Set<string>(['couverture']);
  for (const n of Object.values(def.nodes)) if ('img' in n && n.img) out.add(n.img);
  return [...out];
}

export function soundsOf(def: StoryDef): string[] {
  const out = new Set<string>();
  for (const n of Object.values(def.nodes)) {
    if (!('fx' in n || 'amb' in n)) continue;
    const m = n as Media;
    m.fx?.forEach(([f]) => out.add(f));
    if (m.amb) out.add(m.amb[0]);
  }
  return [...out];
}
