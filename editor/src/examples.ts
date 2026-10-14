// Histoires d'exemple prêtes à jouer.
import { autoLayout } from './actions';
import { putBlob } from './audio/media';
import { newBlock, newProject, uid, withPort, type Block, type ChoiceBlock, type Clip, type MediaCategory, type Project, type Sound, type TrackRole } from './model/project';

class Builder {
  p: Project;
  constructor(title: string, description: string, level: Project['level']) {
    this.p = newProject(title);
    Object.assign(this.p, { description, level, author: 'Herodio' });
  }
  get start() { return this.p.blocks[0]; }
  add<T extends Block>(b: T, fields: Partial<T> = {}): T {
    const x = { ...b, ...fields } as T;
    this.p.blocks.push(x);
    return x;
  }
  scene(title: string, text: string) { return this.add(newBlock('scene') as Extract<Block, { type: 'scene' }>, { title, text }); }
  end(title: string, text: string, kind: 'happy' | 'sad' | 'secret' | 'other' = 'happy') { return this.add(newBlock('end') as Extract<Block, { type: 'end' }>, { title, text, kind }); }
  choice(title: string, text: string, options: string[]): ChoiceBlock {
    return this.add(newBlock('choice') as ChoiceBlock, { title, text, options: options.map((t) => ({ id: uid(), text: t, sound: null, next: null })) });
  }
  link(from: Block, to: Block, port = 'next') {
    const i = this.p.blocks.findIndex((b) => b.id === from.id);
    this.p.blocks[i] = withPort(this.p.blocks[i], port, to.id);
  }
  opt(c: ChoiceBlock, i: number, to: Block) { this.link(c, to, 'opt:' + c.options[i].id); }
  item(name: string, icon: string) { const id = uid(); this.p.items.push({ id, name, icon }); return id; }
  done(): Project {
    const pos = autoLayout(this.p);
    for (const b of this.p.blocks) Object.assign(b, pos.get(b.id));
    return this.p;
  }
}

export function premiereHistoire(): Project {
  const s = new Builder('Ma première histoire', 'Un début, une scène, deux choix et deux fins.', 'decouverte');
  const a = s.scene('Le réveil', 'Ce matin, le soleil brille. Un petit chat gratte à ta fenêtre : il a l’air de vouloir te montrer quelque chose !');
  const c = s.choice('Que fais-tu ?', 'Veux-tu suivre le chat dans le jardin, ou rester bien au chaud dans ton lit ?', ['Suivre le chat', 'Rester au lit']);
  const e1 = s.end('Le trésor du jardin', 'Le chat t’emmène jusqu’à un vieux coffre caché sous le pommier. À l’intérieur : des billes de toutes les couleurs ! Quelle belle journée.', 'happy');
  const e2 = s.end('Dodo', 'Tu te rendors… et tu rêves d’un chat qui t’attend toujours dehors. Peut-être une autre fois ?', 'sad');
  s.link(s.start, a); s.link(a, c); s.opt(c, 0, e1); s.opt(c, 1, e2);
  return s.done();
}

