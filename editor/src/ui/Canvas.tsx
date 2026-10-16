import { useEffect, useMemo, useState, type DragEvent, type MouseEvent as RMouseEvent } from 'react';
import {
  Background, Controls, Handle, MiniMap, Position, ReactFlow, applyNodeChanges, useReactFlow,
  type Edge, type Node, type NodeChange, type NodeProps, type OnConnectEnd,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { addBlock, connect, deleteBlocks, duplicateBlock } from '../actions';
import { hasAudio, ports, simpleSound, type Block, type BlockType } from '../model/project';
import type { Issue } from '../model/validate';
import { t } from '../i18n';
import { useStore } from '../store';
import { BLOCKS, END_KINDS, PALETTE_ORDER } from './blocks';
import { attachMediaToBlock } from './sound';
import { imageUrl } from '../audio/images';

type NodeData = { block: Block; issue: Issue['level'] | null; playing: boolean; visited: boolean; itemName: (id: string | null) => string; varName: (id: string | null) => string };
type BNode = Node<NodeData, 'block'>;

function summary(b: Block, d: NodeData): string {
  switch (b.type) {
    case 'scene': case 'choice': return b.text;
    case 'end': return END_KINDS.find((k) => k.kind === b.kind)!.icon + ' ' + b.text;
    case 'item': return b.op === 'has' ? t('A-t-il {item} ?', { item: d.itemName(b.item) }) : `${b.op === 'give' ? t('Donner') : t('Retirer')} : ${d.itemName(b.item)}`;
    case 'var': return `${d.varName(b.var)} ${b.op === 'set' ? '=' : b.value >= 0 ? '+' : '−'} ${b.op === 'set' ? b.value : Math.abs(b.value)}`;
    case 'cond': {
      const test = b.test;
      if (!test) return t('À configurer');
      if (test.kind === 'item') return t('A-t-il {item} ?', { item: d.itemName(test.item) });
      if (test.kind === 'var') return `${d.varName(test.var)} ${test.op} ${test.value} ?`;
      return t('Déjà passé par… ?');
    }
    case 'loop': return b.reset ? t('Recommencer à zéro') : t('Revenir en arrière');
    default: return '';
  }
}

function BlockNode({ data, selected }: NodeProps<BNode>) {
  const b = data.block;
  const m = BLOCKS[b.type];
  const title = 'title' in b ? b.title : m.label;
  const audio = 'sound' in b && hasAudio(b.sound);
  const cls = ['block', selected && 'selected', data.playing && 'playing', data.visited && 'visited'].filter(Boolean).join(' ');
  return (
    <div className={cls} style={{ '--c': m.color } as React.CSSProperties} title={m.help}>
      {b.type !== 'start' && <Handle type="target" position={Position.Left} className="h-in" />}
      <div className="block-head">
        <span className="block-icon">{m.icon}</span>
        <span className="block-kind">{m.label}</span>
        {audio && <span className="block-badge" title={t('Ce bloc a un son')}>🔊</span>}
        {data.issue && <span className={'block-badge issue-' + data.issue} title={t('Voir les vérifications')}>{data.issue === 'error' ? '⛔' : '⚠️'}</span>}
      </div>
      {'image' in b && b.image && imageUrl(b.image) && <img className="block-img" src={imageUrl(b.image)} alt="" />}
      {b.type !== 'start' && <div className="block-title">{title}</div>}
      {summary(b, data) && <div className="block-text">{summary(b, data)}</div>}
      <div className="block-ports">
        {ports(b).map((p) => (
          <div key={p.port} className="port">
            <span>{b.type === 'choice' && hasAudio(b.options.find((o) => 'opt:' + o.id === p.port)?.sound ?? null) ? '🔊 ' : ''}{p.label}</span>
            <Handle type="source" position={Position.Right} id={p.port} className={p.dashed ? 'h-out dashed' : 'h-out'} />
          </div>
        ))}
      </div>
    </div>
  );
}

const nodeTypes = { block: BlockNode };

/** Libellés d'accessibilité et infobulles de React Flow (en anglais par défaut). */
const ARIA = {
  'node.a11yDescription.default': t('Appuie sur Entrée ou Espace pour choisir un bloc, sur Suppr pour l’effacer, sur Échap pour annuler.'),
  'node.a11yDescription.keyboardDisabled': t('Appuie sur Entrée ou Espace pour choisir un bloc, puis déplace-le avec les flèches. Suppr pour l’effacer, Échap pour annuler.'),
  'node.a11yDescription.ariaLiveMessage': ({ x, y }: { direction: string; x: number; y: number }) => t('Bloc déplacé. Nouvelle position : x {x}, y {y}', { x, y }),
  'edge.a11yDescription.default': t('Appuie sur Entrée ou Espace pour choisir une flèche, puis sur Suppr pour l’effacer ou sur Échap pour annuler.'),
  'controls.ariaLabel': t('Commandes'),
  'controls.zoomIn.ariaLabel': t('Zoomer'),
  'controls.zoomOut.ariaLabel': t('Dézoomer'),
  'controls.fitView.ariaLabel': t('Tout voir'),
  'controls.interactive.ariaLabel': t('Verrouiller'),
  'minimap.ariaLabel': t('Plan miniature'),
  'handle.ariaLabel': t('Point de liaison'),
};

interface Menu { x: number; y: number; flow: { x: number; y: number }; node?: string; from?: { source: string; port: string } }

export function Canvas({ issues }: { issues: Issue[] }) {
  const project = useStore((s) => s.project);
  const selected = useStore((s) => s.selected);
  const playing = useStore((s) => s.playing);
  const playPath = useStore((s) => s.playPath);
  const { screenToFlowPosition } = useReactFlow();
  const [nodes, setNodes] = useState<BNode[]>([]);
  const [menu, setMenu] = useState<Menu | null>(null);
  const advanced = project.level === 'avance';

  const worst = useMemo(() => {
    const m = new Map<string, Issue['level']>();
    for (const i of issues) if (i.block && i.level !== 'info' && m.get(i.block) !== 'error') m.set(i.block, i.level);
    return m;
  }, [issues]);

  useEffect(() => {
    const visited = new Set(playPath);
    const itemName = (id: string | null) => { const i = project.items.find((x) => x.id === id); return i ? `${i.icon} ${i.name}` : '?'; };
    const varName = (id: string | null) => project.variables.find((x) => x.id === id)?.name ?? '?';
    setNodes((prev) => {
      const old = new Map(prev.map((n) => [n.id, n]));
      return project.blocks.map((b) => ({
        ...old.get(b.id),
        id: b.id,
        type: 'block',
        position: { x: b.x, y: b.y },
        selected: b.id === selected,
        deletable: b.type !== 'start',
        data: { block: b, issue: worst.get(b.id) ?? null, playing: playing === b.id, visited: visited.has(b.id), itemName, varName },
      }));
    });
  }, [project, selected, playing, playPath, worst]);

  const edges = useMemo<Edge[]>(() => {
    const ids = new Set(project.blocks.map((b) => b.id));
    const path = playPath;
    const taken = new Set(path.slice(1).map((t, i) => path[i] + '>' + t));
    return project.blocks.flatMap((b) => ports(b).filter((p) => p.target && ids.has(p.target)).map((p) => {
      const hot = taken.has(b.id + '>' + p.target);
      return {
        id: `${b.id}|${p.port}`, source: b.id, sourceHandle: p.port, target: p.target!,
        animated: hot || !!p.dashed,
        style: { stroke: BLOCKS[b.type].color, strokeWidth: hot ? 5 : 3, strokeDasharray: p.dashed ? '8 6' : undefined, opacity: path.length && !hot ? 0.45 : 1 },
      };
    }));
  }, [project.blocks, playPath]);

  const onNodesChange = (changes: NodeChange<BNode>[]) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
    for (const c of changes) {
      if (c.type === 'select' && c.selected) useStore.getState().select(c.id);
      if (c.type === 'position' && c.dragging === false && c.position) {
        // Fin de glissement : on enregistre la position (annulable).
        const pos = c.position;
        useStore.getState().update((p) => { const b = p.blocks.find((x) => x.id === c.id); if (b) { b.x = Math.round(pos.x); b.y = Math.round(pos.y); } });
      }
    }
  };

  const onConnectEnd: OnConnectEnd = (event, state) => {
    if (state.isValid || !state.fromNode || !state.fromHandle?.id || state.fromHandle.type !== 'source') return;
    const { clientX, clientY } = 'changedTouches' in event ? event.changedTouches[0] : event;
    setMenu({ x: clientX, y: clientY, flow: screenToFlowPosition({ x: clientX, y: clientY }), from: { source: state.fromNode.id, port: state.fromHandle.id } });
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    const type = e.dataTransfer.getData('application/herodio-block') as BlockType;
    if (type) { addBlock(type, pos.x - 90, pos.y - 30); return; }
    const media = e.dataTransfer.getData('application/herodio-media');
    if (!media) return;
    const nodeEl = (e.target as HTMLElement).closest('.react-flow__node');
    const target = nodeEl?.getAttribute('data-id');
    if (target) { attachMediaToBlock(target, media); return; }
    // Un son lâché dans le vide crée une scène qui le joue.
    const m = useStore.getState().project.media.find((x) => x.id === media);
    if (!m) return;
    const id = addBlock('scene', pos.x - 90, pos.y - 30);
    useStore.getState().update((p) => {
      const b = p.blocks.find((x) => x.id === id);
      if (b?.type !== 'scene') return;
      b.title = m.name;
      if (m.category === 'image') b.image = m.id; else b.sound = simpleSound(m);
    }, false);
  };

  const openMenu = (e: RMouseEvent, node?: string) => {
    e.preventDefault();
    setMenu({ x: e.clientX, y: e.clientY, flow: screenToFlowPosition({ x: e.clientX, y: e.clientY }), node });
  };

  const types = PALETTE_ORDER.filter((t) => t !== 'start' && (advanced || !BLOCKS[t].advanced));

  return (
    <div className="canvas" onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }} onDrop={onDrop}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onNodeDragStart={() => useStore.getState().checkpoint()}
        onNodesDelete={(ns) => deleteBlocks(ns.map((n) => n.id))}
        onEdgesDelete={(es) => es.forEach((e) => connect(e.source, e.sourceHandle!, null))}
        onConnect={(c) => c.sourceHandle && connect(c.source, c.sourceHandle, c.target)}
        onConnectEnd={onConnectEnd}
        onReconnect={(old, c) => c.sourceHandle && c.target && connect(old.source, old.sourceHandle!, c.target)}
        edgesReconnectable
        onPaneClick={() => { useStore.getState().select(null); setMenu(null); }}
        onPaneContextMenu={(e) => openMenu(e as RMouseEvent)}
        onNodeContextMenu={(e, n) => { useStore.getState().select(n.id); openMenu(e, n.id); }}
        deleteKeyCode={['Delete', 'Backspace']}
        defaultEdgeOptions={{ type: 'smoothstep' }}
        connectionLineStyle={{ strokeWidth: 3 }}
        minZoom={0.2}
        ariaLabelConfig={ARIA}
        fitView
        fitViewOptions={{ maxZoom: 1, minZoom: 0.5, padding: 0.1 }}
      >
        <Background gap={24} size={2} color="var(--grid)" />
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable style={{ width: 160, height: 100 }} nodeColor={(n) => BLOCKS[(n as BNode).data.block.type].color} />
      </ReactFlow>
      {menu && (
        <div className="menu" style={{ left: menu.x, top: menu.y }} onMouseLeave={() => setMenu(null)}>
          {menu.node ? (
            <>
              <button onClick={() => { useStore.getState().startPlay(menu.node!); setMenu(null); }}>▶ {t('Jouer depuis ici')}</button>
              {project.blocks.find((b) => b.id === menu.node)?.type !== 'start' && <>
                <button onClick={() => { duplicateBlock(menu.node!); setMenu(null); }}>📄 {t('Dupliquer')}</button>
                <button onClick={() => { deleteBlocks([menu.node!]); setMenu(null); }}>🗑️ {t('Supprimer')}</button>
              </>}
            </>
          ) : (
            <>
              <div className="menu-title">{menu.from ? t('Relier à un nouveau bloc :') : t('Ajouter un bloc :')}</div>
              {types.map((ty) => (
                <button key={ty} onClick={() => { addBlock(ty, menu.flow.x, menu.flow.y - 30, menu.from); setMenu(null); }}>
                  <span className="dot" style={{ background: BLOCKS[ty].color }} />{BLOCKS[ty].icon} {BLOCKS[ty].label}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
