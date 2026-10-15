// Histoires fournies avec Herodio (voir src/stories/ et docs/histoires/analyse.md).
import type { Project } from './model/project';
import { buildStory } from './stories/build';
import type { StoryDef } from './stories/dsl';
import { TALES, TUTORIALS } from './stories/index';

export interface Example { id: string; title: string; icon: string; desc: string; notion: string; color: string; cover: string; make: () => Promise<Project> }

const toExample = (d: StoryDef): Example => ({
  id: d.id, title: d.title, icon: d.icon, desc: d.description, notion: d.notion, color: d.color,
  cover: `examples/${d.id}/img/couverture.svg`, make: () => buildStory(d),
});

export const TUTORIAL_EXAMPLES = TUTORIALS.map(toExample);
export const TALE_EXAMPLES = TALES.map(toExample);
