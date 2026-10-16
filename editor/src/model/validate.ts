// Vérifications de l'histoire, avec des messages compréhensibles par un enfant.
import { t } from '../i18n';
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
  if (starts.length === 0) err(t('Il manque le bloc Début : ajoute-le pour que l’histoire puisse commencer.'));
  if (starts.length > 1) starts.slice(1).forEach((b) => err(t('Il ne peut y avoir qu’un seul bloc Début.'), b.id));
  if (!p.blocks.some((b) => b.type === 'end')) warn(t('Ton histoire n’a pas encore de bloc Fin.'));

  // Connexions
  for (const b of p.blocks) {
    for (const port of ports(b)) {
      if (port.target == null) {
        if (b.type === 'start') err(t('Relie le bloc Début à la première scène.'), b.id);
        else if (b.type === 'choice') err(t('Le choix « {name} » ne mène nulle part.', { name: port.label }), b.id);
        else if (b.type === 'loop') err(t('Choisis le bloc vers lequel revenir.'), b.id);
        else if (b.type === 'scene') err(t('La scène « {name} » ne mène nulle part : relie-la à un autre bloc ou à une Fin.', { name: name(b) }), b.id);
        else err(t('La sortie « {name} » n’est reliée à rien.', { name: port.label }), b.id);
      } else {
        const target = byId.get(port.target);
        if (!target) err(t('Ce bloc est relié à un bloc qui n’existe plus.'), b.id);
        else if (target.type === 'start' && b.type !== 'loop') err(t('On ne peut pas revenir au bloc Début avec une flèche : utilise un bloc Retour.'), b.id);
      }
    }
    if (b.type === 'choice' && b.options.length === 0) err(t('Ce choix n’a aucune réponse possible.'), b.id);
    if (b.type === 'choice' && b.options.length === 1) info(t('Ce choix n’a qu’une seule réponse.'), b.id);

    // Références
    if (b.type === 'item') {
      if (!b.item) err(t('Choisis quel objet utiliser.'), b.id);
      else if (!itemIds.has(b.item)) err(t('Cet objet n’existe plus dans l’inventaire.'), b.id);
    }
    if (b.type === 'var') {
      if (!b.var) err(t('Choisis quel compteur modifier.'), b.id);
      else if (!varIds.has(b.var)) err(t('Ce compteur n’existe plus.'), b.id);
    }
    if (b.type === 'cond') {
      const test = b.test;
      if (!test) err(t('Choisis ce que la condition doit vérifier.'), b.id);
      else if (test.kind === 'item' && !itemIds.has(test.item)) err(t('La condition vérifie un objet qui n’existe plus.'), b.id);
      else if (test.kind === 'var' && !varIds.has(test.var)) err(t('La condition vérifie un compteur qui n’existe plus.'), b.id);
      else if (test.kind === 'visited' && !byId.has(test.node)) err(t('La condition parle d’un bloc qui n’existe plus.'), b.id);
    }

    const img = 'image' in b ? b.image : null;
    if (img && !mediaIds.has(img)) err(t('L’illustration de ce bloc est introuvable.'), b.id);

    // Sons
    for (const slot of soundSlots(b)) {
      const missing = slot.sound?.tracks.some((tr) => tr.clips.some((c) => !mediaIds.has(c.media)));
      if (missing) err(t('Un son de « {name} » est introuvable.', { name: slot.label }), b.id);
      else if (!hasAudio(slot.sound) && !(p.autoVoice && slotText(b, slot.key))) {
        if (slot.key === b.id) warn(t('« {name} » n’a pas encore de son.', { name: slot.label }), b.id);
        else info(t('La réponse « {name} » n’a pas de son : elle sera seulement affichée.', { name: slot.label }), b.id);
      }
    }
  }

  // Le retour vers Début est traité comme un retour vers la première scène.
  const succ = (b: Block): string[] => ports(b).map((x) => x.target).filter((id): id is string => !!id && byId.has(id))
    .map((id) => (byId.get(id)!.type === 'start' ? (byId.get(id) as { next: string | null }).next ?? id : id));

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
    if (!reach.has(b.id)) warn(t('Ce bloc n’est jamais atteint : aucune flèche n’y mène depuis le Début.'), b.id);

  // Chemins sans issue : blocs atteignables d'où aucune fin n'est atteignable
  const pred = new Map<string, string[]>();
  for (const b of p.blocks) for (const s of succ(b)) pred.set(s, [...(pred.get(s) ?? []), b.id]);
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
      warn(t('Depuis ici, le joueur ne peut jamais arriver à une fin : il tourne en rond.'), b.id);

  // Boucles infinies : cycle composé uniquement de blocs logiques (aucune scène ni choix pour s'arrêter)
  const color = new Map<string, number>();
  const flagged = new Set<string>();
  const dfs = (id: string, path: string[]) => {
    color.set(id, 1);
    for (const s of succ(byId.get(id)!)) {
      if (!LOGIC.has(byId.get(s)!.type)) continue;
      if (color.get(s) === 1) {
        const cyc = path.slice(path.indexOf(s));
        if (!cyc.some((c) => flagged.has(c))) { cyc.forEach((c) => flagged.add(c)); err(t('Boucle infinie : ces blocs se renvoient l’un à l’autre sans jamais passer par une scène ou un choix.'), s); }
      } else if (!color.get(s)) dfs(s, [...path, s]);
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
      warn(t('Aucun bloc ne donne « {name} » : le joueur ne pourra jamais l’avoir.', { name: n }), b.id);
    }
  }
  for (const i of p.items) if (!given.has(i.id) && !p.blocks.some((b) => (b.type === 'item' && b.item === i.id) || (b.type === 'cond' && b.test?.kind === 'item' && b.test.item === i.id)))
    info(t('L’objet « {name} » n’est utilisé nulle part.', { name: i.name }));

  return out;
}

export const blockingErrors = (issues: Issue[]) => issues.filter((i) => i.level === 'error');
