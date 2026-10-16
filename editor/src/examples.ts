// Histoires fournies avec Herodio (voir src/stories/ et docs/histoires/analyse.md).
import { lang } from './i18n';
import type { Project } from './model/project';
import { buildStory } from './stories/build';
import type { StoryDef } from './stories/dsl';
import { inLang, TALES, TUTORIALS } from './stories/index';

export interface Example { id: string; title: string; icon: string; desc: string; notion: string; color: string; cover: string; make: () => Promise<Project> }

/** Les exemples sont proposés dans la langue de l'interface. */
const toExample = (src: StoryDef, d = inLang(src, lang)): Example => ({
  id: d.id, title: d.title, icon: d.icon, desc: d.description, notion: d.notion, color: d.color,
  cover: `examples/${d.id}/img/couverture.svg`, make: () => buildStory(d),
});

export const TUTORIAL_EXAMPLES = TUTORIALS.map((d) => toExample(d));
export const TALE_EXAMPLES = TALES.map((d) => toExample(d));
