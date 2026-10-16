// Opérations d'édition du graphe (toutes annulables).
import { t } from './i18n';
import { newBlock, ports, uid, withPort, type Block, type BlockType, type Project } from './model/project';
import { useStore } from './store';

const st = () => useStore.getState();

export function addBlock(type: BlockType, x: number, y: number, from?: { source: string; port: string }): string {
  const b = newBlock(type, x, y);
  st().update((p) => {
    if (type === 'start' && p.blocks.some((x) => x.type === 'start')) return;
    p.blocks.push(b);
    if (from) {
      const i = p.blocks.findIndex((x) => x.id === from.source);
      if (i >= 0) p.blocks[i] = withPort(p.blocks[i], from.port, b.id);
    }
  });
  st().select(b.id);
  return b.id;
}

export function connect(source: string, port: string, target: string | null) {
  st().update((p) => {
    const i = p.blocks.findIndex((x) => x.id === source);
    if (i >= 0) p.blocks[i] = withPort(p.blocks[i], port, target);
  });
}

/** Supprime des blocs et débranche toutes les flèches qui y menaient. */
export function deleteBlocks(ids: string[]) {
  const gone = new Set(ids);
  st().update((p) => {
    p.blocks = p.blocks.filter((b) => !gone.has(b.id) || b.type === 'start');
    p.blocks = p.blocks.map((b) => ports(b).reduce<Block>((acc, pt) => (pt.target && gone.has(pt.target) ? withPort(acc, pt.port, null) : acc), b));
  });
  if (gone.has(st().selected ?? '')) st().select(null);
}

export function duplicateBlock(id: string) {
  const b = st().project.blocks.find((x) => x.id === id);
  if (!b || b.type === 'start') return;
  const copy = structuredClone(b) as Block;
  copy.id = uid();
  copy.x += 40;
  copy.y += 40;
  if (copy.type === 'choice') copy.options = copy.options.map((o) => ({ ...o, id: uid() }));
  if ('title' in copy) copy.title += ' ' + t('(copie)');
  st().update((p) => { p.blocks.push(copy); });
  st().select(copy.id);
}

/** Range les blocs en colonnes selon leur distance au Début. */
export function autoLayout(p: Project): Map<string, { x: number; y: number }> {
  const byId = new Map(p.blocks.map((b) => [b.id, b]));
  const depth = new Map<string, number>();
  const start = p.blocks.find((b) => b.type === 'start');
  const queue = start ? [start.id] : [];
  if (start) depth.set(start.id, 0);
  while (queue.length) {
    const id = queue.shift()!;
    for (const pt of ports(byId.get(id)!)) {
      if (pt.dashed || !pt.target || !byId.has(pt.target) || depth.has(pt.target)) continue;
      depth.set(pt.target, depth.get(id)! + 1);
      queue.push(pt.target);
    }
  }
  const maxDepth = Math.max(0, ...depth.values());
  const cols = new Map<number, string[]>();
  for (const b of p.blocks) {
    const d = depth.get(b.id) ?? maxDepth + 1;
    cols.set(d, [...(cols.get(d) ?? []), b.id]);
  }
  // Hauteur approximative d'un bloc à l'écran (vignette et sorties comprises), pour éviter les chevauchements.
  const height = (id: string) => {
    const b = byId.get(id)!;
    return 90 + ('image' in b && b.image ? 120 : 0) + ports(b).length * 24;
  };
  const pos = new Map<string, { x: number; y: number }>();
  for (const [d, ids] of cols) {
    const total = ids.reduce((a, id) => a + height(id) + 40, -40);
    let y = -total / 2;
    for (const id of ids) { pos.set(id, { x: d * 300, y }); y += height(id) + 40; }
  }
  return pos;
}

export function applyAutoLayout() {
  const pos = autoLayout(st().project);
  st().update((p) => { for (const b of p.blocks) { const q = pos.get(b.id); if (q) { b.x = q.x; b.y = q.y; } } });
}
