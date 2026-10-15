import { useEffect, useReducer, useRef, useState } from 'react';
import { playSound, stop, usePlayingKey } from '../audio/player';
import { autoSound } from '../audio/tts';
import { Engine } from '../engine/engine';
import { compile } from '../model/compile';
import { soundSlots, type Sound } from '../model/project';
import { useStore } from '../store';
import { END_KINDS } from './blocks';

/** « Jouer mon histoire » : exactement le même moteur que les lecteurs exportés. */
export function PlayPanel() {
  const play = useStore((s) => s.play);
  const project = useStore((s) => s.project);
  const testState = useStore((s) => s.testState);
  const playingKey = usePlayingKey();
  const engine = useRef<Engine | null>(null);
  const sounds = useRef(new Map<string, Sound | null>());
  const token = useRef(0);
  const [, force] = useReducer((x: number) => x + 1, 0);
  const [preparing, setPreparing] = useState(false);
  const advanced = project.level === 'avance';

  const present = () => {
    const e = engine.current;
    if (!e) return;
    const t = ++token.current;
    const n = e.node;
    useStore.getState().setPlaying(n?.id ?? null, [...e.path]);
    force();
    stop();
    if (!n || !('audio' in n)) return;
    const onEnd = () => {
      if (t !== token.current || n.type !== 'scene') return;
      e.next();
      present();
    };
    if (n.audio) { playSound(sounds.current.get(n.audio) ?? null, 'play', onEnd); return; }
    // Voix automatique : le texte est lu par la synthèse vocale.
    const text = n.text || n.title;
    if (!useStore.getState().project.autoVoice || !text) return;
    setPreparing(true);
    autoSound(text).then((s) => { if (t === token.current) playSound(s, 'play', onEnd); }).catch(console.error).finally(() => setPreparing(false));
  };

  const hearOption = (o: { audio?: string | null; text: string }) => {
    if (o.audio) playSound(sounds.current.get(o.audio) ?? null, 'option');
    else if (useStore.getState().project.autoVoice && o.text) autoSound(o.text).then((s) => playSound(s, 'option')).catch(console.error);
  };

  useEffect(() => {
    if (!play) { stop(); engine.current = null; return; }
    const p = useStore.getState().project;
    sounds.current = new Map(p.blocks.flatMap((b) => soundSlots(b).map((s) => [s.key, s.sound] as const)));
    const e = new Engine(compile(p));
    engine.current = e;
    const from = play.node && p.blocks.find((b) => b.id === play.node);
    if (from && from.type !== 'start') e.startAt(from.id, useStore.getState().testState);
    else e.start();
    present();
  }, [play?.n]);

  const e = engine.current;
  const n = e?.node ?? null;

  const next = () => { stop(); e?.next(); present(); };
  const choose = (i: number) => { stop(); e?.choose(i); present(); };

  useEffect(() => {
    if (!play) return;
    const onKey = (ev: KeyboardEvent) => {
      if ((ev.target as HTMLElement).closest('input,textarea,select')) return;
      if (n?.type === 'choice' && /^[1-9]$/.test(ev.key)) choose(Number(ev.key) - 1);
      else if (n?.type === 'scene' && (ev.key === ' ' || ev.key === 'Enter')) { ev.preventDefault(); next(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!play || !e) return null;

  const restart = () => useStore.getState().startPlay(play.node);
  const items = e.items.map((id) => project.items.find((i) => i.id === id)).filter(Boolean);
  const end = n?.type === 'end' ? END_KINDS.find((k) => k.kind === n.kind) : null;

  return (
    <section className="play">
      <div className="play-main">
        {e.status === 'error' && <div className="play-card error-card"><h2>🌀 Boucle infinie !</h2><p>Des blocs se renvoient l’un à l’autre sans jamais s’arrêter sur une scène ou un choix.</p></div>}
        {e.status === 'end' && !n && <div className="play-card"><h2>🛑 L’histoire s’arrête ici</h2><p>Aucun bloc n’est relié après celui-ci.</p></div>}
        {n && 'title' in n && (
          <div className={'play-card' + (playingKey === 'play' ? ' speaking' : '')}>
            <h2>{end && <span className="emoji">{end.icon}</span>}{n.title}{end && <small> — fin {end.label.toLowerCase()}</small>}</h2>
            {n.text && <p>{n.text}</p>}
            {playingKey === 'play' && <div className="eq"><span /><span /><span /><span /></div>}
            {preparing && <div className="preparing">🗣️ La voix se prépare…</div>}
          </div>
        )}
        <div className="play-actions">
          {n?.type === 'choice' && n.options.map((o, i) => (
            <button key={i} className="btn choice-btn" onClick={() => choose(i)}
              onMouseEnter={() => hearOption(o)} onFocus={() => hearOption(o)}>
              <span className="option-num">{i + 1}</span> {o.text}
            </button>
          ))}
          {n?.type === 'scene' && <button className="btn primary" onClick={next}>⏭ Suivant</button>}
          <button className="btn" onClick={restart}>🔄 {e.status === 'playing' ? 'Recommencer' : 'Rejouer'}</button>
          <button className="btn ghost" onClick={() => useStore.getState().stopPlay()}>⏹ Arrêter</button>
        </div>
      </div>
      {advanced && (
        <div className="play-side">
          <div className="play-state">
            <b>🎒 Sac :</b> {items.length ? items.map((i) => <span key={i!.id} className="chip">{i!.icon} {i!.name}</span>) : <i>vide</i>}
          </div>
          {project.variables.length > 0 && (
            <div className="play-state"><b>🔢</b> {project.variables.map((v) => <span key={v.id} className="chip">{v.name} = {e.vars[v.id] ?? 0}</span>)}</div>
          )}
          <details>
            <summary>🧪 État de départ pour « Jouer depuis ici »</summary>
            {project.items.map((it) => (
              <label key={it.id} className="check">
                <input type="checkbox" checked={testState.items.includes(it.id)} onChange={(ev) => useStore.setState({
                  testState: { ...testState, items: ev.target.checked ? [...testState.items, it.id] : testState.items.filter((x) => x !== it.id) },
                })} /> {it.icon} {it.name}
              </label>
            ))}
            {project.variables.map((v) => (
              <label key={v.id} className="check">{v.name} =
                <input type="number" className="num" value={testState.vars[v.id] ?? v.initial} onChange={(ev) => useStore.setState({
                  testState: { ...testState, vars: { ...testState.vars, [v.id]: Math.round(Number(ev.target.value) || 0) } },
                })} />
              </label>
            ))}
          </details>
        </div>
      )}
    </section>
  );
}
