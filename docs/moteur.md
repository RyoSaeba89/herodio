# Le moteur narratif Herodio

*[English version](moteur.en.md)*

Une histoire se crée une seule fois et doit se jouer **exactement de la même façon** sur tous les appareils. Pour cela, chaque lecteur embarque sa propre copie du moteur. Ces copies suivent toutes les mêmes règles, qui sont décrites ici et vérifiées par des tests communs.

| Implémentation | Fichier | Utilisée par |
|---|---|---|
| TypeScript (référence) | `editor/src/engine/engine.ts` | prévisualisation de l'éditeur |
| Rust | `players/desktop/src/engine.rs` | lecteurs Windows, Linux et Raspberry Pi |
| Java (compatible API 9) | `players/android/common/org/herodio/core/Engine.java` | lecteur Android 2.3 → 14 |

## État du jeu

- `node` : le bloc présenté au joueur (une scène, un choix ou une fin), ou rien.
- `status` : `playing`, `end` ou `error`.
- `items` : liste ordonnée et sans doublon des objets possédés.
- `vars` : un entier 32 bits par compteur, initialisé avec sa valeur `initial`.
- `visited` : l'ensemble des blocs déjà traversés, y compris les blocs logiques.

## Règles

`start()` remet l'état à zéro (sac vide, compteurs à leur valeur initiale, `visited` vidé), puis **entre** dans le bloc `start`.

**Entrer** dans un bloc `id` revient à répéter les étapes suivantes, au plus `1000` fois :

1. Si `id` est nul ou inconnu, l'histoire s'arrête (`status = end`, `node = null`, jeton `#end`).
2. Ajouter `id` à `visited`.
3. Selon le type du bloc :
   - **`scene`** ou **`choice`** : il devient le bloc présenté, `status = playing`. On s'arrête.
   - **`end`** : il devient le bloc présenté, `status = end`. On s'arrête.
   - **`item`** : `give` ajoute l'objet s'il n'est pas déjà dans le sac ; `take` le retire. On continue vers `next`.
   - **`var`** : `set` donne au compteur la valeur `value` ; `add` lui ajoute `value`, avec débordement sur 32 bits. Un compteur inconnu vaut 0. On continue vers `next`.
   - **`cond`** : on continue vers `then` si le test est vrai, sinon vers `else`.
     - `item` : l'objet est-il dans le sac ?
     - `var` : la comparaison `compteur op valeur` est-elle vraie ? (`==`, `!=`, `<`, `<=`, `>`, `>=`)
     - `visited` : le bloc est-il dans `visited` ?
   - **`jump`** : si `reset` est vrai, on remet le sac, les compteurs et `visited` à zéro. On continue vers `target`.
   - **Type inconnu** : erreur.
4. Au-delà de 1000 étapes sans atteindre une scène, un choix ou une fin, il s'agit d'une **boucle infinie** : `status = error`, jeton `#error`.

Le joueur ne peut faire que les actions suivantes :

- `next()` : sur une scène, entrer dans `next`. Sans effet ailleurs.
- `choose(i)` : sur un choix, entrer dans la cible de la réponse `i`. Sans effet si `i` est hors limites.
- `start()` : recommencer.

Les lecteurs ne changent jamais de page tout seuls : à la fin du son d'une scène, ils attendent que le joueur appuie sur « Suivant ».

## Tests de conformité

Chaque fichier `spec/conformance/*.json` contient :

- une histoire ;
- une suite d'entrées (`next`, `choose:N`, `restart`) ;
- la **trace** attendue, c'est-à-dire le jeton du bloc présenté après le démarrage puis après chaque entrée (identifiant du bloc, `#end` ou `#error`) ;
- l'état final attendu (objets et compteurs).

| Moteur | Commande |
|---|---|
| TypeScript | `cd editor && npm test` |
| Rust | `cd players/desktop && cargo test` |
| Java | `cd players/android && python build.py` (lance aussi les tests) |

Pour ajouter une règle au moteur : écrire d'abord un fichier de conformité, puis modifier les trois moteurs jusqu'à ce que tous le passent.
