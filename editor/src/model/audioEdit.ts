// Opérations d'édition non destructives sur un son multipiste. Les fichiers d'origine ne sont jamais modifiés :
// un extrait (clip) n'est qu'une fenêtre (offset, duration) sur un média, posée à `start` sur la piste.
import { uid, type Clip, type Sound, type Track } from './project';

const EPS = 0.01;
export const clipEnd = (c: Clip) => c.start + c.duration;

function mapTrack(s: Sound, trackId: string, fn: (t: Track) => Track): Sound {
  return { ...s, tracks: s.tracks.map((t) => (t.id === trackId ? fn(t) : t)) };
}

export function findClip(s: Sound, clipId: string): { track: Track; clip: Clip } | null {
  for (const track of s.tracks) for (const clip of track.clips) if (clip.id === clipId) return { track, clip };
  return null;
}

/** Coupe un extrait en deux au temps `t` (secondes sur la piste). Renvoie aussi l'id de la 2e moitié. */
export function split(s: Sound, clipId: string, t: number): { sound: Sound; right: string | null } {
  const f = findClip(s, clipId);
  if (!f || t <= f.clip.start + EPS || t >= clipEnd(f.clip) - EPS) return { sound: s, right: null };
  const c = f.clip, cut = t - c.start;
  const a: Clip = { ...c, duration: cut, fadeOut: 0, fadeIn: Math.min(c.fadeIn, cut) };
  const b: Clip = { ...c, id: uid(), start: t, offset: c.offset + cut, duration: c.duration - cut, fadeIn: 0, fadeOut: Math.min(c.fadeOut, c.duration - cut) };
  return { sound: mapTrack(s, f.track.id, (tr) => ({ ...tr, clips: tr.clips.flatMap((x) => (x.id === clipId ? [a, b] : [x])) })), right: b.id };
}

/** Isole la portion [from, to] d'un extrait dans son propre extrait ; renvoie son id. */
export function isolate(s: Sound, clipId: string, from: number, to: number): { sound: Sound; clip: string } {
  let r = split(s, clipId, to);
  const s1 = r.sound;
  r = split(s1, clipId, from);
  return { sound: r.sound, clip: r.right ?? clipId };
}

/** Supprime la portion [from, to] d'un extrait et recolle la suite de la piste. */
export function deleteRange(s: Sound, clipId: string, from: number, to: number): Sound {
  const f = findClip(s, clipId);
  if (!f) return s;
  from = Math.max(from, f.clip.start);
  to = Math.min(to, clipEnd(f.clip));
  if (to - from < EPS) return s;
  const gap = to - from;
  const { sound, clip } = isolate(s, clipId, from, to);
  return mapTrack(sound, f.track.id, (tr) => ({
    ...tr,
    clips: tr.clips.filter((x) => x.id !== clip).map((x) => (x.start >= to - EPS ? { ...x, start: x.start - gap } : x)),
  }));
}

/** Ne garde que la portion [from, to] de l'extrait (rogner). */
export function keepRange(s: Sound, clipId: string, from: number, to: number): Sound {
  const f = findClip(s, clipId);
  if (!f) return s;
  from = Math.max(from, f.clip.start);
  to = Math.min(to, clipEnd(f.clip));
  if (to - from < EPS) return s;
  return updateClip(s, clipId, (c) => ({ ...c, start: from, offset: c.offset + (from - c.start), duration: to - from, fadeIn: Math.min(c.fadeIn, to - from), fadeOut: Math.min(c.fadeOut, to - from) }));
}

export function updateClip(s: Sound, clipId: string, fn: (c: Clip) => Clip): Sound {
  return { ...s, tracks: s.tracks.map((t) => ({ ...t, clips: t.clips.map((c) => (c.id === clipId ? fn(c) : c)) })) };
}

export function removeClip(s: Sound, clipId: string): Sound {
  return { ...s, tracks: s.tracks.map((t) => ({ ...t, clips: t.clips.filter((c) => c.id !== clipId) })) };
}

/** Fondu enchaîné avec l'extrait suivant de la même piste : on les fait se chevaucher de `d` secondes. */
export function crossfade(s: Sound, clipId: string, d = 1): Sound {
  const f = findClip(s, clipId);
  if (!f) return s;
  const next = f.track.clips.filter((c) => c.id !== clipId && c.start >= f.clip.start).sort((a, b) => a.start - b.start)[0];
  if (!next) return s;
  d = Math.min(d, f.clip.duration / 2, next.duration / 2);
  const shift = next.start - (clipEnd(f.clip) - d);
  return mapTrack(s, f.track.id, (tr) => ({
    ...tr,
    clips: tr.clips.map((c) => {
      if (c.id === clipId) return { ...c, fadeOut: d };
      if (c.id === next.id) return { ...c, start: c.start - shift, fadeIn: d };
      return c.start > next.start ? { ...c, start: Math.max(0, c.start - shift) } : c;
    }),
  }));
}
