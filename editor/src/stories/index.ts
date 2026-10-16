// Histoires fournies (étude et choix d'adaptation des contes : docs/histoires/analyse.md), en français et en anglais.
import type { Lang } from '../i18n';
import { berger } from './berger';
import { bergerEn } from './berger.en';
import { cochons } from './cochons';
import { cochonsEn } from './cochons.en';
import { localize, type StoryDef, type StoryText } from './dsl';
import { chateau, foret, premiere } from './exemples';
import { chateauEn, foretEn, premiereEn } from './exemples.en';
import { lievre } from './lievre';
import { lievreEn } from './lievre.en';
import { poucet } from './poucet';
import { poucetEn } from './poucet.en';
import { soupe } from './soupe';
import { soupeEn } from './soupe.en';

const EN: Record<string, StoryText> = {
  premiere: premiereEn, chateau: chateauEn, foret: foretEn, cochons: cochonsEn, soupe: soupeEn, poucet: poucetEn, berger: bergerEn, lievre: lievreEn,
};

/** Une histoire fournie dans la langue demandée. */
export const inLang = (d: StoryDef, lang: Lang): StoryDef => (lang === 'fr' ? d : localize(d, lang, EN[d.id]));

/** Pour apprendre à se servir d'Herodio. */
export const TUTORIALS = [premiere, chateau, foret];
/** Contes du patrimoine adaptés aux 6-8 ans. */
export const TALES = [cochons, soupe, poucet, berger, lievre];
export const STORIES = [...TUTORIALS, ...TALES];
/** Toutes les versions : françaises puis anglaises. */
export const ALL_STORIES = [...STORIES, ...STORIES.map((d) => inLang(d, 'en'))];
