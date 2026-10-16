import { useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import { addBlock } from '../actions';
import { addImage, IMAGE_ACCEPT, imageUrl } from '../audio/images';
import { addMedia, AUDIO_ACCEPT } from '../audio/media';
import { toggleSound, usePlayingKey } from '../audio/player';
import { t } from '../i18n';
import { pickFiles } from '../io/files';
import { mediaUsage, simpleSound, type MediaCategory } from '../model/project';
import { useStore } from '../store';
import { BLOCKS, PALETTE_ORDER } from './blocks';
import { TextField } from './Inspector';
import { fmtDur } from './sound';

function Palette() {
  const advanced = useStore((s) => s.project.level === 'avance');
  const hasStart = useStore((s) => s.project.blocks.some((b) => b.type === 'start'));
  const { screenToFlowPosition } = useReactFlow();
  const types = PALETTE_ORDER.filter((t) => (advanced || !BLOCKS[t].advanced) && (t !== 'start' || !hasStart));
  const addAtCenter = (t: (typeof types)[number]) => {
    const r = document.querySelector('.canvas')!.getBoundingClientRect();
    const p = screenToFlowPosition({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
    addBlock(t, p.x - 90 + Math.random() * 40, p.y - 40 + Math.random() * 40);
  };
  return (
    <div className="palette">
      {types.map((t) => (
        <button
          key={t}
          className="pal-block"
          style={{ '--c': BLOCKS[t].color } as React.CSSProperties}
          draggable
          onDragStart={(e) => { e.dataTransfer.setData('application/herodio-block', t); e.dataTransfer.effectAllowed = 'copy'; }}
          onClick={() => addAtCenter(t)}
          title={BLOCKS[t].help}
        >
          <span className="pal-icon">{BLOCKS[t].icon}</span>
          <span>{BLOCKS[t].label}</span>
        </button>
      ))}
      <p className="hint">{t('Glisse un bloc dans l’espace de travail, puis relie les ronds avec la souris.')}</p>
      {!advanced && <p className="hint">{t('Objets, conditions, compteurs et boucles : passe en mode 🚀 Avancé.')}</p>}
    </div>
  );
}

const CATS: { cat: MediaCategory; label: string }[] = [
  { cat: 'enregistrement', label: '🎙️ ' + t('Enregistrements') },
  { cat: 'voix', label: '🗣️ ' + t('Voix') },
  { cat: 'ambiance', label: '🌲 ' + t('Ambiances') },
  { cat: 'bruitage', label: '🚪 ' + t('Bruitages') },
  { cat: 'musique', label: '🎵 ' + t('Musiques') },
  { cat: 'image', label: '🖼️ ' + t('Images') },
];

function Library() {
  const project = useStore((s) => s.project);
  const playing = usePlayingKey();
  const [cat, setCat] = useState<MediaCategory | 'all'>('all');
  const [error, setError] = useState('');
  const used = mediaUsage(project);
  const list = project.media.filter((m) => cat === 'all' || m.category === cat);
  const upd = (fn: Parameters<ReturnType<typeof useStore.getState>['update']>[0]) => useStore.getState().update(fn);

  const importFiles = async () => {
    setError('');
    for (const f of await pickFiles(cat === 'image' ? IMAGE_ACCEPT : AUDIO_ACCEPT + ',' + IMAGE_ACCEPT, true)) {
      const name = f.name.replace(/\.\w+$/, '');
      try {
        if (f.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(f.name)) await addImage(f, name);
        else await addMedia(f, name, cat === 'all' || cat === 'image' ? 'bruitage' : cat);
      } catch (e) { setError((e as Error).message); }
    }
  };

  return (
    <div className="library">
      <div className="chips">
        <button className={'chip' + (cat === 'all' ? ' on' : '')} onClick={() => setCat('all')}>{t('Tous')}</button>
        {CATS.map((c) => <button key={c.cat} className={'chip' + (cat === c.cat ? ' on' : '')} onClick={() => setCat(c.cat)}>{c.label}</button>)}
      </div>
      <button className="btn wide" onClick={importFiles}>📁 {t('Importer des sons ou des images')}</button>
      {error && <div className="error">{error}</div>}
      {list.length === 0 && <p className="hint">{t('Aucun son ici. Importe des fichiers (WAV, MP3, OGG…) ou enregistre ta voix depuis un bloc.')}</p>}
      {list.map((m) => (
        <div key={m.id} className="media" draggable onDragStart={(e) => { e.dataTransfer.setData('application/herodio-media', m.id); e.dataTransfer.effectAllowed = 'copy'; }}
          title={t('Glisse-le sur un bloc')}>
          {m.category === 'image'
            ? <img className="thumb" src={imageUrl(m.id)} alt="" />
            : <button className="btn round" onClick={() => toggleSound(simpleSound(m), 'lib:' + m.id)}>{playing === 'lib:' + m.id ? '⏹' : '▶'}</button>}
          <div className="media-main">
            <TextField value={m.name} onChange={(v) => useStore.getState().update((p) => { p.media.find((x) => x.id === m.id)!.name = v; }, false)} />
            <div className="media-meta">
              {m.category === 'image' ? <span>🖼️ {t('Image')}</span> : <>
                <select value={m.category} onChange={(e) => upd((p) => { p.media.find((x) => x.id === m.id)!.category = e.target.value as MediaCategory; })}>
                  {CATS.filter((c) => c.cat !== 'image').map((c) => <option key={c.cat} value={c.cat}>{c.label}</option>)}
                </select>
                <span>{fmtDur(m.duration)}</span>
              </>}
              {used.get(m.id) ? <span className="used">{t('utilisé ×{n}', { n: used.get(m.id)! })}</span> : <span className="unused">{t('inutilisé')}</span>}
            </div>
          </div>
          <button className="btn ghost" title={used.get(m.id) ? t('Ce son est utilisé : retire-le d’abord des blocs') : t('Supprimer ce son')} disabled={!!used.get(m.id)}
            onClick={() => upd((p) => { p.media = p.media.filter((x) => x.id !== m.id); })}>🗑️</button>
        </div>
      ))}
    </div>
  );
}

export function LeftPanel() {
  const [tab, setTab] = useState<'blocs' | 'sons'>('blocs');
  return (
    <aside className="left">
      <div className="tabs">
        <button className={tab === 'blocs' ? 'on' : ''} onClick={() => setTab('blocs')}>🧩 {t('Blocs')}</button>
        <button className={tab === 'sons' ? 'on' : ''} onClick={() => setTab('sons')}>🎵 {t('Sons')}</button>
      </div>
      {tab === 'blocs' ? <Palette /> : <Library />}
    </aside>
  );
}
