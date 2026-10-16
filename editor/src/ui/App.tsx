import { useEffect, useMemo, useState } from 'react';
import { ReactFlowProvider, useReactFlow } from '@xyflow/react';
import { applyAutoLayout, duplicateBlock } from '../actions';
import { restoreBlobs } from '../audio/media';
import { stop } from '../audio/player';
import { TALE_EXAMPLES, TUTORIAL_EXAMPLES, type Example } from '../examples';
import { chosenLang, lang, LANGS, setLang, t } from '../i18n';
import { openBytes, saveBytes } from '../io/files';
import { PROJECT_FILTER, packProject, unpackProject } from '../io/projectFile';
import { newProject, type Project } from '../model/project';
import { validate, type Issue } from '../model/validate';
import { loadAutosave, startAutosave, useStore } from '../store';
import { Canvas } from './Canvas';
import { ExportDialog } from './ExportDialog';
import { Inspector } from './Inspector';
import { LeftPanel } from './LeftPanel';
import { PlayPanel } from './PlayPanel';
import { Studio } from './Studio';

async function openProject(): Promise<string | null> {
  const f = await openBytes(PROJECT_FILTER);
  if (!f) return null;
  useStore.getState().load(await unpackProject(f.bytes));
  return f.name;
}

/** Premier démarrage : choisir la langue (on peut la changer ensuite dans la barre d'outils). */
function LanguagePicker() {
  return (
    <div className="modal-back">
      <div className="modal welcome lang-picker">
        <h1><span className="logo">🎧</span> Herodio Studio</h1>
        <p className="lead">Choisis ta langue · Choose your language</p>
        <div className="welcome-actions">
          {LANGS.map((l) => <button key={l.id} className="welcome-card" onClick={() => setLang(l.id)}><span>🗣️</span>{l.label}</button>)}
        </div>
      </div>
    </div>
  );
}

function Welcome({ onClose }: { onClose: () => void }) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState('');
  const start = async (p: Project | Promise<Project>, id = '') => {
    setLoading(id);
    try { useStore.getState().load(await p); onClose(); } catch (e) { setError((e as Error).message); } finally { setLoading(''); }
  };
  const card = (x: Example) => (
    <button key={x.id} className="story-card" style={{ '--c': x.color } as React.CSSProperties} onClick={() => start(x.make(), x.id)} disabled={!!loading}>
      <img src={x.cover} alt="" />
      <b>{x.title}</b>
      <small>{x.desc}</small>
      <span className="notion">{loading === x.id ? t('⏳ Ouverture…') : `🧩 ${x.notion}`}</span>
    </button>
  );
  return (
    <div className="modal-back">
      <div className="modal welcome">
        <button className="modal-close" onClick={onClose} title={t('Fermer')}>✕</button>
        <h1><span className="logo">🎧</span> Herodio Studio</h1>
        <p className="lead">{t('Crée des histoires audio dont tu es le héros !')}</p>
        <div className="welcome-actions">
          <button className="welcome-card new" onClick={() => start(newProject())}><span>✨</span>{t('Nouvelle histoire')}</button>
          <button className="welcome-card" onClick={() => openProject().then((n) => n && onClose()).catch((e) => setError(e.message))}><span>📂</span>{t('Ouvrir une histoire')}</button>
        </div>
        <h3>🎓 {t('Pour apprendre')}</h3>
        <div className="story-grid">{TUTORIAL_EXAMPLES.map(card)}</div>
        <h3>📚 {t('Contes à jouer (6-8 ans)')}</h3>
        <div className="story-grid">{TALE_EXAMPLES.map(card)}</div>
        {error && <div className="error">{error}</div>}
      </div>
    </div>
  );
}

function IssuesPanel({ issues, onClose }: { issues: Issue[]; onClose: () => void }) {
  const { setCenter, getNode } = useReactFlow();
  const go = (id?: string) => {
    if (!id) return;
    useStore.getState().select(id);
    const n = getNode(id);
    if (n) setCenter(n.position.x + 100, n.position.y + 50, { zoom: 1, duration: 400 });
  };
  const icon = { error: '⛔', warning: '⚠️', info: 'ℹ️' };
  return (
    <section className="issues">
      <div className="issues-head">
        <b>✅ {t('Vérification de l’histoire')}</b>
        <button className="btn ghost" onClick={onClose}>✕</button>
      </div>
      {issues.length === 0 && <p>{t('Tout est parfait : ton histoire peut être jouée de bout en bout ! 🎉')}</p>}
      {issues.map((i, k) => (
        <button key={k} className={'issue ' + i.level} onClick={() => go(i.block)}>{icon[i.level]} {i.message}</button>
      ))}
    </section>
  );
}

