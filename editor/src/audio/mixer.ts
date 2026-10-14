// Mixage d'un son multipiste en un seul signal mono. Utilisé par la prévisualisation ET par l'export,
// pour que ce que l'enfant entend dans l'éditeur soit ce qu'il entendra sur l'appareil.
import { soundDuration, type Sound, type Track } from '../model/project';
import { decode } from './media';

export function audibleTracks(s: Sound): Track[] {
  const solo = s.tracks.some((t) => t.solo);
  return s.tracks.filter((t) => !t.muted && (!solo || t.solo) && t.clips.length);
}

async function renderTracks(tracks: Track[], length: number, sampleRate: number): Promise<Float32Array> {
  const ctx = new OfflineAudioContext(1, length, sampleRate);
  for (const t of tracks) {
    const tg = ctx.createGain();
    tg.gain.value = t.volume;
    tg.connect(ctx.destination);
    for (const c of t.clips) {
      const buf = await decode(c.media);
      const dur = Math.max(0, Math.min(c.duration, buf.duration - c.offset));
      if (dur <= 0) continue;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const g = ctx.createGain();
      const end = c.start + dur;
      const fi = Math.min(c.fadeIn, dur), fo = Math.min(c.fadeOut, dur - fi);
      g.gain.setValueAtTime(fi > 0 ? 0 : c.gain, c.start);
      if (fi > 0) g.gain.linearRampToValueAtTime(c.gain, c.start + fi);
      if (fo > 0) { g.gain.setValueAtTime(c.gain, end - fo); g.gain.linearRampToValueAtTime(0, end); }
      src.connect(g).connect(tg);
      src.start(c.start, c.offset, dur);
    }
  }
  return (await ctx.startRendering()).getChannelData(0);
}

/** Abaisse `bg` quand `voice` parle (ducking), avec attaque/relâche douces. */
export function duck(voice: Float32Array, bg: Float32Array, sampleRate: number, depth = 0.7): void {
  const win = Math.round(sampleRate * 0.05);
  const attack = 1 - Math.exp(-1 / (sampleRate * 0.05));
  const release = 1 - Math.exp(-1 / (sampleRate * 0.4));
  let env = 0;
  for (let i = 0; i < bg.length; i += win) {
    let sum = 0;
    const end = Math.min(i + win, voice.length);
    for (let j = i; j < end; j++) sum += voice[j] * voice[j];
    const target = Math.sqrt(sum / Math.max(1, end - i)) > 0.02 ? 1 : 0;
    for (let j = i; j < Math.min(i + win, bg.length); j++) {
      env += (target - env) * (target > env ? attack : release);
      bg[j] *= 1 - depth * env;
    }
  }
}

/** Rend un son en un AudioBuffer mono, ou null s'il est vide. */
export async function renderSound(s: Sound | null, sampleRate = 44100): Promise<Float32Array | null> {
  if (!s) return null;
  const tracks = audibleTracks(s);
  const length = Math.ceil(soundDuration({ ...s, tracks }) * sampleRate);
  if (!tracks.length || length <= 0) return null;
  const voice = tracks.filter((t) => t.role === 'voix');
  const other = tracks.filter((t) => t.role !== 'voix');
  if (!s.duck || !voice.length || !other.length) return clip(await renderTracks(tracks, length, sampleRate));
  const v = await renderTracks(voice, length, sampleRate);
  const o = await renderTracks(other, length, sampleRate);
  duck(v, o, sampleRate);
  for (let i = 0; i < length; i++) o[i] += v[i];
  return clip(o);
}

function clip(a: Float32Array): Float32Array {
  for (let i = 0; i < a.length; i++) a[i] = Math.max(-1, Math.min(1, a[i]));
  return a;
}

/** WAV PCM 16 bits mono. */
export function encodeWav(samples: Float32Array, sampleRate: number): Uint8Array {
  const out = new Uint8Array(44 + samples.length * 2);
  const v = new DataView(out.buffer);
  const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF'); v.setUint32(4, 36 + samples.length * 2, true); str(8, 'WAVE');
  str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  str(36, 'data'); v.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) v.setInt16(44 + i * 2, Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), true);
  return out;
}

/** Pic d'amplitude d'un extrait (pour la normalisation). */
export async function peakOf(media: string, offset: number, duration: number): Promise<number> {
  const b = await decode(media);
  const sr = b.sampleRate, from = Math.floor(offset * sr), to = Math.min(b.length, Math.ceil((offset + duration) * sr));
  let peak = 0;
  for (let ch = 0; ch < b.numberOfChannels; ch++) {
    const d = b.getChannelData(ch);
    for (let i = from; i < to; i++) peak = Math.max(peak, Math.abs(d[i]));
  }
  return peak;
}