export function chateauMysterieux(): Project {
  const s = new Builder('Le château mystérieux', 'Des embranchements, une clé, une porte verrouillée et plusieurs fins.', 'avance');
  const cle = s.item('Clé dorée', '🗝️');
  const arrive = s.scene('Devant le château', 'Tu arrives devant un immense château. Ses tours se perdent dans les nuages et une grande porte de bois te barre le chemin.');
  const c = s.choice('Où aller ?', 'Que décides-tu ?', ['Entrer dans le château', 'Explorer la forêt', 'Retourner au village']);
  const aCle = s.add(newBlock('item') as Extract<Block, { type: 'item' }>, { op: 'has', item: cle });
  const ferme = s.scene('La porte est fermée', 'Tu pousses la porte de toutes tes forces… elle est verrouillée ! Il te faudrait une clé.');
  const retour = s.add(newBlock('loop') as Extract<Block, { type: 'loop' }>, { target: c.id });
  const foret = s.scene('Dans la forêt', 'Tu marches entre les grands arbres. Quelque chose brille au pied d’un chêne…');
  const donne = s.add(newBlock('item') as Extract<Block, { type: 'item' }>, { op: 'give', item: cle });
  const trouve = s.scene('Une clé !', 'C’est une clé dorée ! Tu la ranges précieusement dans ton sac.');
  const retour2 = s.add(newBlock('loop') as Extract<Block, { type: 'loop' }>, { target: c.id });
  const ouvre = s.scene('La porte s’ouvre', 'Clic ! La clé tourne dans la serrure. Tu entres dans une salle remplie de tapisseries.');
  const c2 = s.choice('Dans le château', 'Un escalier monte vers la tour, un autre descend vers la cave.', ['Monter dans la tour', 'Descendre à la cave']);
  const tour = s.end('Le trésor de la tour', 'Tout en haut de la tour, un coffre rempli de pièces d’or t’attend. Tu es riche !', 'happy');
  const cave = s.end('Le passage secret', 'Dans la cave, un passage secret mène… directement à la bibliothèque magique du château ! Tu as découvert la fin secrète.', 'secret');
  const village = s.end('Retour au village', 'Tu rentres au village. Le château gardera ses mystères… pour cette fois.', 'sad');
  s.link(s.start, arrive); s.link(arrive, c);
  s.opt(c, 0, aCle); s.link(aCle, ouvre, 'next'); s.link(aCle, ferme, 'else'); s.link(ferme, retour);
  s.opt(c, 1, foret); s.link(foret, donne); s.link(donne, trouve); s.link(trouve, retour2);
  s.opt(c, 2, village);
  s.link(ouvre, c2); s.opt(c2, 0, tour); s.opt(c2, 1, cave);
  return s.done();
}

/** Son multipiste : [média, rôle, début (s), options]. */
type Part = [string, TrackRole, number, Partial<Clip & { volume: number }>?];
function mix(parts: Part[], durations: Record<string, number>): Sound {
  return {
    duck: parts.some((p) => p[1] === 'ambiance') && parts.some((p) => p[1] === 'voix'),
    tracks: parts.map(([media, role, start, o = {}]) => ({
      id: uid(), name: media, role, volume: o.volume ?? (role === 'ambiance' ? 0.45 : 1), muted: false, solo: false,
      clips: [{ id: uid(), media: 'ex-' + media, start, offset: 0, duration: durations[media], gain: 1, fadeIn: 0, fadeOut: 0, ...o }],
    })),
  };
}

