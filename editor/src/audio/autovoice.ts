// Applique la voix automatique à une copie du projet : chaque texte sans enregistrement reçoit un son synthétisé.
import { assignSlotSound, hasAudio, slotText, soundSlots, type Project } from '../model/project';
import { autoSound } from './tts';

export function autoVoiceSlots(p: Project): { block: string; key: string; text: string }[] {
  if (!p.autoVoice) return [];
  return p.blocks.flatMap((b) => soundSlots(b).filter((s) => !hasAudio(s.sound) && slotText(b, s.key)).map((s) => ({ block: b.id, key: s.key, text: slotText(b, s.key) })));
}

export async function withAutoVoices(p: Project, progress?: (done: number, total: number) => void): Promise<Project> {
  const todo = autoVoiceSlots(p);
  if (!todo.length) return p;
  const q = structuredClone(p) as Project;
  for (let i = 0; i < todo.length; i++) {
    progress?.(i, todo.length);
    const b = q.blocks.find((x) => x.id === todo[i].block)!;
    assignSlotSound(b, todo[i].key, await autoSound(todo[i].text));
  }
  progress?.(todo.length, todo.length);
  return q;
}
