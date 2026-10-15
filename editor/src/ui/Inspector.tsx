import { useState } from 'react';
import { deleteBlocks, duplicateBlock } from '../actions';
import type { CmpOp, Test } from '../engine/engine';
import { uid, type Block, type ChoiceBlock, type CondBlock, type ItemBlock, type LoopBlock, type Project, type VarBlock } from '../model/project';
import { updateBlock, useStore } from '../store';
import { BLOCKS, END_KINDS, ITEM_ICONS } from './blocks';
import { SoundSlot } from './SoundSlot';
import { VoiceToggle } from './VoiceToggle';

/** Champ texte : un seul « annuler » pour toute une saisie. */
export function TextField({ value, onChange, multiline, placeholder }: { value: string; onChange: (v: string) => void; multiline?: boolean; placeholder?: string }) {
  const props = { value, placeholder, onFocus: () => useStore.getState().checkpoint(), onChange: (e: { target: { value: string } }) => onChange(e.target.value) };
  return multiline ? <textarea rows={4} {...props} /> : <input {...props} />;
}

/** Modifie un bloc sans créer d'entrée d'historique (le point de reprise est pris au focus). */
const edit = <T,>(id: string, fn: (b: T) => void) => useStore.getState().update((p) => { const b = p.blocks.find((x) => x.id === id); if (b) fn(b as T); }, false);

function blockLabel(b: Block) {
  return `${BLOCKS[b.type].icon} ${'title' in b ? b.title : BLOCKS[b.type].label}`;
}

function BlockSelect({ value, onChange, blocks, allowStart }: { value: string | null; onChange: (v: string) => void; blocks: Block[]; allowStart?: boolean }) {
  return (
    <select value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
      <option value="" disabled>Choisis un bloc…</option>
      {blocks.filter((b) => allowStart || b.type !== 'start').map((b) => (
        <option key={b.id} value={b.id}>{b.type === 'start' ? '🚩 Le début de l’histoire' : blockLabel(b)}</option>
      ))}
    </select>
  );
}

function ItemPicker({ value, onChange }: { value: string | null; onChange: (id: string) => void }) {
  const items = useStore((s) => s.project.items);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState(ITEM_ICONS[0]);
  const create = () => {
    if (!name.trim()) return;
    const id = uid();
    useStore.getState().update((p) => { p.items.push({ id, name: name.trim(), icon }); });
    onChange(id);
    setAdding(false);
    setName('');
  };
  return (
    <div>
      <div className="chips">
        {items.map((i) => (
          <button key={i.id} className={'chip' + (i.id === value ? ' on' : '')} onClick={() => onChange(i.id)}>{i.icon} {i.name}</button>
        ))}
        <button className="chip add" onClick={() => setAdding(!adding)}>＋ Nouvel objet</button>
      </div>
      {adding && (
        <div className="new-thing">
          <div className="icons">{ITEM_ICONS.map((c) => <button key={c} className={c === icon ? 'on' : ''} onClick={() => setIcon(c)}>{c}</button>)}</div>
          <input autoFocus value={name} placeholder="Nom de l’objet (ex. : clé dorée)" onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && create()} />
          <button className="btn primary" onClick={create}>Créer</button>
        </div>
      )}
    </div>
  );
}

function VarPicker({ value, onChange }: { value: string | null; onChange: (id: string) => void }) {
  const vars = useStore((s) => s.project.variables);
  const [name, setName] = useState('');
  const create = () => {
    if (!name.trim()) return;
    const id = uid();
    useStore.getState().update((p) => { p.variables.push({ id, name: name.trim(), initial: 0 }); });
    onChange(id);
    setName('');
  };
  return (
    <div>
      <div className="chips">
        {vars.map((v) => <button key={v.id} className={'chip' + (v.id === value ? ' on' : '')} onClick={() => onChange(v.id)}>🔢 {v.name}</button>)}
      </div>
      <div className="new-thing inline">
        <input value={name} placeholder="Nouveau compteur (ex. : courage)" onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && create()} />
        <button className="btn" onClick={create} disabled={!name.trim()}>＋</button>
      </div>
    </div>
  );
}

const OPS: { op: CmpOp; label: string }[] = [
  { op: '>=', label: 'est au moins' }, { op: '<=', label: 'est au plus' }, { op: '==', label: 'est égal à' },
  { op: '!=', label: 'est différent de' }, { op: '>', label: 'est plus grand que' }, { op: '<', label: 'est plus petit que' },
];

