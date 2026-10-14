import { describe, expect, it } from 'vitest';
import { crossfade, deleteRange, isolate, keepRange, split } from './audioEdit';
import type { Sound } from './project';

const sound = (): Sound => ({
  duck: false,
  tracks: [{
    id: 't', name: 'Voix', role: 'voix', volume: 1, muted: false, solo: false,
    clips: [
      { id: 'a', media: 'm', start: 0, offset: 2, duration: 10, gain: 1, fadeIn: 0.5, fadeOut: 0.5 },
      { id: 'b', media: 'm', start: 12, offset: 0, duration: 4, gain: 1, fadeIn: 0, fadeOut: 0 },
    ],
  }],
});
const clips = (s: Sound) => s.tracks[0].clips.map(({ id, start, offset, duration }) => ({ id, start, offset, duration }));

describe('édition audio', () => {
  it('coupe un extrait en deux', () => {
    const { sound: s, right } = split(sound(), 'a', 4);
    const c = clips(s);
    expect(c[0]).toEqual({ id: 'a', start: 0, offset: 2, duration: 4 });
    expect(c[1]).toEqual({ id: right, start: 4, offset: 6, duration: 6 });
    expect(s.tracks[0].clips[0].fadeOut).toBe(0);
    expect(s.tracks[0].clips[1].fadeIn).toBe(0);
  });

  it('ignore une coupe hors de l’extrait', () => {
    expect(split(sound(), 'a', 11).right).toBeNull();
  });

  it('supprime une portion et recolle la suite', () => {
    const c = clips(deleteRange(sound(), 'a', 3, 5));
    expect(c.map((x) => [x.start, x.offset, x.duration])).toEqual([[0, 2, 3], [3, 7, 5], [10, 0, 4]]);
  });

  it('isole une portion', () => {
    const r = isolate(sound(), 'a', 3, 5);
    expect(clips(r.sound).find((x) => x.id === r.clip)).toMatchObject({ start: 3, offset: 5, duration: 2 });
  });

  it('rogne un extrait', () => {
    expect(clips(keepRange(sound(), 'a', 1, 4))[0]).toEqual({ id: 'a', start: 1, offset: 3, duration: 3 });
  });

  it('crée un fondu enchaîné', () => {
    const s = crossfade(sound(), 'a', 1);
    const [a, b] = s.tracks[0].clips;
    expect(b.start).toBe(9);
    expect(a.fadeOut).toBe(1);
    expect(b.fadeIn).toBe(1);
  });
});