function Editor() {
  const project = useStore((s) => s.project);
  const past = useStore((s) => s.past.length);
  const future = useStore((s) => s.future.length);
  const play = useStore((s) => s.play);
  const studio = useStore((s) => s.studio);
  const [welcome, setWelcome] = useState(false);
  const [showIssues, setShowIssues] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [status, setStatus] = useState('');
  const issues = useMemo(() => validate(project), [project]);
  const errors = issues.filter((i) => i.level === 'error').length;
  const warnings = issues.filter((i) => i.level === 'warning').length;
  const { fitView } = useReactFlow();

  useEffect(() => {
    loadAutosave().then(async (p) => {
      if (p && p.blocks.length > 1) {
        const missing = await restoreBlobs(p.media.map((m) => m.id));
        useStore.getState().load(p);
        if (missing.length) setStatus(t('{n} son(s) n’ont pas pu être récupérés', { n: missing.length }));
        else setStatus(t('Travail récupéré ✔'));
      } else if (chosenLang) setWelcome(true);
      startAutosave();
    });
  }, []);

  useEffect(() => { setTimeout(() => fitView({ maxZoom: 1, minZoom: 0.5, padding: 0.1, duration: 300 }), 50); }, [project.id, fitView]);

  const save = async () => {
    try {
      const name = await saveBytes(`${project.title || t('histoire')}.herodio`, await packProject(project), PROJECT_FILTER);
      if (name) setStatus(t('Enregistré ✔'));
    } catch (e) { setStatus(t('Erreur : {msg}', { msg: (e as Error).message })); }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      if (k === 'z' && !e.shiftKey) { e.preventDefault(); useStore.getState().undo(); }
      else if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); useStore.getState().redo(); }
      else if (k === 's') { e.preventDefault(); save(); }
      else if (k === 'd' && useStore.getState().selected) { e.preventDefault(); duplicateBlock(useStore.getState().selected!); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  useEffect(() => { if (!status) return; const t = setTimeout(() => setStatus(''), 3000); return () => clearTimeout(t); }, [status]);

  const advanced = project.level === 'avance';

  return (
    <div className="app">
      <header className="toolbar">
        <span className="logo" title="Herodio Studio">🎧</span>
        <input className="title-input" value={project.title} onFocus={() => useStore.getState().checkpoint()}
          onChange={(e) => useStore.getState().update((p) => { p.title = e.target.value; }, false)} aria-label={t('Titre de l’histoire')} />
        <div className="tb-group">
          <button className="btn ghost" onClick={() => setWelcome(true)} title={t('Nouvelle histoire ou exemple')}>✨<span className="tb-label"> {t('Nouveau')}</span></button>
          <button className="btn ghost" title={t('Ouvrir une histoire')} onClick={() => openProject().then((n) => n && setStatus(t('Ouvert : {name}', { name: n }))).catch((e) => setStatus(t('Erreur : {msg}', { msg: e.message })))}>📂<span className="tb-label"> {t('Ouvrir')}</span></button>
          <button className="btn ghost" onClick={save} title={t('Enregistrer (Ctrl+S)')}>💾<span className="tb-label"> {t('Enregistrer')}</span></button>
        </div>
        <div className="tb-group">
          <button className="btn ghost" onClick={() => useStore.getState().undo()} disabled={!past} title={t('Annuler (Ctrl+Z)')}>↶</button>
          <button className="btn ghost" onClick={() => useStore.getState().redo()} disabled={!future} title={t('Rétablir (Ctrl+Y)')}>↷</button>
          <button className="btn ghost" onClick={() => { applyAutoLayout(); setTimeout(() => fitView({ duration: 300, maxZoom: 1 }), 50); }} title={t('Ranger les blocs automatiquement')}>🧹<span className="tb-label"> {t('Ranger')}</span></button>
        </div>
        <div className="mode-switch" role="group" aria-label={t('Niveau')}>
          <button className={!advanced ? 'on' : ''} onClick={() => useStore.getState().update((p) => { p.level = 'decouverte'; })}>🌱 {t('Découverte')}</button>
          <button className={advanced ? 'on' : ''} onClick={() => useStore.getState().update((p) => { p.level = 'avance'; })}>🚀 {t('Avancé')}</button>
        </div>
        <span className="status">{status}</span>
        <select className="lang-select" value={lang} onChange={(e) => setLang(e.target.value as typeof lang)} title={t('Langue')} aria-label={t('Langue')}>
          {LANGS.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
        </select>
        <button className={'btn check ' + (errors ? 'bad' : warnings ? 'warn' : 'good')} onClick={() => setShowIssues(!showIssues)} title={t('Vérifier mon histoire')}>
          {errors ? `⛔ ${errors}` : warnings ? `⚠️ ${warnings}` : '✅'}
        </button>
        <button className="btn play-btn" onClick={() => (play ? useStore.getState().stopPlay() : useStore.getState().startPlay())}>
          {play ? t('⏹ Arrêter') : t('▶ Jouer mon histoire')}
        </button>
        <button className="btn export-btn" onClick={() => { stop(); setExporting(true); }}>📦 {t('Exporter mon histoire')}</button>
      </header>
      <LeftPanel />
      <main className="center">
        <Canvas issues={issues} />
        {showIssues && <IssuesPanel issues={issues} onClose={() => setShowIssues(false)} />}
        <PlayPanel />
      </main>
      <aside className="right"><Inspector /></aside>
      {studio && <Studio slotKey={studio} />}
      {exporting && <ExportDialog issues={issues} onClose={() => setExporting(false)} />}
      {welcome && <Welcome onClose={() => setWelcome(false)} />}
      {!chosenLang && <LanguagePicker />}
    </div>
  );
}

export function App() {
  return <ReactFlowProvider><Editor /></ReactFlowProvider>;
}
