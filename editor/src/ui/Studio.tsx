// Studio audio : un « mini-Audacity » pour enfants. Les modifications passent par le projet → annuler/rétablir.
import { useEffect, useRef, useState } from 'react';
import { addMedia, decode } from '../audio/media';
import { peakOf } from '../audio/mixer';
import { playBuffer, playPosition, soundBuffer, startRecording, stop, stopRecording, usePlayingKey } from '../audio/player';
import { clipEnd, crossfade, deleteRange, findClip, isolate, keepRange, removeClip, split, updateClip } from '../model/audioEdit';
import { soundDuration, uid, type Clip, type Sound, type Track, type TrackRole } from '../model/project';
import { LOCALE, t } from '../i18n';
import { useStore } from '../store';
import { fmtTime, getSlotSound, roleOf, setSlotSound } from './sound';

const ROLES: Record<TrackRole, { icon: string; label: string }> = {
  voix: { icon: '🗣️', label: t('Voix') },
  ambiance: { icon: '🌲', label: t('Ambiance') },
  bruitage: { icon: '🚪', label: t('Bruitage') },
};

interface Sel { clip: string; from: number; to: number }

function Waveform({ clip, pps, color }: { clip: Clip; pps: number; color: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const width = Math.max(2, Math.round(clip.duration * pps));
  useEffect(() => {
    let alive = true;
    decode(clip.media).then((b) => {
      const cv = ref.current;
      if (!alive || !cv) return;
      const g = cv.getContext('2d')!;
      const h = cv.height, data = b.getChannelData(0), sr = b.sampleRate;
      g.clearRect(0, 0, cv.width, h);
      g.fillStyle = color;
      const from = clip.offset * sr, per = (clip.duration * sr) / cv.width;
      for (let x = 0; x < cv.width; x++) {
        let min = 0, max = 0;
        const a = Math.floor(from + x * per), z = Math.min(data.length, Math.floor(from + (x + 1) * per));
        for (let i = a; i < z; i += Math.max(1, Math.floor((z - a) / 200))) { const v = data[i]; if (v < min) min = v; if (v > max) max = v; }
        const amp = Math.min(1, clip.gain);
        g.fillRect(x, h / 2 - max * amp * h / 2, 1, Math.max(1, (max - min) * amp * h / 2));
      }
    }).catch(() => {});
    return () => { alive = false; };
  }, [clip.media, clip.offset, clip.duration, clip.gain, width, color]);
  return <canvas ref={ref} width={width} height={64} className="wave" />;
}

export function Studio({ slotKey }: { slotKey: string }) {
  const project = useStore((s) => s.project);
  const sound: Sound = getSlotSound(slotKey) ?? { duck: false, tracks: [] };
  const playing = usePlayingKey() === 'studio';
  const [pps, setPps] = useState(60);
  const [cursor, setCursor] = useState(0);
  const [tool, setTool] = useState<'select' | 'move'>('select');
  const [selClip, setSelClip] = useState<string | null>(null);
  const [sel, setSel] = useState<Sel | null>(null);
  const [rec, setRec] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [err, setErr] = useState('');
  const headRef = useRef<HTMLDivElement>(null);

  const set = (s: Sound, history = true) => setSlotSound(slotKey, s, history);
  const total = Math.max(soundDuration(sound) + 4, 15);

  // Tête de lecture animée
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const tick = () => {
      const t = playPosition();
      if (headRef.current) headRef.current.style.left = `${t * pps}px`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, pps]);

  useEffect(() => () => stop(), []);

  const playFrom = async (t: number) => {
    const b = await soundBuffer(sound);
    if (b && t < b.duration) playBuffer(b, 'studio', undefined, t);
  };

  const close = () => { stop(); useStore.getState().openStudio(null); };

  // --- Interaction souris sur les extraits ---
  const timeAt = (e: React.PointerEvent | PointerEvent, lane: HTMLElement) => Math.max(0, (e.clientX - lane.getBoundingClientRect().left) / pps);

  const onClipDown = (e: React.PointerEvent, track: Track, c: Clip) => {
    e.stopPropagation();
    const lane = (e.currentTarget as HTMLElement).parentElement!;
    const t0 = timeAt(e, lane);
    const box = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const edge = e.clientX - box.left < 8 ? 'left' : box.right - e.clientX < 8 ? 'right' : null;
    setSelClip(c.id);
    useStore.getState().checkpoint();
    const start = { ...c };
    const mode = edge ? 'trim-' + edge : tool;
    if (mode === 'select') { setSel({ clip: c.id, from: t0, to: t0 }); setCursor(t0); }
    const move = (ev: PointerEvent) => {
      const t = timeAt(ev, lane), dt = t - t0;
      const cur = getSlotSound(slotKey);
      if (!cur) return;
      if (mode === 'select') setSel({ clip: c.id, from: Math.max(c.start, Math.min(t0, t)), to: Math.min(clipEnd(c), Math.max(t0, t)) });
      else if (mode === 'move') set(updateClip(cur, c.id, (x) => ({ ...x, start: Math.max(0, start.start + dt) })), false);
      else if (mode === 'trim-left') {
        const d = Math.max(-start.offset, Math.min(start.duration - 0.05, dt));
        set(updateClip(cur, c.id, (x) => ({ ...x, start: start.start + d, offset: start.offset + d, duration: start.duration - d })), false);
      } else if (mode === 'trim-right') {
        decode(c.media).then((b) => {
          const max = b.duration - start.offset;
          const cur2 = getSlotSound(slotKey);
          if (cur2) set(updateClip(cur2, c.id, (x) => ({ ...x, duration: Math.max(0.05, Math.min(max, start.duration + dt)) })), false);
        });
      }
    };
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); setSel((s) => (s && s.to - s.from < 0.02 ? null : s)); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const onLaneDown = (e: React.PointerEvent) => {
    const t = timeAt(e, e.currentTarget as HTMLElement);
    setCursor(t); setSel(null); setSelClip(null);
    if (playing) playFrom(t);
  };

  const onLaneDrop = async (e: React.DragEvent, track: Track) => {
    const id = e.dataTransfer.getData('application/herodio-media');
    const m = project.media.find((x) => x.id === id);
    if (!m) return;
    e.preventDefault();
    const t = timeAt(e as unknown as PointerEvent, e.currentTarget as HTMLElement);
    set({ ...sound, tracks: sound.tracks.map((tr) => tr.id === track.id ? { ...tr, clips: [...tr.clips, newClip(m.id, m.duration, t)] } : tr) });
  };

  // --- Actions ---
  const target = (): { s: Sound; clip: string } | null => {
    if (sel) { const r = isolate(sound, sel.clip, sel.from, sel.to); return { s: r.sound, clip: r.clip }; }
    if (selClip && findClip(sound, selClip)) return { s: sound, clip: selClip };
    return null;
  };
  const onTarget = (fn: (s: Sound, clip: string) => Sound) => {
    const tg = target();
    if (!tg) { setErr(t('Clique d’abord sur un morceau de son (ou sélectionne une partie).')); return; }
    setErr('');
    set(fn(tg.s, tg.clip));
    setSel(null);
    setSelClip(tg.clip);
  };
  const gain = (k: number) => onTarget((s, id) => updateClip(s, id, (c) => ({ ...c, gain: Math.min(8, Math.max(0.05, c.gain * k)) })));
  const fade = (which: 'fadeIn' | 'fadeOut') => onTarget((s, id) => updateClip(s, id, (c) => ({ ...c, [which]: sel ? c.duration : Math.min(1, c.duration / 2) })));
  const normalize = async () => {
    const tg = target();
    if (!tg) { setErr(t('Clique d’abord sur un morceau de son.')); return; }
    const c = findClip(tg.s, tg.clip)!.clip;
    const peak = await peakOf(c.media, c.offset, c.duration);
    if (peak > 0) { set(updateClip(tg.s, tg.clip, (x) => ({ ...x, gain: 0.95 / peak }))); setSel(null); setSelClip(tg.clip); }
  };
  const cut = () => {
    const f = selClip && findClip(sound, selClip);
    const c = f ? f.clip : sound.tracks.flatMap((tr) => tr.clips).find((x) => cursor > x.start && cursor < clipEnd(x));
    if (!c) { setErr(t('Place le curseur sur un morceau de son pour le couper.')); return; }
    setErr('');
    set(split(sound, c.id, cursor).sound);
  };
  const del = () => {
    if (sel) { set(deleteRange(sound, sel.clip, sel.from, sel.to)); setSel(null); }
    else if (selClip) { set(removeClip(sound, selClip)); setSelClip(null); }
  };
  const keep = () => { if (sel) { set(keepRange(sound, sel.clip, sel.from, sel.to)); setSel(null); } };
  const xfade = () => { if (selClip) set(crossfade(sound, selClip)); };

  const updTrack = (id: string, patch: Partial<Track>) => set({ ...sound, tracks: sound.tracks.map((tr) => (tr.id === id ? { ...tr, ...patch } : tr)) });
  const addTrack = (role: TrackRole) => set({ ...sound, tracks: [...sound.tracks, { id: uid(), name: ROLES[role].label, role, volume: role === 'ambiance' ? 0.5 : 1, muted: false, solo: false, clips: [] }] });

  const record = async () => {
    setErr('');
    if (rec) {
      const trackId = rec;
      setRec(null);
      try {
        const blob = await stopRecording();
        const m = await addMedia(blob, t('Prise studio {time}', { time: new Date().toLocaleTimeString(LOCALE) }), 'enregistrement', slotKey);
        const cur = getSlotSound(slotKey) ?? sound;
        set({ ...cur, tracks: cur.tracks.map((tr) => (tr.id === trackId ? { ...tr, clips: [...tr.clips, newClip(m.id, m.duration, cursor)] } : tr)) });
      } catch (e) { setErr((e as Error).message); }
      return;
    }
    let s = sound;
    let track = s.tracks.find((tr) => tr.clips.some((c) => c.id === selClip)) ?? s.tracks.find((tr) => tr.role === 'voix');
    if (!track) { track = { id: uid(), name: t('Voix'), role: 'voix', volume: 1, muted: false, solo: false, clips: [] }; s = { ...s, tracks: [...s.tracks, track] }; set(s); }
    try { await startRecording(); setRec(track.id); }
    catch { setErr(t('Je n’arrive pas à utiliser le micro.')); }
  };

  const addMediaTrack = (id: string) => {
    const m = project.media.find((x) => x.id === id);
    if (!m) return;
    const role = roleOf(m);
    set({ ...sound, duck: sound.duck || role === 'ambiance', tracks: [...sound.tracks, { id: uid(), name: m.name, role, volume: role === 'ambiance' ? 0.5 : 1, muted: false, solo: false, clips: [newClip(m.id, m.duration, cursor)] }] });
    setAdding(false);
  };

  const block = project.blocks.find((b) => b.id === slotKey.split('/')[0]);
  const title = block && 'title' in block ? block.title : '';

  return (
    <div className="modal-back">
      <div className="modal studio">
        <button className="modal-close" onClick={close} title={t('Fermer le studio')}>✕</button>
        <h2>🎛️ {t('Studio audio')} — {title}</h2>
        <div className="studio-bar">
          <button className="btn primary big" onClick={() => (playing ? stop() : playFrom(sel?.from ?? cursor))}>{playing ? t('⏸ Pause') : t('▶ Lecture')}</button>
          <button className="btn big" onClick={() => { stop(); setCursor(0); }}>⏹ {t('Début|studio')}</button>
          <button className={'btn big rec' + (rec ? ' on' : '')} onClick={record}>{rec ? t('⏹ Arrêter') : `🔴 ${t('Enregistrer|micro')}`}</button>
          <span className="time">{fmtTime(cursor)}{sel && ` → ${fmtTime(sel.to)}`}</span>
          <div className="tool-switch">
            <button className={tool === 'select' ? 'on' : ''} onClick={() => setTool('select')} title={t('Glisser sur le son pour en choisir un morceau')}>🖍️ {t('Choisir un morceau')}</button>
            <button className={tool === 'move' ? 'on' : ''} onClick={() => setTool('move')} title={t('Glisser un son pour le déplacer dans le temps')}>✋ {t('Déplacer')}</button>
          </div>
          <button className="btn ghost" onClick={() => setPps((p) => Math.max(10, p / 1.5))} title={t('Dézoomer')}>➖</button>
          <button className="btn ghost" onClick={() => setPps((p) => Math.min(400, p * 1.5))} title={t('Zoomer')}>➕</button>
        </div>
        <div className="studio-tools">
          <button className="btn" onClick={cut}>✂️ {t('Couper')}</button>
          <button className="btn" onClick={del} disabled={!sel && !selClip}>🗑️ {t('Supprimer')}</button>
          <button className="btn" onClick={keep} disabled={!sel}>✂️ {t('Garder seulement ce morceau')}</button>
          <button className="btn" onClick={() => gain(1.25)}>🔊 {t('Plus fort')}</button>
          <button className="btn" onClick={() => gain(0.8)}>🔉 {t('Moins fort')}</button>
          <button className="btn" onClick={normalize} title={t('Règle le volume au maximum sans saturer')}>📏 {t('Volume idéal')}</button>
          <button className="btn" onClick={() => fade('fadeIn')}>🌅 {t('Apparition progressive')}</button>
          <button className="btn" onClick={() => fade('fadeOut')}>🌇 {t('Disparition progressive')}</button>
          <button className="btn" onClick={xfade} disabled={!selClip} title={t('Le son se mélange doucement avec le suivant')}>🔀 {t('Fondu enchaîné')}</button>
        </div>
        {err && <div className="error">{err}</div>}

        <div className="tracks">
          <div className="track-heads">
            <div className="ruler-head" />
            {sound.tracks.map((tr) => (
              <div key={tr.id} className={'track-head role-' + tr.role}>
                <div className="th-name">{ROLES[tr.role].icon} {tr.name}</div>
                <input type="range" min={0} max={1.5} step={0.05} value={tr.volume} title={t('Volume de la piste')}
                  onPointerDown={() => useStore.getState().checkpoint()}
                  onChange={(e) => setSlotSound(slotKey, { ...sound, tracks: sound.tracks.map((x) => (x.id === tr.id ? { ...x, volume: Number(e.target.value) } : x)) }, false)} />
                <div className="th-btns">
                  <button className={'mini' + (tr.muted ? ' on' : '')} onClick={() => updTrack(tr.id, { muted: !tr.muted })} title={t('Muet')}>🔇</button>
                  <button className={'mini' + (tr.solo ? ' on' : '')} onClick={() => updTrack(tr.id, { solo: !tr.solo })} title={t('Écouter seulement cette piste')}>🎧</button>
                  <select value={tr.role} onChange={(e) => updTrack(tr.id, { role: e.target.value as TrackRole })} title={t('Type de piste')}>
                    {Object.entries(ROLES).map(([r, v]) => <option key={r} value={r}>{v.icon} {v.label}</option>)}
                  </select>
                  <button className="mini" onClick={() => set({ ...sound, tracks: sound.tracks.filter((x) => x.id !== tr.id) })} title={t('Supprimer la piste')}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
          <div className="lanes">
            <div style={{ width: total * pps, position: 'relative' }}>
              <div className="ruler" onPointerDown={onLaneDown}>
                {Array.from({ length: Math.ceil(total) + 1 }, (_, i) => i).filter((i) => i % (pps < 25 ? 10 : pps < 50 ? 5 : 1) === 0).map((i) => (
                  <span key={i} style={{ left: i * pps }}>{fmtTime(i)}</span>
                ))}
              </div>
              {sound.tracks.map((tr) => (
                <div key={tr.id} className={'lane role-' + tr.role} onPointerDown={onLaneDown} onDragOver={(e) => e.preventDefault()} onDrop={(e) => onLaneDrop(e, tr)}>
                  {tr.clips.map((c) => {
                    const m = project.media.find((x) => x.id === c.media);
                    return (
                      <div key={c.id} className={'clip' + (selClip === c.id ? ' sel' : '') + (tool === 'move' ? ' movable' : '')}
                        style={{ left: c.start * pps, width: Math.max(2, c.duration * pps) }} onPointerDown={(e) => onClipDown(e, tr, c)} title={m?.name}>
                        <Waveform clip={c} pps={pps} color={tr.role === 'voix' ? '#3b7ff5' : tr.role === 'ambiance' ? '#22a559' : '#f28a1c'} />
                        {c.fadeIn > 0 && <div className="fade in" style={{ width: c.fadeIn * pps }} />}
                        {c.fadeOut > 0 && <div className="fade out" style={{ width: c.fadeOut * pps }} />}
                        <span className="clip-name">{m?.name ?? '⚠ ' + t('son introuvable')}</span>
                      </div>
                    );
                  })}
                  {sel && tr.clips.some((c) => c.id === sel.clip) && <div className="clip-selection" style={{ left: sel.from * pps, width: (sel.to - sel.from) * pps }} />}
                </div>
              ))}
              <div className="cursor" style={{ left: cursor * pps }} />
              {playing && <div className="playhead" ref={headRef} />}
            </div>
          </div>
        </div>

        <div className="studio-foot">
          <button className="btn" onClick={() => addTrack('voix')}>＋ {t('Piste voix')}</button>
          <button className="btn" onClick={() => addTrack('ambiance')}>＋ {t('Piste ambiance')}</button>
          <button className="btn" onClick={() => addTrack('bruitage')}>＋ {t('Piste bruitage')}</button>
          <div className="add-media">
            <button className="btn" onClick={() => setAdding(!adding)}>🎵 {t('Ajouter un son de la bibliothèque')}</button>
            {adding && (
              <div className="menu up">
                {project.media.length === 0 && <div className="menu-title">{t('La bibliothèque est vide.')}</div>}
                {project.media.map((m) => <button key={m.id} onClick={() => addMediaTrack(m.id)}>{ROLES[roleOf(m)].icon} {m.name}</button>)}
              </div>
            )}
          </div>
          <label className="check duck">
            <input type="checkbox" checked={sound.duck} onChange={(e) => set({ ...sound, duck: e.target.checked })} />
            {t('Baisser l’ambiance quand quelqu’un parle')}
          </label>
          <span className="flex" />
          <button className="btn primary" onClick={close}>✔ {t('Terminé')}</button>
        </div>
      </div>
    </div>
  );
}

function newClip(media: string, duration: number, start: number): Clip {
  return { id: uid(), media, start, offset: 0, duration, gain: 1, fadeIn: 0, fadeOut: 0 };
}
