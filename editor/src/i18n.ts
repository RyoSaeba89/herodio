// Langue de l'interface, choisie au premier démarrage puis gardée dans le stockage du navigateur (WebView2 pour l'exe).
// Les textes sont écrits en français dans le code : t(texte) renvoie leur traduction anglaise (src/i18n.en.ts) si besoin.
import { EN } from './i18n.en';

export type Lang = 'fr' | 'en';
// Pas de drapeaux : Windows les affiche en lettres (« FR », « GB »).
export const LANGS: { id: Lang; label: string }[] = [
  { id: 'fr', label: 'Français' },
  { id: 'en', label: 'English' },
];
const KEY = 'herodio-lang';

function stored(): Lang | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'fr' || v === 'en' ? v : null;
  } catch {
    return null; // tests (Node) ou stockage bloqué
  }
}

/** Langue choisie, ou null tant que personne ne l'a choisie (premier démarrage). */
export const chosenLang = stored();
export const lang: Lang = chosenLang ?? 'fr';
export const LOCALE = lang === 'en' ? 'en-GB' : 'fr-FR';

/** Change de langue : tous les textes sont lus au chargement, on recharge donc l'interface (le travail est autosauvé). */
export function setLang(l: Lang) {
  try { localStorage.setItem(KEY, l); } catch { /* sans stockage, le choix ne dure que jusqu'au rechargement */ }
  location.reload();
}

/** Traduit un texte écrit en français ; `{nom}` est remplacé par vars.nom.
 *  « texte|contexte » distingue deux sens d'un même mot français (Enregistrer|micro → Record, Enregistrer → Save). */
export function t(fr: string, vars?: Record<string, string | number>): string {
  const s = lang === 'en' ? EN[fr] ?? fr.split('|')[0] : fr.split('|')[0];
  return vars ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : s;
}

/** Nombre décimal à la mode du pays : 1,5 en français, 1.5 en anglais. */
export const dec = (x: number, digits = 1) => (lang === 'fr' ? x.toFixed(digits).replace('.', ',') : x.toFixed(digits));
