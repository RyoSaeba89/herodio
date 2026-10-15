import { useEffect, useState } from 'react';
import { addMedia, AUDIO_ACCEPT } from '../audio/media';
import { startRecording, stopRecording, stop, toggleSound, usePlayingKey, playSound } from '../audio/player';
import { pickFiles } from '../io/files';
import { synthesize } from '../audio/tts';
import { hasAudio, simpleSound, soundDuration, type Sound } from '../model/project';
import { useStore } from '../store';
import { attachMedia, fmtDur, fmtTime, setSlotSound } from './sound';

let recordingKey: string | null = null;

/** Un emplacement sonore : enregistrer, écouter, importer, choisir une prise, ouvrir le studio. */
export function SoundSlot({ slotKey, sound, label, text = '' }: { slotKey: string; sound: Sound | null; label: string; text?: string }) {
  const media = useStore((s) => s.project.media);
  const advanced = useStore((s) => s.project.level === 'avance');
  const autoVoice = useStore((s) => s.project.autoVoice);
  const [speaking, setSpeaking] = useState(false);
  const playingKey = usePlayingKey();
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState('');
  const [over, setOver] = useState(false);
  const takes = media.filter((m) => m.owner === slotKey);
  const has = hasAudio(sound);
  const voiceClip = sound?.tracks.find((t) => t.role === 'voix')?.clips[0];
  const multi = (sound?.tracks.length ?? 0) > 1 || (sound?.tracks[0]?.clips.length ?? 0) > 1;

  useEffect(() => {
    if (!recording) return;
    const t0 = Date.now();
    const i = setInterval(() => setElapsed((Date.now() - t0) / 1000), 200);
    return () => clearInterval(i);
  }, [recording]);

  const record = async () => {
    setError('');
    if (recording) {
      setRecording(false);
      recordingKey = null;
      try {
        const blob = await stopRecording();
        const m = await addMedia(blob, `Prise ${takes.length + 1} – ${label}`, 'enregistrement', slotKey);
        attachMedia(slotKey, m);
        playSound(simpleSound(m), slotKey);
      } catch (e) { setError((e as Error).message); }
      return;
    }
    if (recordingKey) return;
    try {
      await startRecording();
      recordingKey = slotKey;
      setElapsed(0);
      setRecording(true);
    } catch {
      setError('Je n’arrive pas à utiliser le micro. Vérifie qu’il est branché et autorisé.');
    }
  };

  const importFile = async () => {
    setError('');
    const [f] = await pickFiles(AUDIO_ACCEPT);
    if (!f) return;
    try { attachMedia(slotKey, await addMedia(f, f.name.replace(/\.\w+$/, ''), 'voix', slotKey)); }
    catch (e) { setError((e as Error).message); }
  };

  /** Transforme la voix automatique en vraie prise, modifiable dans le studio. */
  const makeVoice = async () => {
    setError(''); setSpeaking(true);
    try {
      const m = await addMedia(await synthesize(text), `Voix auto – ${label}`, 'voix', slotKey);
      attachMedia(slotKey, m);
      playSound(simpleSound(m), slotKey);
    } catch (e) { setError('La voix automatique n’a pas fonctionné : ' + (e as Error).message); }
    finally { setSpeaking(false); }
  };

  const onDrop = (e: React.DragEvent) => {
    setOver(false);
    const id = e.dataTransfer.getData('application/herodio-media');
    const m = media.find((x) => x.id === id);
    if (m) { e.preventDefault(); e.stopPropagation(); attachMedia(slotKey, m); }
  };

  return (
    <div className={'slot' + (over ? ' over' : '')} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={onDrop}>
      <div className="slot-row">
        <button className={'btn rec' + (recording ? ' on' : '')} onClick={record} title={recording ? 'Arrêter l’enregistrement' : 'Enregistrer ta voix'}>
          {recording ? `⏹ Arrêter ${fmtTime(elapsed)}` : '🔴 Enregistrer'}
        </button>
        <button className="btn" disabled={!has || recording} onClick={() => toggleSound(sound, slotKey)}>
          {playingKey === slotKey ? '⏹ Stop' : '▶ Écouter'}
        </button>
        <button className="btn ghost" onClick={importFile} disabled={recording} title="Choisir un fichier son sur l’ordinateur">📁</button>
        {autoVoice && text.trim() && (
          <button className="btn ghost" onClick={makeVoice} disabled={recording || speaking} title="Créer une prise avec la voix automatique (tu pourras la modifier)">{speaking ? '⏳' : '🗣️'}</button>
        )}
        {advanced && <button className="btn ghost" onClick={() => { stop(); useStore.getState().openStudio(slotKey); }} title="Ouvrir le studio audio (couper, mixer, fondus…)">🎛️</button>}
        {has && <button className="btn ghost" onClick={() => setSlotSound(slotKey, null)} title="Retirer le son">🗑️</button>}
      </div>
      <div className="slot-info">
        {has ? `🔊 ${fmtDur(soundDuration(sound))}${multi ? ' · mixage ' + sound!.tracks.length + ' pistes' : ''}`
          : autoVoice && text.trim() ? '🗣️ Lu par la voix automatique (enregistre ta voix pour la remplacer)' : 'Pas encore de son — enregistre ou glisse un son ici'}
      </div>
      {takes.length > 1 && (
        <div className="takes">
          {takes.map((t, i) => (
            <button key={t.id} className={'take' + (voiceClip?.media === t.id ? ' on' : '')} onClick={() => attachMedia(slotKey, t)} title={t.name}>
              Prise {i + 1}
            </button>
          ))}
        </div>
      )}
      {error && <div className="error">{error}</div>}
    </div>
  );
}