export async function foretEnchantee(): Promise<Project> {
  const base = '/examples/foret/';
  const durations: Record<string, number> = await (await fetch(base + 'durees.json')).json();
  const s = new Builder('La forêt enchantée', 'Une histoire audio avec narration, bruitages et musique d’ambiance.', 'decouverte');
  const cat = (n: string): MediaCategory => (n.startsWith('n-') || n.startsWith('o-') ? 'voix' : n === 'ambiance-foret' ? 'ambiance' : n === 'berceuse' ? 'musique' : 'bruitage');
  for (const name of Object.keys(durations)) {
    const blob = await (await fetch(base + name + '.ogg')).blob();
    await putBlob('ex-' + name, new Blob([blob], { type: 'audio/ogg' }));
    s.p.media.push({ id: 'ex-' + name, name, category: cat(name), ext: 'ogg', duration: durations[name] });
  }
  const d = durations;
  const fades = (len: number) => ({ duration: len, fadeIn: 1.5, fadeOut: 2.5 });
  const oree = s.scene('L’orée de la forêt', 'Te voici à l’orée de la forêt enchantée. Le vent chante dans les feuilles, et les oiseaux te souhaitent la bienvenue.');
  oree.sound = mix([['n-oree', 'voix', 2], ['ambiance-foret', 'ambiance', 0, fades(d['n-oree'] + 4)], ['pas-feuilles', 'bruitage', 0, { volume: 0.7 }]], d);
  const chemin = s.choice('Le chemin se sépare', 'Que veux-tu faire ? Suivre les lucioles, ou écouter le vieux hibou ?', ['Suivre les lucioles', 'Écouter le vieux hibou']);
  chemin.sound = mix([['n-chemin', 'voix', 0]], d);
  chemin.options[0].sound = mix([['o-lucioles', 'voix', 0]], d);
  chemin.options[1].sound = mix([['o-hibou', 'voix', 0]], d);
  const lucioles = s.scene('Les lucioles', 'Les petites lumières te guident jusqu’à une clairière. Une fée minuscule te tend une potion qui brille.');
  lucioles.sound = mix([['magie', 'bruitage', 0], ['n-lucioles', 'voix', 1.5], ['berceuse', 'ambiance', 0, { ...fades(d['n-lucioles'] + 3), volume: 0.4 }]], d);
  const fee = s.choice('La potion de la fée', 'Bois cette potion, et tu pourras parler aux animaux. Acceptes-tu ?', ['Accepter la potion', 'Refuser poliment']);
  fee.sound = mix([['magie', 'bruitage', 0, { volume: 0.6 }], ['n-fee', 'voix', 0.8]], d);
  fee.options[0].sound = mix([['o-accepter', 'voix', 0]], d);
  fee.options[1].sound = mix([['o-refuser', 'voix', 0]], d);
  const animaux = s.end('L’amie des animaux', 'Un écureuil te dit bonjour ! Désormais, tous les animaux de la forêt sont tes amis.', 'happy');
  animaux.sound = mix([['n-fin-animaux', 'voix', 0.5], ['berceuse', 'ambiance', 0, { ...fades(d['n-fin-animaux'] + 3), volume: 0.5 }]], d);
  const maison = s.end('Retour à la maison', 'Tu remercies la fée et tu rentres à la maison. La forêt t’attendra pour une prochaine aventure.', 'other');
  maison.sound = mix([['n-fin-maison', 'voix', 0.5], ['ambiance-foret', 'ambiance', 0, fades(d['n-fin-maison'] + 3)], ['pas-feuilles', 'bruitage', d['n-fin-maison'] - 1, { volume: 0.6 }]], d);
  const hibou = s.scene('Le vieux hibou', 'Hou hou ! Le vieux hibou te confie un secret : au cœur de la forêt, un arbre géant garde tous les rêves des enfants.');
  hibou.sound = mix([['hibou', 'bruitage', 0], ['n-hibou', 'voix', 2.6], ['ambiance-foret', 'ambiance', 0, fades(d['n-hibou'] + 5)]], d);
  const secret = s.end('Le secret de la forêt', 'Tu as découvert le secret de la forêt enchantée. Chut ! Ne le répète à personne.', 'secret');
  secret.sound = mix([['n-fin-secret', 'voix', 0], ['magie', 'bruitage', d['n-fin-secret'] + 0.2]], d);
  s.link(s.start, oree); s.link(oree, chemin);
  s.opt(chemin, 0, lucioles); s.opt(chemin, 1, hibou);
  s.link(lucioles, fee); s.opt(fee, 0, animaux); s.opt(fee, 1, maison);
  s.link(hibou, secret);
  return s.done();
}

export const EXAMPLES: { title: string; icon: string; desc: string; make: () => Project | Promise<Project> }[] = [
  { title: 'Ma première histoire', icon: '🐱', desc: 'Un début, une scène, deux choix et deux fins.', make: premiereHistoire },
  { title: 'Le château mystérieux', icon: '🏰', desc: 'Une clé, une porte verrouillée et plusieurs fins.', make: chateauMysterieux },
  { title: 'La forêt enchantée', icon: '🌲', desc: 'Narration, bruitages et musique d’ambiance.', make: foretEnchantee },
];
