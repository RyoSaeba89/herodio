# Formats de fichiers

*[English version](format.en.md)*

Herodio sépare clairement trois choses :

| | Fichier | Contenu | Qui le lit |
|---|---|---|---|
| Projet éditable | `mon-histoire.herodio` | `project.json` + sons d'origine (`media/`) | l'éditeur |
| Pack de lecture | `mon-histoire.aistory` | `story.json` + `metadata.json` + sons prémixés (`assets/audio/`) | les lecteurs |

Les deux fichiers sont des archives ZIP ordinaires : on peut les ouvrir avec n'importe quel outil d'archive.

## Projet éditable `.herodio`

```
project.json        format "herodio-project", version 1
media/<id>.<ext>    sons et images d'origine (webm/opus, wav, mp3, ogg… ; png, jpeg, webp, svg…), jamais modifiés
```

`project.json` conserve **toutes** les informations d'édition :

- la position des blocs ;
- la langue de l'histoire (`lang` : `fr` ou `en`), qui choisit la voix automatique ; absente dans les fichiers d'avant la 0.2.1, qui sont en français ;
- le niveau d'interface (`decouverte` ou `avance`) ;
- les objets (avec leur icône) et les compteurs ;
- la bibliothèque de sons (nom, catégorie, durée, prise associée à un bloc) ;
- pour chaque emplacement sonore, le **mixage multipiste** : pistes (`voix`, `ambiance`, `bruitage`), volume, muet ou solo, extraits (`media`, `start`, `offset`, `duration`, `gain`, `fadeIn`, `fadeOut`) et ducking.

Le montage est non destructif : couper, rogner ou déplacer ne change que les fenêtres d'extraits. Les fichiers d'origine restent intacts.

Les sons sont toujours référencés par un **identifiant stable**, jamais par un chemin de fichier. Le type de référence se trouve dans `editor/src/model/project.ts`.

### Migration

`editor/src/io/projectFile.ts → migrate()` met à niveau les anciens fichiers à l'ouverture. Un fichier d'une version **plus récente** est refusé avec un message clair. Pour faire évoluer le format :

1. incrémenter `PROJECT_VERSION` ;
2. ajouter une étape `if (v < N) { … }` dans `migrate()` ;
3. ajouter un test.

## Pack de lecture `.aistory`

```
story.json              histoire exécutable (schéma : spec/story.schema.json)
metadata.json           format "herodio-pack", version, titre, auteur, plateforme, format audio, durée, couverture, couleur, crédits…
assets/audio/001.wav    un fichier par son, déjà mixé : WAV PCM 16 bits mono
assets/images/001.jpg   illustrations et couverture : JPEG de base (non progressif), à la taille de l'appareil
```

- `story.json` est **identique pour toutes les plateformes**. Seul l'audio change, selon le profil d'export :

  | Plateforme | Fréquence |
  |---|---|
  | Windows, Android, Raspberry Pi | 44,1 kHz |
  | Android 2.3 | 22,05 kHz |

- Champs facultatifs, ignorés par un lecteur qui ne les connaît pas (le format reste en version 1) :
  - `image` sur les scènes, les choix et les fins ;
  - `cover` (couverture) et `color` (couleur d'ambiance « #rrggbb ») sur l'histoire.
- Taille des images selon l'appareil :

  | Plateforme | Taille |
  |---|---|
  | Windows et Android | 1280 × 960 au plus |
  | Raspberry Pi | 1024 × 768 |
  | Android 2.3 | 640 × 480 |

- Les identifiants de blocs de `story.json` sont ceux de l'éditeur. Les traces de jeu se comparent donc d'une plateforme à l'autre.
- Deux emplacements qui ont exactement le même mixage partagent le même fichier.
- Les lecteurs refusent tout chemin qui sortirait du pack (`..`, chemin absolu) : un pack est une donnée venant d'ailleurs.
- Les textes de l'histoire sont dans sa propre langue ; les lecteurs ne traduisent que leur propre interface (boutons, fins, messages).

### Pourquoi du WAV prémixé ?

- Tous les appareils visés savent le lire, y compris le Stagefright d'Android 2.3, sans décodeur.
- Un seul flux à la fois : les vieux appareils n'ont pas à mixer plusieurs flux.
- Ce que l'enfant entend dans la prévisualisation correspond exactement au pack, car le même code de mixage (`editor/src/audio/mixer.ts`) sert aux deux.

En contrepartie, les fichiers sont plus gros. L'éditeur affiche une estimation de la taille avant l'export.
