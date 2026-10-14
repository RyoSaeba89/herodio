import type { BlockType } from '../model/project';

export interface BlockMeta { label: string; icon: string; color: string; help: string; advanced?: boolean }

export const BLOCKS: Record<BlockType, BlockMeta> = {
  start: { label: 'Début', icon: '🚩', color: '#22a559', help: 'L’histoire commence ici. Relie-le à ta première scène.' },
  scene: { label: 'Scène', icon: '🎬', color: '#3b7ff5', help: 'Un moment de l’histoire : on écoute la narration, puis on passe au bloc suivant.' },
  choice: { label: 'Choix', icon: '🔀', color: '#f28a1c', help: 'Le joueur choisit ce qu’il fait. Chaque réponse mène à un autre bloc.' },
  item: { label: 'Objet', icon: '🎒', color: '#8b5cf6', help: 'Donner ou retirer un objet au joueur, ou vérifier s’il l’a dans son sac.', advanced: true },
  cond: { label: 'Condition', icon: '❓', color: '#e0b000', help: 'Pose une question : « Si… alors… sinon… ». L’histoire prend le chemin Oui ou Non.', advanced: true },
  var: { label: 'Compteur', icon: '🔢', color: '#e64aa0', help: 'Un nombre qui change pendant l’histoire : points, courage, nombre d’essais…', advanced: true },
  loop: { label: 'Retour', icon: '🔁', color: '#14b0a6', help: 'Revenir à un bloc précédent pour créer une boucle, ou recommencer depuis le début.', advanced: true },
  end: { label: 'Fin', icon: '🏁', color: '#e5484d', help: 'L’histoire se termine. Elle peut être heureuse, triste, secrète…' },
};

export const PALETTE_ORDER: BlockType[] = ['scene', 'choice', 'end', 'item', 'cond', 'var', 'loop', 'start'];

export const END_KINDS = [
  { kind: 'happy', icon: '😊', label: 'Heureuse' },
  { kind: 'sad', icon: '😢', label: 'Triste' },
  { kind: 'secret', icon: '🤫', label: 'Secrète' },
  { kind: 'other', icon: '✨', label: 'Autre' },
] as const;

export const ITEM_ICONS = ['🔑', '🗝️', '🪙', '💎', '🗡️', '🛡️', '📜', '🧪', '🍎', '🔦', '🪄', '🐚', '🎁', '🧭', '🪶', '⭐'];
