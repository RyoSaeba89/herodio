import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { Engine } from '../engine/engine';
import { compile } from '../model/compile';
import { validate } from '../model/validate';
import { projectFromDef } from './build';
import { imagesOf, narrationTexts, soundsOf, textHash } from './dsl';
import { ALL_STORIES } from './index';

const pub = join(__dirname, '../../public/examples');

describe.each(ALL_STORIES.map((s) => [`${s.title} (${s.lang ?? 'fr'})`, s] as const))('%s', (_, def) => {
  const p = projectFromDef(def, (kind, name) => ({ id: `${kind}-${name}`, duration: 3 }));
  p.media = [];

  it('est valide (aucune erreur)', () => {
    // Les médias factices ne sont pas dans la bibliothèque : seules les erreurs de structure comptent ici.
    const errors = validate(p).filter((i) => i.level === 'error' && !i.message.includes('introuvable'));
    expect(errors).toEqual([]);
  });

  it('toutes les fins sont atteignables, et aucune partie ne boucle sans fin', () => {
    const story = compile(p);
    const ends = new Set(story.nodes.filter((n) => n.type === 'end').map((n) => n.id));
    const reached = new Set<string>();
    // Parcours de tous les états de jeu (bloc présenté + sac + compteurs + blocs visités), chacun une seule fois.
    const seen = new Set<string>();
    const todo: Engine[] = [];
    const settle = (e: Engine) => { while (e.node?.type === 'scene') e.next(); return e; };
    const push = (e: Engine) => {
      expect(e.status).not.toBe('error');
      if (e.status === 'end') { if (e.node) reached.add(e.node.id); return; }
      const key = JSON.stringify([e.token(), [...e.items].sort(), e.vars, [...e.visited].sort()]);
      if (!seen.has(key)) { seen.add(key); todo.push(e); }
    };
    const first = new Engine(story);
    first.start();
    push(settle(first));
    let explored = 0;
    while (todo.length && explored < 20000) {
      const e = todo.pop()!;
      explored++;
      if (e.node?.type !== 'choice') continue;
      for (let i = 0; i < e.node.options.length; i++) {
        const f = new Engine(story);
        f.startAt(e.node.id, { items: [...e.items], vars: { ...e.vars }, visited: [...e.visited] });
        f.choose(i);
        push(settle(f));
      }
    }
    expect(explored).toBeGreaterThan(0);
    expect([...reached].sort()).toEqual([...ends].sort());
  });

  it('scènes courtes et choix simples, adaptés aux 6-8 ans', () => {
    for (const n of Object.values(def.nodes)) {
      if (n.k === 'choice') expect(n.options.length).toBeLessThanOrEqual(4);
      if ('text' in n) expect(n.text.length, n.title).toBeLessThanOrEqual(300);
    }
  });

  it('a sa narration, ses sons et ses illustrations', () => {
    const missing = [
      ...narrationTexts(def).map((t) => `${def.id}/voix/${textHash(t)}.ogg`),
      ...soundsOf(def).map((s) => `sons/${s}.ogg`),
      ...imagesOf(def).map((i) => `${def.id}/img/${i}.svg`),
    ].filter((f) => !existsSync(join(pub, f)));
    expect(missing).toEqual([]);
  });
});
