# Formats de fichiers

Herodio sépare clairement trois choses :

| | Fichier | Contenu | Qui le lit |
|---|---|---|---|
| Projet éditable | `mon-histoire.herodio` | `project.json` + sons d'origine (`media/`) | l'éditeur |
| Pack de lecture | `mon-histoire.aistory` | `story.json` + `metadata.json` + sons prémixés (`assets/audio/`) | les lecteurs |
| Carte SD Cardputer | `…-carte-sd.zip` | le même pack, déjà décompressé dans `herodio/<histoire>/` | le Cardputer |

Les deux fichiers sont des archives ZIP ordinaires : on peut les ouvrir avec n'importe quel outil d'archive.

## Projet éditable `.herodio`

```
project.json        format "herodio-project", version 1
media/<id>.<ext>    sons d'origine (enregistrements webm/opus, imports wav/mp3/ogg…), jamais modifiés
```

`project.json` conserve **toutes** les informations d'édition :

- la position des blocs ;
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
metadata.json           format "herodio-pack", version, titre, auteur, plateforme, format audio, durée…
assets/audio/001.wav    un fichier par son, déjà mixé : WAV PCM 16 bits mono
```

- `story.json` est **identique pour toutes les plateformes**. Seul l'audio change, selon le profil d'export :

  | Plateforme | Fréquence |
  |---|---|
  | Windows, Android, Raspberry Pi | 44,1 kHz |
  | Android 2.3 | 22,05 kHz |
  | Cardputer | 16 kHz |

- Les identifiants de blocs de `story.json` sont ceux de l'éditeur. Les traces de jeu se comparent donc d'une plateforme à l'autre.
- Deux emplacements qui ont exactement le même mixage partagent le même fichier.
- Les lecteurs refusent tout chemin qui sortirait du pack (`..`, chemin absolu) : un pack est une donnée venant d'ailleurs.

### Pourquoi du WAV prémixé ?

- Tous les appareils visés savent le lire, y compris le Stagefright d'Android 2.3 et l'ESP32-S3, sans décodeur.
- Un seul flux à la fois : le Cardputer ne peut pas mixer plusieurs flux compressés.
- Ce que l'enfant entend dans la prévisualisation correspond exactement au pack, car le même code de mixage (`editor/src/audio/mixer.ts`) sert aux deux.

En contrepartie, les fichiers sont plus gros. L'éditeur affiche une estimation de la taille avant l'export.
