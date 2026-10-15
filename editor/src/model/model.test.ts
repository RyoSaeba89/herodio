import { describe, expect, it } from 'vitest';
import { Engine } from '../engine/engine';
import { chateauMysterieux, premiereHistoire } from '../examples';
import { compile } from './compile';
import { newBlock, newProject, withPort, type Project } from './project';
import { validate } from './validate';

const errors = (p: Project) => validate(p).filter((i) => i.level === 'error');

describe('exemples', () => {
  it('sont valides et jouables jusqu’à chaque fin', () => {
    for (const p of [premiereHistoire(), chateauMysterieux()]) {
      expect(errors(p)).toEqual([]);
      const story = compile(p);
      const ends = new Set(story.nodes.filter((n) => n.type === 'end').map((n) => n.id));
      // Exploration exhaustive des choix (profondeur bornée) : toutes les fins doivent être atteignables.
      const reached = new Set<string>();
      const explore = (path: number[], depth: number) => {
        const e = new Engine(story);
        e.start();
        for (const c of path) { while (e.node?.type === 'scene') e.next(); e.choose(c); }
        while (e.node?.type === 'scene') e.next();
        if (e.status === 'end' && e.node) reached.add(e.node.id);
        if (e.node?.type === 'choice' && depth < 8) e.node.options.forEach((_, i) => explore([...path, i], depth + 1));
      };
      explore([], 0);
      expect(reached).toEqual(ends);
    }
  });
});

describe('validation', () => {
  it('signale le début manquant, les flèches manquantes et les blocs isolés', () => {
    const p = newProject();
    const scene = newBlock('scene');
    const lonely = newBlock('end');
    p.blocks.push(scene, lonely);
    p.blocks[0] = withPort(p.blocks[0], 'next', scene.id);
    const msgs = validate(p).map((i) => i.message).join('\n');
    expect(msgs).toMatch(/ne mène nulle part/);
    expect(msgs).toMatch(/jamais atteint/);
    p.blocks = p.blocks.filter((b) => b.type !== 'start');
    expect(validate(p).some((i) => i.message.includes('Il manque le bloc Début'))).toBe(true);
  });

  it('détecte une boucle infinie entre blocs logiques', () => {
    const p = newProject();
    const a = newBlock('cond'), b = newBlock('loop');
    p.variables.push({ id: 'v', name: 'V', initial: 0 });
    Object.assign(a, { test: { kind: 'var', var: 'v', op: '==', value: 0 }, then: b.id, else: b.id });
    Object.assign(b, { target: a.id });
    p.blocks.push(a, b);
    p.blocks[0] = withPort(p.blocks[0], 'next', a.id);
    expect(errors(p).some((i) => i.message.startsWith('Boucle infinie'))).toBe(true);
  });

  it('signale un objet vérifié mais jamais donné', () => {
    const p = chateauMysterieux();
    p.blocks = p.blocks.filter((b) => !(b.type === 'item' && b.op === 'give'));
    expect(validate(p).some((i) => i.message.includes('ne pourra jamais l’avoir'))).toBe(true);
  });
});

describe('compilation', () => {
  it('un Retour vers le Début vise la première scène', () => {
    const p = premiereHistoire();
    const start = p.blocks.find((b) => b.type === 'start')!;
    const loop = newBlock('loop');
    Object.assign(loop, { target: start.id, reset: true });
    p.blocks.push(loop);
    const story = compile(p);
    const jump = story.nodes.find((n) => n.id === loop.id)!;
    expect(jump).toMatchObject({ type: 'jump', target: story.start, reset: true });
  });

  it('un bloc « vérifier un objet » devient une condition', () => {
    const story = compile(chateauMysterieux());
    expect(story.nodes.some((n) => n.type === 'cond' && n.test.kind === 'item')).toBe(true);
  });
});
