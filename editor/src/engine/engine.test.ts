import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Engine, applyInput } from './engine';

const dir = join(__dirname, '../../../spec/conformance');

describe('conformance', () => {
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    const c = JSON.parse(readFileSync(join(dir, f), 'utf8'));
    it(f, () => {
      const e = new Engine(c.story);
      e.start();
      const trace = [e.token()];
      for (const i of c.inputs) { applyInput(e, i); trace.push(e.token()); }
      expect(trace).toEqual(c.trace);
      expect([...e.items].sort()).toEqual([...c.final.items].sort());
      for (const [k, v] of Object.entries(c.final.vars)) expect(e.vars[k]).toBe(v);
    });
  }
});
