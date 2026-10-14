import { hasAudio, simpleSound, soundSlots, uid, type Media, type Sound, type TrackRole } from '../model/project';
import { useStore } from '../store';

export function getSlotSound(key: string): Sound | null {
  const [bid] = key.split('/');
  const b = useStore.getState().project.blocks.find((x) => x.id === bid);
  return (b && soundSlots(b).find((s) => s.key === key)?.sound) ?? null;
}

export function setSlotSound(key: string, sound: Sound | null, history = true) {
  const [bid, oid] = key.split('/');
  useStore.getState().update((p) => {
    const b = p.blocks.find((x) => x.id === bid);
    if (!b) return;
    if (oid && b.type === 'choice') { const o = b.options.find((x) => x.id === oid); if (o) o.sound = sound; }
    else if (!oid && (b.type === 'scene' || b.type === 'choice' || b.type === 'end')) b.sound = sound;
  }, history);
}

export const roleOf = (m: Media): TrackRole =>
  m.category === 'ambiance' || m.category === 'musique' ? 'ambiance' : m.category === 'bruitage' ? 'bruitage' : 'voix';

/** Ajoute un son à un emplacement : une voix remplace la voix existante, une ambiance ou un bruitage s'ajoute sur une nouvelle piste. */
export function attachMedia(key: string, m: Media) {
  const cur = getSlotSound(key);
  const role = roleOf(m);
  if (!hasAudio(cur)) { setSlotSound(key, simpleSound(m, role)); return; }
  const s = structuredClone(cur) as Sound;
  const clip = { id: uid(), media: m.id, start: 0, offset: 0, duration: m.duration, gain: 1, fadeIn: 0, fadeOut: 0 };
  const voice = s.tracks.find((t) => t.role === 'voix');
  if (role === 'voix' && voice) voice.clips = [clip];
  else {
    s.tracks.push({ id: uid(), name: m.name, role, volume: role === 'ambiance' ? 0.5 : 1, muted: false, solo: false, clips: [clip] });
    if (role === 'ambiance') s.duck = true;
  }
  setSlotSound(key, s);
}

export function attachMediaToBlock(blockId: string, mediaId: string) {
  const m = useStore.getState().project.media.find((x) => x.id === mediaId);
  const b = useStore.getState().project.blocks.find((x) => x.id === blockId);
  if (m && b && soundSlots(b).length) attachMedia(blockId, m);
}

export const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
export const fmtDur = (s: number) => (s < 60 ? `${s.toFixed(1).replace('.', ',')} s` : fmtTime(s));
