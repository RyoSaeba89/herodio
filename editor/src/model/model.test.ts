import { describe, expect, it } from 'vitest';
import { projectFromDef } from '../stories/build';
import { chateau, premiere } from '../stories/exemples';
import { compile } from './compile';
import { newBlock, newProject, withPort, type Project } from './project';
import { validate } from './validate';

// Les exemples sont construits sans leurs médias : les tests de jouabilité complets sont dans stories.test.ts.
const fake = () => ({ id: 'm', duration: 2 });
const premiereHistoire = () => projectFromDef(premiere, fake);
const chateauMysterieux = () => projectFromDef(chateau, fake);
const errors = (p: Project) => validate(p).filter((i) => i.level === 'error');

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
