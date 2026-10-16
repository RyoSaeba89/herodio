// Chaque texte passé à t('…') doit avoir sa traduction anglaise, avec les mêmes {variables}, et aucune traduction ne doit traîner sans usage.
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { EN } from './i18n.en';

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) return sources(p);
    return /\.tsx?$/.test(f) && !/\.test\.ts$|i18n\.en\.ts$/.test(f) ? [p] : [];
  });
}

/** Textes littéraux des appels t('…') (guillemets simples, comme partout dans le code). */
function keys(): Set<string> {
  const out = new Set<string>();
  for (const f of sources(__dirname)) {
    for (const m of readFileSync(f, 'utf-8').matchAll(/\bt\('((?:[^'\\]|\\.)*)'/g)) out.add(m[1].replace(/\\'/g, "'"));
  }
  return out;
}

const vars = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('traductions anglaises', () => {
  const used = keys();

  it('trouve les textes de l’interface', () => {
    expect(used.size).toBeGreaterThan(250);
  });

  it('chaque texte a sa traduction', () => {
    expect([...used].filter((k) => !(k in EN))).toEqual([]);
  });

  it('aucune traduction inutilisée', () => {
    expect(Object.keys(EN).filter((k) => !used.has(k))).toEqual([]);
  });

  it('mêmes variables dans les deux langues, et traduction non vide', () => {
    const bad = Object.entries(EN).filter(([fr, en]) => !en.trim() || vars(fr).join() !== vars(en).join());
    expect(bad).toEqual([]);
  });

  it('pas de guillemets ni d’espaces à la française dans l’anglais', () => {
    expect(Object.values(EN).filter((en) => /[«»]| [:;!?]/.test(en))).toEqual([]);
  });
});