function CondEditor({ b, project }: { b: CondBlock; project: Project }) {
  const set = (test: Test | null) => updateBlock<CondBlock>(b.id, (x) => { x.test = test; });
  const t = b.test;
  const kinds = [
    { kind: 'item', label: '🎒 Le joueur a un objet' },
    { kind: 'var', label: '🔢 Un compteur' },
    { kind: 'visited', label: '👣 Le joueur est déjà passé par…' },
  ] as const;
  const pick = (k: Test['kind']) => {
    if (k === 'item') set({ kind: 'item', item: project.items[0]?.id ?? '' });
    if (k === 'var') set({ kind: 'var', var: project.variables[0]?.id ?? '', op: '>=', value: 1 });
    if (k === 'visited') set({ kind: 'visited', node: '' });
  };
  return (
    <>
      <label>Que faut-il vérifier ?</label>
      <div className="choices-col">
        {kinds.map((k) => <button key={k.kind} className={'big-option' + (t?.kind === k.kind ? ' on' : '')} onClick={() => pick(k.kind)}>{k.label}</button>)}
      </div>
      {t?.kind === 'item' && <><label>Si le joueur possède :</label><ItemPicker value={t.item} onChange={(item) => set({ ...t, item })} /></>}
      {t?.kind === 'var' && (
        <>
          <label>Si le compteur :</label>
          <VarPicker value={t.var} onChange={(v) => set({ ...t, var: v })} />
          <div className="sentence">
            <select value={t.op} onChange={(e) => set({ ...t, op: e.target.value as CmpOp })}>
              {OPS.map((o) => <option key={o.op} value={o.op}>{o.label}</option>)}
            </select>
            <input type="number" value={t.value} onChange={(e) => set({ ...t, value: Math.round(Number(e.target.value) || 0) })} />
          </div>
        </>
      )}
      {t?.kind === 'visited' && <><label>Si le joueur est déjà passé par :</label><BlockSelect value={t.node} blocks={project.blocks} onChange={(node) => set({ ...t, node })} /></>}
      <p className="hint">Relie la sortie <b>Oui</b> et la sortie <b>Non</b> à deux blocs différents.</p>
    </>
  );
}

function BlockInspector({ b, project }: { b: Block; project: Project }) {
  const m = BLOCKS[b.type];
  return (
    <div className="inspector">
      <div className="insp-head" style={{ background: m.color }}>
        <span className="insp-icon">{m.icon}</span> {m.label}
      </div>
      <p className="hint">{m.help}</p>

      {'title' in b && (
        <>
          <label>Titre</label>
          <TextField value={b.title} onChange={(v) => edit<{ title: string }>(b.id, (x) => { x.title = v; })} />
        </>
      )}

      {b.type === 'end' && (
        <>
          <label>Quelle fin ?</label>
          <div className="end-kinds">
            {END_KINDS.map((k) => (
              <button key={k.kind} className={'big-option' + (b.kind === k.kind ? ' on' : '')} onClick={() => updateBlock<typeof b>(b.id, (x) => { x.kind = k.kind; })}>
                <span className="emoji">{k.icon}</span>{k.label}
              </button>
            ))}
          </div>
        </>
      )}

      {(b.type === 'scene' || b.type === 'choice' || b.type === 'end') && (
        <>
          <label>{b.type === 'choice' ? 'La question posée' : 'Ce que raconte le narrateur'}</label>
          <TextField multiline value={b.text} placeholder="Écris ici le texte (il sera aussi affiché sur les écrans)" onChange={(v) => edit<typeof b>(b.id, (x) => { x.text = v; })} />
          <label>{b.type === 'choice' ? 'Son de la question' : 'Son'}</label>
          <SoundSlot slotKey={b.id} sound={b.sound} label={b.title} text={b.text || b.title} />
        </>
      )}

      {b.type === 'choice' && (
        <>
          <label>Les réponses possibles</label>
          {b.options.map((o, i) => (
            <div key={o.id} className="option-card">
              <div className="option-head">
                <span className="option-num">{i + 1}</span>
                <TextField value={o.text} onChange={(v) => edit<ChoiceBlock>(b.id, (x) => { x.options[i].text = v; })} />
                <button className="btn ghost" title="Supprimer cette réponse" disabled={b.options.length <= 1}
                  onClick={() => updateBlock<ChoiceBlock>(b.id, (x) => { x.options.splice(i, 1); })}>🗑️</button>
              </div>
              <SoundSlot slotKey={`${b.id}/${o.id}`} sound={o.sound} label={o.text} text={o.text} />
            </div>
          ))}
          {b.options.length < 9 && (
            <button className="btn wide" onClick={() => updateBlock<ChoiceBlock>(b.id, (x) => { x.options.push({ id: uid(), text: `Choix ${x.options.length + 1}`, sound: null, next: null }); })}>
              ＋ Ajouter une réponse
            </button>
          )}
        </>
      )}

      {b.type === 'item' && (
        <>
          <label>Que faire avec l’objet ?</label>
          <div className="choices-col">
            {([['give', '🎁 Le donner au joueur'], ['take', '🗑️ Le retirer du sac'], ['has', '🔍 Vérifier si le joueur l’a']] as const).map(([op, label]) => (
              <button key={op} className={'big-option' + (b.op === op ? ' on' : '')} onClick={() => updateBlock<ItemBlock>(b.id, (x) => { x.op = op; })}>{label}</button>
            ))}
          </div>
          <label>Quel objet ?</label>
          <ItemPicker value={b.item} onChange={(item) => updateBlock<ItemBlock>(b.id, (x) => { x.item = item; })} />
        </>
      )}

      {b.type === 'var' && (
        <>
          <label>Quel compteur ?</label>
          <VarPicker value={b.var} onChange={(v) => updateBlock<VarBlock>(b.id, (x) => { x.var = v; })} />
          <div className="sentence">
            <select value={b.op} onChange={(e) => updateBlock<VarBlock>(b.id, (x) => { x.op = e.target.value as VarBlock['op']; })}>
              <option value="add">ajouter</option>
              <option value="set">mettre à</option>
            </select>
            <input type="number" value={b.value} onChange={(e) => updateBlock<VarBlock>(b.id, (x) => { x.value = Math.round(Number(e.target.value) || 0); })} />
          </div>
          <p className="hint">Pour enlever, ajoute un nombre négatif (par exemple −1).</p>
        </>
      )}

      {b.type === 'cond' && <CondEditor b={b} project={project} />}

      {b.type === 'loop' && (
        <>
          <label>Revenir à :</label>
          <BlockSelect value={b.target} blocks={project.blocks.filter((x) => x.id !== b.id)} allowStart onChange={(v) => updateBlock<LoopBlock>(b.id, (x) => { x.target = v; })} />
          <label className="check">
            <input type="checkbox" checked={b.reset} onChange={(e) => updateBlock<LoopBlock>(b.id, (x) => { x.reset = e.target.checked; })} />
            Tout remettre à zéro (le sac est vidé et les compteurs reviennent au départ)
          </label>
        </>
      )}

      <div className="insp-actions">
        <button className="btn" onClick={() => useStore.getState().startPlay(b.id)}>▶ Jouer depuis ici</button>
        {b.type !== 'start' && <>
          <button className="btn ghost" onClick={() => duplicateBlock(b.id)}>📄 Dupliquer</button>
          <button className="btn ghost danger" onClick={() => deleteBlocks([b.id])}>🗑️ Supprimer</button>
        </>}
      </div>
    </div>
  );
}

