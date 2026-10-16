import { useState } from 'react';
import { t } from '../i18n';
import { saveBytes } from '../io/files';
import { buildPack, diagnose, estimate, mb, PLATFORMS, type Platform } from '../io/exportPack';
import type { Issue } from '../model/validate';
import { useStore } from '../store';
import { fmtTime } from './sound';

const HOWTO: Record<Platform['id'], string> = {
  windows: t('Ouvre le fichier .aistory avec le lecteur Herodio pour Windows (ou glisse-le dans sa fenêtre).'),
  rpi: t('Copie le fichier .aistory dans le dossier « histoires » du Raspberry Pi, puis lance le lecteur Herodio.'),
  android: t('Copie le fichier .aistory sur le téléphone, puis ouvre-le depuis l’application Herodio (bouton « Ajouter une histoire »).'),
  android2: t('Copie le fichier .aistory dans le dossier « Herodio » de la carte SD du téléphone, puis lance l’application.'),
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
      const pack = await buildPack(project, pf, (d, total, st) => { setStep(st === 'voix' ? t('La voix lit ton histoire') : t('Mixage des sons')); setBusy(total ? d / total : 1); });
      const saved = await saveBytes(pack.name, pack.bytes, { name: t('Pack Herodio'), extensions: ['aistory'] });
      if (saved) setDone(t('✔ Pack créé ({size}) : {file}', { size: mb(pack.bytes.length), file: saved }));
    } catch (e) {
      setError(t('L’export a échoué : {msg}', { msg: (e as Error).message }));
    } finally { setBusy(null); }
  };

  return (
    <div className="modal-back">
      <div className="modal export">
        <button className="modal-close" onClick={onClose} title={t('Fermer')}>✕</button>
        <h2>📦 {t('Exporter mon histoire')}</h2>
        <p className="hint">{t('Choisis l’appareil sur lequel tu veux écouter « {title} ».', { title: project.title })}</p>
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
          <div>🔊 {t('{n} son(s) · {time} d’écoute · environ', { n: est.files, time: fmtTime(est.seconds) })} <b>{mb(est.bytes)}</b></div>
          <div className="hint">{HOWTO[pf.id]}</div>
          {notes.map((n) => <div key={n} className="issue warning">⚠️ {n}</div>)}
          {errors.length > 0 && (
            <div className="issue error">⛔ {t('Ton histoire contient {n} erreur(s). Corrige-les d’abord (bouton ⛔ en haut) pour qu’elle fonctionne sur l’appareil.', { n: errors.length })}</div>
          )}
        </div>
        {busy !== null && <div className="progress"><div style={{ width: `${Math.round(busy * 100)}%` }} /></div>}
        {done && <div className="done">{done}</div>}
        {error && <div className="error">{error}</div>}
        <div className="export-actions">
          <button className="btn" onClick={onClose}>{t('Fermer')}</button>
          <button className="btn export-btn" disabled={busy !== null || errors.length > 0} onClick={run}>
            {busy !== null ? `${step || t('Préparation')}… ${Math.round(busy * 100)} %` : `📦 ${t('Exporter pour {name}', { name: pf.name })}`}
          </button>
        </div>
      </div>
    </div>
  );
}
