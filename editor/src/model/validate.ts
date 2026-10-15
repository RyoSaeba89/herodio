// Vérifications de l'histoire, avec des messages compréhensibles par un enfant.
import { hasAudio, ports, slotText, soundSlots, type Block, type Project } from './project';

export interface Issue { level: 'error' | 'warning' | 'info'; block?: string; message: string }

const LOGIC = new Set(['item', 'cond', 'var', 'loop']);

export function validate(p: Project): Issue[] {
  const out: Issue[] = [];
  const err = (message: string, block?: string) => out.push({ level: 'error', block, message });
  const warn = (message: string, block?: string) => out.push({ level: 'warning', block, message });
  const info = (message: string, block?: string) => out.push({ level: 'info', block, message });
  const byId = new Map(p.blocks.map((b) => [b.id, b]));
  const mediaIds = new Set(p.media.map((m) => m.id));
  const itemIds = new Set(p.items.map((i) => i.id));
  const varIds = new Set(p.variables.map((v) => v.id));
  const name = (b: Block) => ('title' in b && b.title) || '';

  const starts = p.blocks.filter((b) => b.type === 'start');
  if (starts.length === 0) err('Il manque le bloc Début : ajoute-le pour que l’histoire puisse commencer.');
  if (starts.length > 1) starts.slice(1).forEach((b) => err('Il ne peut y avoir qu’un seul bloc Début.', b.id));
  if (!p.blocks.some((b) => b.type === 'end')) warn('Ton histoire n’a pas encore de bloc Fin.');

  // Connexions
  for (const b of p.blocks) {
    for (const port of ports(b)) {
      if (port.target == null) {
        if (b.type === 'start') err('Relie le bloc Début à la première scène.', b.id);
        else if (b.type === 'choice') err(`Le choix « ${port.label} » ne mène nulle part.`, b.id);
        else if (b.type === 'loop') err('Choisis le bloc vers lequel revenir.', b.id);
        else if (b.type === 'scene') err(`La scène « ${name(b)} » ne mène nulle part : relie-la à un autre bloc ou à une Fin.`, b.id);
        else err(`La sortie « ${port.label} » n’est reliée à rien.`, b.id);
      } else {
        const t = byId.get(port.target);
        if (!t) err('Ce bloc est relié à un bloc qui n’existe plus.', b.id);
        else if (t.type === 'start' && b.type !== 'loop') err('On ne peut pas revenir au bloc Début avec une flèche : utilise un bloc Retour.', b.id);
      }
    }
    if (b.type === 'choice' && b.options.length === 0) err('Ce choix n’a aucune réponse possible.', b.id);
    if (b.type === 'choice' && b.options.length === 1) info('Ce choix n’a qu’une seule réponse.', b.id);

    // Références
    if (b.type === 'item') {
      if (!b.item) err('Choisis quel objet utiliser.', b.id);
      else if (!itemIds.has(b.item)) err('Cet objet n’existe plus dans l’inventaire.', b.id);
    }
    if (b.type === 'var') {
      if (!b.var) err('Choisis quel compteur modifier.', b.id);
      else if (!varIds.has(b.var)) err('Ce compteur n’existe plus.', b.id);
    }
    if (b.type === 'cond') {
      const t = b.test;
      if (!t) err('Choisis ce que la condition doit vérifier.', b.id);
      else if (t.kind === 'item' && !itemIds.has(t.item)) err('La condition vérifie un objet qui n’existe plus.', b.id);
      else if (t.kind === 'var' && !varIds.has(t.var)) err('La condition vérifie un compteur qui n’existe plus.', b.id);
      else if (t.kind === 'visited' && !byId.has(t.node)) err('La condition parle d’un bloc qui n’existe plus.', b.id);
    }

    // Sons
    for (const slot of soundSlots(b)) {
      const missing = slot.sound?.tracks.some((t) => t.clips.some((c) => !mediaIds.has(c.media)));
      if (missing) err(`Un son de « ${slot.label} » est introuvable.`, b.id);
      else if (!hasAudio(slot.sound) && !(p.autoVoice && slotText(b, slot.key))) {
        if (slot.key === b.id) warn(`« ${slot.label} » n’a pas encore de son.`, b.id);
        else info(`La réponse « ${slot.label} » n’a pas de son : elle sera seulement affichée.`, b.id);
      }
    }
  }

  // Le retour vers Début est traité comme un retour vers la première scène.
  const succ = (b: Block): string[] => ports(b).map((x) => x.target).filter((t): t is string => !!t && byId.has(t))
    .map((t) => (byId.get(t)!.type === 'start' ? (byId.get(t) as { next: string | null }).next ?? t : t));

  // Blocs inaccessibles
  const reach = new Set<string>();
  const stack = starts.slice(0, 1).map((s) => s.id);
  while (stack.length) {
    const id = stack.pop()!;
    if (reach.has(id)) continue;
    reach.add(id);
    stack.push(...succ(byId.get(id)!));
  }
  if (starts.length) for (const b of p.blocks)
    if (!reach.has(b.id)) warn('Ce bloc n’est jamais atteint : aucune flèche n’y mène depuis le Début.', b.id);

  // Chemins sans issue : blocs atteignables d'où aucune fin n'est atteignable
  const pred = new Map<string, string[]>();
  for (const b of p.blocks) for (const t of succ(b)) pred.set(t, [...(pred.get(t) ?? []), b.id]);
  const canEnd = new Set<string>();
  const st2 = p.blocks.filter((b) => b.type === 'end').map((b) => b.id);
  while (st2.length) {
    const id = st2.pop()!;
    if (canEnd.has(id)) continue;
    canEnd.add(id);
    st2.push(...(pred.get(id) ?? []));
  }
  for (const b of p.blocks)
    if (reach.has(b.id) && !canEnd.has(b.id) && b.type !== 'start' && (b.type === 'scene' || b.type === 'choice') && p.blocks.some((x) => x.type === 'end'))
      warn('Depuis ici, le joueur ne peut jamais arriver à une fin : il tourne en rond.', b.id);

  // Boucles infinies : cycle composé uniquement de blocs logiques (aucune scène ni choix pour s'arrêter)
  const color = new Map<string, number>();
  const flagged = new Set<string>();
  const dfs = (id: string, path: string[]) => {
    color.set(id, 1);
    for (const t of succ(byId.get(id)!)) {
      if (!LOGIC.has(byId.get(t)!.type)) continue;
      if (color.get(t) === 1) {
        const cyc = path.slice(path.indexOf(t));
        if (!cyc.some((c) => flagged.has(c))) { cyc.forEach((c) => flagged.add(c)); err('Boucle infinie : ces blocs se renvoient l’un à l’autre sans jamais passer par une scène ou un choix.', t); }
      } else if (!color.get(t)) dfs(t, [...path, t]);
    }
    color.set(id, 2);
  };
  for (const b of p.blocks) if (LOGIC.has(b.type) && !color.get(b.id)) dfs(b.id, [b.id]);

  // Cohérence de l'inventaire
  const given = new Set(p.blocks.flatMap((b) => (b.type === 'item' && b.op === 'give' && b.item ? [b.item] : [])));
  for (const b of p.blocks) {
    const it = b.type === 'item' && b.op !== 'give' ? b.item : b.type === 'cond' && b.test?.kind === 'item' ? b.test.item : null;
    if (it && itemIds.has(it) && !given.has(it)) {
      const n = p.items.find((i) => i.id === it)!.name;
      warn(`Aucun bloc ne donne « ${n} » : le joueur ne pourra jamais l’avoir.`, b.id);
    }
  }
  for (const i of p.items) if (!given.has(i.id) && !p.blocks.some((b) => (b.type === 'item' && b.item === i.id) || (b.type === 'cond' && b.test?.kind === 'item' && b.test.item === i.id)))
    info(`L’objet « ${i.name} » n’est utilisé nulle part.`);

  return out;
}

export const blockingErrors = (issues: Issue[]) => issues.filter((i) => i.level === 'error');
