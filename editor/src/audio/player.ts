// Lecture d'un seul son à la fois, et enregistrement au microphone.
import { useSyncExternalStore } from 'react';
import { t } from '../i18n';
import type { Sound } from '../model/project';
import { audioContext } from './media';
import { renderSound } from './mixer';

let current: { src: AudioBufferSourceNode; key: string; startedAt: number; offset: number } | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const cache = new Map<string, Promise<AudioBuffer | null>>();

/** Clé du son en cours de lecture (pour afficher ▶/⏹), ou null. */
export function usePlayingKey(): string | null {
  return useSyncExternalStore((l) => (listeners.add(l), () => listeners.delete(l)), () => current?.key ?? null);
}

/** Position de lecture en secondes, à interroger dans une boucle d'animation. */
export function playPosition(): number {
  return current ? current.offset + audioContext().currentTime - current.startedAt : 0;
}

export async function soundBuffer(s: Sound | null): Promise<AudioBuffer | null> {
  if (!s) return null;
  const k = JSON.stringify(s);
  let p = cache.get(k);
  if (!p) {
    const ctx = audioContext();
    p = renderSound(s, ctx.sampleRate).then((data) => {
      if (!data) return null;
      const b = ctx.createBuffer(1, data.length, ctx.sampleRate);
      b.copyToChannel(data as Float32Array<ArrayBuffer>, 0);
      return b;
    });
    p.catch(() => cache.delete(k));
    if (cache.size > 60) cache.delete(cache.keys().next().value!);
    cache.set(k, p);
  }
  return p;
}

export function stop() {
  if (!current) return;
  const c = current;
  current = null;
  c.src.onended = null;
  c.src.stop();
  emit();
}

/** Joue un tampon ; `onEnd` est appelé seulement si la lecture va jusqu'au bout. */
export async function playBuffer(buf: AudioBuffer | null, key: string, onEnd?: () => void, offset = 0) {
  stop();
  if (!buf) { onEnd?.(); return; }
  const ctx = audioContext();
  await ctx.resume();
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.connect(ctx.destination);
  src.onended = () => { if (current?.src === src) { current = null; emit(); onEnd?.(); } };
  src.start(0, offset);
  current = { src, key, startedAt: ctx.currentTime, offset };
  emit();
}

export async function playSound(s: Sound | null, key: string, onEnd?: () => void) {
  playBuffer(await soundBuffer(s), key, onEnd);
}

export async function toggleSound(s: Sound | null, key: string) {
  if (current?.key === key) stop(); else await playSound(s, key);
}

// --- Enregistrement ---

let rec: { mr: MediaRecorder; stream: MediaStream; chunks: Blob[] } | null = null;

export async function startRecording() {
  stop();
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mr = new MediaRecorder(stream);
  const chunks: Blob[] = [];
  mr.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  mr.start();
  rec = { mr, stream, chunks };
}

export function stopRecording(): Promise<Blob> {
  const r = rec;
  rec = null;
  if (!r) return Promise.reject(new Error(t('Aucun enregistrement en cours')));
  return new Promise((resolve) => {
    r.mr.onstop = () => {
      r.stream.getTracks().forEach((t) => t.stop());
      resolve(new Blob(r.chunks, { type: r.mr.mimeType || 'audio/webm' }));
    };
    r.mr.stop();
  });
}
