import { useEffect, useMemo, useState } from 'react';
import { ReactFlowProvider, useReactFlow } from '@xyflow/react';
import { applyAutoLayout, duplicateBlock } from '../actions';
import { restoreBlobs } from '../audio/media';
import { stop } from '../audio/player';
import { EXAMPLES } from '../examples';
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

function Welcome({ onClose }: { onClose: () => void }) {
  const [error, setError] = useState('');
  const start = async (p: Project | Promise<Project>) => {
    try { useStore.getState().load(await p); onClose(); } catch (e) { setError((e as Error).message); }
  };
  return (
    <div className="modal-back">
      <div className="modal welcome">
        <button className="modal-close" onClick={onClose} title="Fermer">✕</button>
        <h1><span className="logo">🎧</span> Herodio Studio</h1>
        <p className="lead">Crée des histoires audio dont tu es le héros !</p>
        <div className="welcome-grid">
          <button className="welcome-card new" onClick={() => start(newProject())}><span>✨</span>Nouvelle histoire</button>
          {EXAMPLES.map((x) => (
            <button key={x.title} className="welcome-card" onClick={() => start(x.make())}><span>{x.icon}</span>{x.title}<small>{x.desc}</small></button>
          ))}
          <button className="welcome-card" onClick={() => openProject().then((n) => n && onClose()).catch((e) => setError(e.message))}><span>📂</span>Ouvrir une histoire</button>
        </div>
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
        <b>✅ Vérification de l’histoire</b>
        <button className="btn ghost" onClick={onClose}>✕</button>
      </div>
      {issues.length === 0 && <p>Tout est parfait : ton histoire peut être jouée de bout en bout ! 🎉</p>}
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
        if (missing.length) setStatus(`${missing.length} son(s) n’ont pas pu être récupérés`);
        else setStatus('Travail récupéré ✔');
      } else setWelcome(true);
      startAutosave();
    });
  }, []);

  useEffect(() => { setTimeout(() => fitView({ maxZoom: 1, minZoom: 0.5, padding: 0.1, duration: 300 }), 50); }, [project.id, fitView]);

  const save = async () => {
    try {
      const name = await saveBytes(`${project.title || 'histoire'}.herodio`, await packProject(project), PROJECT_FILTER);
      if (name) setStatus('Enregistré ✔');
    } catch (e) { setStatus('Erreur : ' + (e as Error).message); }
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
          onChange={(e) => useStore.getState().update((p) => { p.title = e.target.value; }, false)} aria-label="Titre de l’histoire" />
        <div className="tb-group">
          <button className="btn ghost" onClick={() => setWelcome(true)} title="Nouvelle histoire ou exemple">✨<span className="tb-label"> Nouveau</span></button>
          <button className="btn ghost" title="Ouvrir une histoire" onClick={() => openProject().then((n) => n && setStatus('Ouvert : ' + n)).catch((e) => setStatus('Erreur : ' + e.message))}>📂<span className="tb-label"> Ouvrir</span></button>
          <button className="btn ghost" onClick={save} title="Enregistrer (Ctrl+S)">💾<span className="tb-label"> Enregistrer</span></button>
        </div>
        <div className="tb-group">
          <button className="btn ghost" onClick={() => useStore.getState().undo()} disabled={!past} title="Annuler (Ctrl+Z)">↶</button>
          <button className="btn ghost" onClick={() => useStore.getState().redo()} disabled={!future} title="Rétablir (Ctrl+Y)">↷</button>
          <button className="btn ghost" onClick={() => { applyAutoLayout(); setTimeout(() => fitView({ duration: 300, maxZoom: 1 }), 50); }} title="Ranger les blocs automatiquement">🧹<span className="tb-label"> Ranger</span></button>
        </div>
        <div className="mode-switch" role="group" aria-label="Niveau">
          <button className={!advanced ? 'on' : ''} onClick={() => useStore.getState().update((p) => { p.level = 'decouverte'; })}>🌱 Découverte</button>
          <button className={advanced ? 'on' : ''} onClick={() => useStore.getState().update((p) => { p.level = 'avance'; })}>🚀 Avancé</button>
        </div>
        <span className="status">{status}</span>
        <button className={'btn check ' + (errors ? 'bad' : warnings ? 'warn' : 'good')} onClick={() => setShowIssues(!showIssues)} title="Vérifier mon histoire">
          {errors ? `⛔ ${errors}` : warnings ? `⚠️ ${warnings}` : '✅'}
        </button>
        <button className="btn play-btn" onClick={() => (play ? useStore.getState().stopPlay() : useStore.getState().startPlay())}>
          {play ? '⏹ Arrêter' : '▶ Jouer mon histoire'}
        </button>
        <button className="btn export-btn" onClick={() => { stop(); setExporting(true); }}>📦 Exporter mon histoire</button>
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
    </div>
  );
}

export function App() {
  return <ReactFlowProvider><Editor /></ReactFlowProvider>;
}
