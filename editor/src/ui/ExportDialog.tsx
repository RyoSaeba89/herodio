import { useState } from 'react';
import { saveBytes } from '../io/files';
import { buildPack, diagnose, estimate, mb, PLATFORMS, type Platform } from '../io/exportPack';
import type { Issue } from '../model/validate';
import { useStore } from '../store';
import { fmtTime } from './sound';

const HOWTO: Record<Platform['id'], string> = {
  windows: 'Ouvre le fichier .aistory avec le lecteur Herodio pour Windows (ou glisse-le dans sa fenêtre).',
  rpi: 'Copie le fichier .aistory dans le dossier « histoires » du Raspberry Pi, puis lance le lecteur Herodio.',
  android: 'Copie le fichier .aistory sur le téléphone, puis ouvre-le depuis l’application Herodio (bouton « Importer »).',
  android2: 'Copie le fichier .aistory dans le dossier « Herodio » de la carte SD du téléphone, puis lance l’application.',
  cardputer: 'Décompresse l’archive à la racine de la carte microSD (un dossier « herodio » apparaît), puis insère la carte dans le Cardputer.',
};

export function ExportDialog({ issues, onClose }: { issues: Issue[]; onClose: () => void }) {
  const project = useStore((s) => s.project);
  const [pf, setPf] = useState<Platform>(PLATFORMS[0]);
  const [busy, setBusy] = useState<number | null>(null);
  const [step, setStep] = useState('');
  const [done, setDone] = useState('');
  const [error, setError] = useState('');
  const errors = issues.filter((i) => i.level === 'error');
  const est = estimate(project, pf);
  const notes = diagnose(project, pf);

  const run = async () => {
    setError(''); setDone(''); setBusy(0);
    try {
      const pack = await buildPack(project, pf, (d, t, st) => { setStep(st === 'voix' ? 'La voix lit ton histoire' : 'Mixage des sons'); setBusy(t ? d / t : 1); });
      const saved = await saveBytes(pack.name, pack.bytes, pf.output === 'sd' ? { name: 'Archive ZIP', extensions: ['zip'] } : { name: 'Pack Herodio', extensions: ['aistory'] });
      if (saved) setDone(`✔ Pack créé (${mb(pack.bytes.length)}) : ${saved}`);
    } catch (e) {
      setError('L’export a échoué : ' + (e as Error).message);
    } finally { setBusy(null); }
  };

  return (
    <div className="modal-back">
      <div className="modal export">
        <button className="modal-close" onClick={onClose} title="Fermer">✕</button>
        <h2>📦 Exporter mon histoire</h2>
        <p className="hint">Choisis l’appareil sur lequel tu veux écouter « {project.title} ».</p>
        <div className="platforms">
          {PLATFORMS.map((x) => (
            <button key={x.id} className={'platform' + (x.id === pf.id ? ' on' : '')} onClick={() => { setPf(x); setDone(''); }}>
              <span className="pf-icon">{x.icon}</span>
              <b>{x.name}</b>
              <small>{x.desc}</small>
            </button>
          ))}
        </div>
        <div className="export-info">
          <div>🔊 {est.files} son(s) · {fmtTime(est.seconds)} d’écoute · environ <b>{mb(est.bytes)}</b></div>
          <div className="hint">{HOWTO[pf.id]}</div>
          {notes.map((n) => <div key={n} className="issue warning">⚠️ {n}</div>)}
          {errors.length > 0 && (
            <div className="issue error">⛔ Ton histoire contient {errors.length} erreur(s). Corrige-les d’abord (bouton ⛔ en haut) pour qu’elle fonctionne sur l’appareil.</div>
          )}
        </div>
        {busy !== null && <div className="progress"><div style={{ width: `${Math.round(busy * 100)}%` }} /></div>}
        {done && <div className="done">{done}</div>}
        {error && <div className="error">{error}</div>}
        <div className="export-actions">
          <button className="btn" onClick={onClose}>Fermer</button>
          <button className="btn export-btn" disabled={busy !== null || errors.length > 0} onClick={run}>
            {busy !== null ? `${step || 'Préparation'}… ${Math.round(busy * 100)} %` : `📦 Exporter pour ${pf.name}`}
          </button>
        </div>
      </div>
    </div>
  );
}
