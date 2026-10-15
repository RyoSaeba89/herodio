// Histoires fournies (étude et choix d'adaptation des contes : docs/histoires/analyse.md).
import { berger } from './berger';
import { cochons } from './cochons';
import { chateau, foret, premiere } from './exemples';
import { lievre } from './lievre';
import { poucet } from './poucet';
import { soupe } from './soupe';

/** Pour apprendre à se servir d'Herodio. */
export const TUTORIALS = [premiere, chateau, foret];
/** Contes du patrimoine adaptés aux 6-8 ans. */
export const TALES = [cochons, soupe, poucet, berger, lievre];
export const STORIES = [...TUTORIALS, ...TALES];
