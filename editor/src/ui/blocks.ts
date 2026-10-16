import { t } from '../i18n';
import type { BlockType } from '../model/project';

export interface BlockMeta { label: string; icon: string; color: string; help: string; advanced?: boolean }

export const BLOCKS: Record<BlockType, BlockMeta> = {
  start: { label: t('Début'), icon: '🚩', color: '#22a559', help: t('L’histoire commence ici. Relie-le à ta première scène.') },
  scene: { label: t('Scène'), icon: '🎬', color: '#3b7ff5', help: t('Un moment de l’histoire : on écoute la narration, puis on passe au bloc suivant.') },
  choice: { label: t('Choix'), icon: '🔀', color: '#f28a1c', help: t('Le joueur choisit ce qu’il fait. Chaque réponse mène à un autre bloc.') },
  item: { label: t('Objet'), icon: '🎒', color: '#8b5cf6', help: t('Donner ou retirer un objet au joueur, ou vérifier s’il l’a dans son sac.'), advanced: true },
  cond: { label: t('Condition'), icon: '❓', color: '#e0b000', help: t('Pose une question : « Si… alors… sinon… ». L’histoire prend le chemin Oui ou Non.'), advanced: true },
  var: { label: t('Compteur'), icon: '🔢', color: '#e64aa0', help: t('Un nombre qui change pendant l’histoire : points, courage, nombre d’essais…'), advanced: true },
  loop: { label: t('Retour'), icon: '🔁', color: '#14b0a6', help: t('Revenir à un bloc précédent pour créer une boucle, ou recommencer depuis le début.'), advanced: true },
  end: { label: t('Fin'), icon: '🏁', color: '#e5484d', help: t('L’histoire se termine. Elle peut être heureuse, triste, secrète…') },
};

export const PALETTE_ORDER: BlockType[] = ['scene', 'choice', 'end', 'item', 'cond', 'var', 'loop', 'start'];

export const END_KINDS = [
  { kind: 'happy', icon: '😊', label: t('Heureuse') },
  { kind: 'sad', icon: '😢', label: t('Triste') },
  { kind: 'secret', icon: '🤫', label: t('Secrète') },
  { kind: 'other', icon: '✨', label: t('Autre') },
] as const;

export const ITEM_ICONS = ['🔑', '🗝️', '🪙', '💎', '🗡️', '🛡️', '📜', '🧪', '🍎', '🔦', '🪄', '🐚', '🎁', '🧭', '🪶', '⭐'];
