// Moteur narratif Herodio — référence TypeScript.
// Les règles sont décrites dans docs/moteur.md et vérifiées par spec/conformance/*.json.
// Toute implémentation (Rust, Java, C++) doit produire exactement les mêmes traces.

export type CmpOp = '==' | '!=' | '<' | '<=' | '>' | '>=';

export type Test =
  | { kind: 'item'; item: string }
  | { kind: 'var'; var: string; op: CmpOp; value: number }
  | { kind: 'visited'; node: string };

export interface Option { text: string; audio?: string | null; next: string | null }

export type EndKind = 'happy' | 'sad' | 'secret' | 'other';

export type RNode =
  | { id: string; type: 'scene'; title?: string; text?: string; audio?: string | null; next: string | null }
  | { id: string; type: 'choice'; title?: string; text?: string; audio?: string | null; options: Option[] }
  | { id: string; type: 'end'; kind: EndKind; title?: string; text?: string; audio?: string | null }
  | { id: string; type: 'item'; op: 'give' | 'take'; item: string; next: string | null }
  | { id: string; type: 'var'; op: 'set' | 'add'; var: string; value: number; next: string | null }
  | { id: string; type: 'cond'; test: Test; then: string | null; else: string | null }
  | { id: string; type: 'jump'; target: string | null; reset: boolean };

export interface Story {
  format: 'herodio-story';
  version: 1;
  id: string;
  title: string;
  author?: string;
  description?: string;
  start: string | null;
  items: { id: string; name: string }[];
  variables: { id: string; name: string; initial: number }[];
  nodes: RNode[];
}

export type Status = 'playing' | 'end' | 'error';

export interface GameState {
  items: string[];
  vars: Record<string, number>;
  visited: string[];
}

export const MAX_AUTO_STEPS = 1000;

export class Engine {
  readonly story: Story;
  private byId = new Map<string, RNode>();
  node: RNode | null = null;
  status: Status = 'end';
  items: string[] = [];
  vars: Record<string, number> = {};
  visited = new Set<string>();
  /** Identifiants des blocs traversés (logiques compris) depuis le dernier start — pour surligner le chemin. */
  path: string[] = [];

  constructor(story: Story) {
    this.story = story;
    for (const n of story.nodes) this.byId.set(n.id, n);
  }

  private reset() {
    this.items = [];
    this.vars = {};
    for (const v of this.story.variables) this.vars[v.id] = v.initial | 0;
    this.visited.clear();
  }

  start() {
    this.reset();
    this.path = [];
    this.go(this.story.start);
  }

  /** Mode test : démarre depuis un bloc avec un état de jeu choisi. */
  startAt(id: string, state?: Partial<GameState>) {
    this.reset();
    this.path = [];
    if (state?.items) this.items = [...new Set(state.items)];
    if (state?.vars) Object.assign(this.vars, state.vars);
    if (state?.visited) state.visited.forEach((v) => this.visited.add(v));
    this.go(id);
  }

  next() {
    if (this.status === 'playing' && this.node?.type === 'scene') this.go(this.node.next);
  }

  choose(index: number) {
    if (this.status !== 'playing' || this.node?.type !== 'choice') return;
    const opt = this.node.options[index];
    if (opt) this.go(opt.next);
  }

  /** Jeton de trace utilisé par les tests de conformance. */
  token(): string {
    if (this.status === 'error') return '#error';
    return this.node ? this.node.id : '#end';
  }

  test(t: Test): boolean {
    switch (t.kind) {
      case 'item': return this.items.includes(t.item);
      case 'visited': return this.visited.has(t.node);
      case 'var': {
        const a = this.vars[t.var] ?? 0, b = t.value;
        switch (t.op) {
          case '==': return a === b;
          case '!=': return a !== b;
          case '<': return a < b;
          case '<=': return a <= b;
          case '>': return a > b;
          case '>=': return a >= b;
        }
      }
    }
    return false;
  }

  private go(id: string | null) {
    for (let steps = 0; steps <= MAX_AUTO_STEPS; steps++) {
      const n = id == null ? undefined : this.byId.get(id);
      if (!n) { this.node = null; this.status = 'end'; return; }
      this.visited.add(n.id);
      this.path.push(n.id);
      switch (n.type) {
        case 'scene':
        case 'choice':
          this.node = n; this.status = 'playing'; return;
        case 'end':
          this.node = n; this.status = 'end'; return;
        case 'item':
          if (n.op === 'give') { if (!this.items.includes(n.item)) this.items.push(n.item); }
          else this.items = this.items.filter((i) => i !== n.item);
          id = n.next; break;
        case 'var':
          this.vars[n.var] = ((n.op === 'set' ? 0 : this.vars[n.var] ?? 0) + n.value) | 0;
          id = n.next; break;
        case 'cond':
          id = this.test(n.test) ? n.then : n.else; break;
        case 'jump':
          if (n.reset) this.reset();
          id = n.target; break;
      }
    }
    this.node = null;
    this.status = 'error';
  }
}

/** Applique une entrée de test ("next", "choose:N", "restart"). */
export function applyInput(e: Engine, input: string) {
  if (input === 'next') e.next();
  else if (input === 'restart') e.start();
  else if (input.startsWith('choose:')) e.choose(Number(input.slice(7)));
  else throw new Error('Entrée inconnue : ' + input);
}