function StoryInspector({ project }: { project: Project }) {
  const p = (fn: (x: Project) => void) => useStore.getState().update(fn, false);
  const advanced = project.level === 'avance';
  return (
    <div className="inspector">
      <div className="insp-head" style={{ background: '#5b5bd6' }}><span className="insp-icon">📖</span> Mon histoire</div>
      <label>Titre de l’histoire</label>
      <TextField value={project.title} onChange={(v) => p((x) => { x.title = v; })} />
      <label>Auteur ou autrice</label>
      <TextField value={project.author} placeholder="Ton prénom" onChange={(v) => p((x) => { x.author = v; })} />
      <label>Résumé</label>
      <TextField multiline value={project.description} placeholder="De quoi parle ton histoire ?" onChange={(v) => p((x) => { x.description = v; })} />
      <VoiceToggle />
      {advanced && (
        <>
          <label>🎒 Objets de l’histoire</label>
          {project.items.length === 0 && <p className="hint">Crée des objets depuis un bloc Objet.</p>}
          {project.items.map((it, i) => (
            <div key={it.id} className="row">
              <span className="emoji">{it.icon}</span>
              <TextField value={it.name} onChange={(v) => p((x) => { x.items[i].name = v; })} />
              <button className="btn ghost" title="Supprimer l’objet" onClick={() => useStore.getState().update((x) => { x.items.splice(i, 1); })}>🗑️</button>
            </div>
          ))}
          <label>🔢 Compteurs et valeur de départ</label>
          {project.variables.length === 0 && <p className="hint">Crée des compteurs depuis un bloc Compteur.</p>}
          {project.variables.map((v, i) => (
            <div key={v.id} className="row">
              <TextField value={v.name} onChange={(val) => p((x) => { x.variables[i].name = val; })} />
              <input type="number" className="num" value={v.initial} onChange={(e) => useStore.getState().update((x) => { x.variables[i].initial = Math.round(Number(e.target.value) || 0); })} />
              <button className="btn ghost" title="Supprimer le compteur" onClick={() => useStore.getState().update((x) => { x.variables.splice(i, 1); })}>🗑️</button>
            </div>
          ))}
        </>
      )}
      <p className="hint">Clique sur un bloc pour le modifier. Clic droit dans l’espace de travail pour ajouter un bloc.</p>
    </div>
  );
}

export function Inspector() {
  const project = useStore((s) => s.project);
  const selected = useStore((s) => s.selected);
  const b = project.blocks.find((x) => x.id === selected);
  return b ? <BlockInspector key={b.id} b={b} project={project} /> : <StoryInspector project={project} />;
}
