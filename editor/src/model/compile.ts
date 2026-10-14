// Projet éditable → histoire exécutable (story.json), identique pour tous les lecteurs.
import type { RNode, Story } from '../engine/engine';
import { hasAudio, type Project, type Sound } from './project';

/** `audio(key, sound)` renvoie le chemin du son dans le pack (ou la clé, en prévisualisation). */
export type AudioRef = (key: string, sound: Sound | null) => string | null;

export const previewAudioRef: AudioRef = (key, s) => (hasAudio(s) ? key : null);

export function compile(p: Project, audio: AudioRef = previewAudioRef): Story {
  const nodes: RNode[] = [];
  const start = p.blocks.find((b) => b.type === 'start');
  // Une flèche vers le bloc Début (bloc Retour « au début ») vise en fait la première scène.
  const T = (id: string | null) => (start?.type === 'start' && id === start.id ? start.next : id);
  // Un bloc logique mal configuré devient un simple passage, pour rester jouable.
  const pass = (id: string, target: string | null): RNode => ({ id, type: 'jump', target: T(target), reset: false });

  for (const b of p.blocks) {
    switch (b.type) {
      case 'start': break;
      case 'scene':
        nodes.push({ id: b.id, type: 'scene', title: b.title, text: b.text, audio: audio(b.id, b.sound), next: T(b.next) });
        break;
      case 'choice':
        nodes.push({
          id: b.id, type: 'choice', title: b.title, text: b.text, audio: audio(b.id, b.sound),
          options: b.options.map((o) => ({ text: o.text, audio: audio(`${b.id}/${o.id}`, o.sound), next: T(o.next) })),
        });
        break;
      case 'end':
        nodes.push({ id: b.id, type: 'end', kind: b.kind, title: b.title, text: b.text, audio: audio(b.id, b.sound) });
        break;
      case 'item':
        if (!b.item) nodes.push(pass(b.id, b.next));
        else if (b.op === 'has') nodes.push({ id: b.id, type: 'cond', test: { kind: 'item', item: b.item }, then: T(b.next), else: T(b.else) });
        else nodes.push({ id: b.id, type: 'item', op: b.op, item: b.item, next: T(b.next) });
        break;
      case 'var':
        nodes.push(b.var ? { id: b.id, type: 'var', op: b.op, var: b.var, value: b.value | 0, next: T(b.next) } : pass(b.id, b.next));
        break;
      case 'cond':
        nodes.push(b.test ? { id: b.id, type: 'cond', test: b.test, then: T(b.then), else: T(b.else) } : pass(b.id, b.else));
        break;
      case 'loop':
        nodes.push({ id: b.id, type: 'jump', target: T(b.target), reset: b.reset });
        break;
    }
  }

  return {
    format: 'herodio-story', version: 1, id: p.id, title: p.title, author: p.author, description: p.description,
    start: start?.type === 'start' ? start.next : null,
    items: p.items.map(({ id, name }) => ({ id, name })),
    variables: p.variables.map(({ id, name, initial }) => ({ id, name, initial })),
    nodes,
  };
}
