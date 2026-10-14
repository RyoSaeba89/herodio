// État global de l'éditeur : projet courant, historique annuler/rétablir, sélection, prévisualisation.
import { create } from 'zustand';
import { produce } from 'immer';
import { get as idbGet, set as idbSet } from 'idb-keyval';
import { newProject, type Project } from './model/project';

const HISTORY = 200;

interface Store {
  project: Project;
  past: Project[];
  future: Project[];
  selected: string | null;
  /** Bloc en cours de lecture et chemin parcouru (prévisualisation). */
  playing: string | null;
  playPath: string[];
  /** Son en cours d'édition dans le studio audio (clé d'emplacement). */
  studio: string | null;
  /** Demande de lecture : null = arrêté ; node = bloc de départ du mode test (null = Début). */
  play: { node: string | null; n: number } | null;
  /** État de jeu initial du mode test. */
  testState: { items: string[]; vars: Record<string, number> };
  update: (fn: (p: Project) => void, history?: boolean) => void;
  checkpoint: () => void;
  undo: () => void;
  redo: () => void;
  load: (p: Project) => void;
  select: (id: string | null) => void;
  setPlaying: (node: string | null, path: string[]) => void;
  openStudio: (key: string | null) => void;
  startPlay: (node?: string | null) => void;
  stopPlay: () => void;
}

export const useStore = create<Store>((set, get) => ({
  project: newProject(),
  past: [],
  future: [],
  selected: null,
  playing: null,
  playPath: [],
  studio: null,
  play: null,
  testState: { items: [], vars: {} },
  update: (fn, history = true) => {
    const prev = get().project;
    const next = produce(prev, fn);
    if (next === prev) return;
    set(history ? { project: next, past: [...get().past, prev].slice(-HISTORY), future: [] } : { project: next });
  },
  checkpoint: () => set({ past: [...get().past, get().project].slice(-HISTORY), future: [] }),
  undo: () => {
    const { past, project, future } = get();
    if (!past.length) return;
    set({ project: past[past.length - 1], past: past.slice(0, -1), future: [project, ...future] });
  },
  redo: () => {
    const { past, project, future } = get();
    if (!future.length) return;
    set({ project: future[0], past: [...past, project], future: future.slice(1) });
  },
  load: (p) => set({ project: p, past: [], future: [], selected: null, playing: null, playPath: [], studio: null, play: null }),
  select: (id) => set({ selected: id }),
  setPlaying: (playing, playPath) => set({ playing, playPath }),
  openStudio: (studio) => set({ studio }),
  startPlay: (node = null) => set({ play: { node, n: (get().play?.n ?? 0) + 1 } }),
  stopPlay: () => set({ play: null, playing: null, playPath: [] }),
}));

/** Raccourci : modifie le bloc `id` (avec historique). */
export function updateBlock<T>(id: string, fn: (b: T) => void) {
  useStore.getState().update((p) => {
    const b = p.blocks.find((x) => x.id === id);
    if (b) fn(b as T);
  });
}

// --- Sauvegarde automatique (IndexedDB) et récupération au redémarrage ---

const AUTOSAVE_KEY = 'autosave-project';
let timer: ReturnType<typeof setTimeout> | undefined;

export function startAutosave() {
  useStore.subscribe((s, prev) => {
    if (s.project === prev.project) return;
    clearTimeout(timer);
    timer = setTimeout(() => idbSet(AUTOSAVE_KEY, s.project).catch(console.error), 600);
  });
}

export const loadAutosave = () => idbGet<Project>(AUTOSAVE_KEY);
