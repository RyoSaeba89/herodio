# Herodio — studio d'histoires audio dont tu es le héros

Herodio permet à un enfant (de 7 à 14 ans environ), à un enseignant ou à un animateur de **créer une histoire audio interactive sans écrire de code**. On relie des blocs colorés, on enregistre sa voix, on ajoute des bruitages et une ambiance, puis on joue l'histoire. On l'exporte enfin vers un PC, un Raspberry Pi, un téléphone Android, récent ou très ancien, ou un M5Stack Cardputer.

Tout fonctionne **hors ligne**, sans compte et sans abonnement.

## Ce qu'on peut faire

- **Éditeur de blocs** dans l'esprit de Scratch :
  - les blocs : Début, Scène, Choix et Fin, plus, en mode 🚀 Avancé, Objet, Condition, Compteur et Retour ;
  - glisser-déposer, liaison à la souris (lâcher une flèche dans le vide propose de créer le bloc suivant), menu au clic droit, zoom, rangement automatique ;
  - annuler / rétablir, sauvegarde automatique et récupération après une fermeture accidentelle.
- **Enregistrement au micro** sur chaque scène, question ou réponse : plusieurs prises, écoute immédiate, choix de la prise.
- **Studio audio** (« mini-Audacity » pour enfants) :
  - forme d'onde, sélection d'un morceau, couper, supprimer, garder seulement un morceau, déplacer ;
  - plus fort / moins fort, volume idéal (normalisation), apparition et disparition progressives, fondu enchaîné ;
  - pistes voix, ambiance et bruitage, avec muet, solo et volume ;
  - baisse automatique de l'ambiance quand quelqu'un parle (ducking).
- **Bibliothèque de sons** : import WAV, MP3, OGG, FLAC ou M4A ; catégories ; préécoute ; glisser un son sur un bloc ; repérage des sons inutilisés.
- **« Jouer mon histoire »** avec le même moteur que les lecteurs :
  - le bloc en cours est mis en évidence et le chemin parcouru est surligné ;
  - le sac et les compteurs sont affichés ;
  - on peut jouer à partir de n'importe quel bloc, avec un état de départ choisi.
- **Vérification** en langage d'enfant : début manquant, flèche manquante, bloc jamais atteint, impasse, boucle infinie, objet jamais donné, son introuvable…
- **Export en un clic** vers 5 plateformes, avec estimation de la taille et conseils propres à chaque appareil.
- **3 exemples** : *Ma première histoire*, *Le château mystérieux* (clé, porte verrouillée, fin secrète) et *La forêt enchantée* (narration, bruitages, musique).

## État du projet

Ce tableau distingue ce qui est écrit, compilé et testé :

| Composant | Implémenté | Compilé | Testé |
|---|---|---|---|
| Éditeur (Windows, Tauri) | ✅ | ✅ exe + installateur NSIS (2,8 Mo) | ✅ 16 tests unitaires, tests de bout en bout dans Edge (création, logique, studio, export, enregistrement/réouverture), démarrage de l'exe vérifié ; ⚠️ enregistrement au micro non testé automatiquement |
| Moteur TypeScript (référence) | ✅ | ✅ | ✅ conformité |
| Lecteur Windows (Rust) | ✅ | ✅ | ✅ conformité, partie complète automatisée, rendu de la fenêtre vérifié par capture ; ⚠️ son et clavier non essayés à la main |
| Lecteur Linux / Raspberry Pi (Rust) | ✅ | ✅ x86_64 Linux (WSL) ; vérification de compilation pour aarch64 | ⚠️ tests passés sur Linux x86_64 ; **à valider sur un vrai Raspberry Pi** |
| Lecteur Android 2.3 → 14 (Java) | ✅ | ✅ APK signé v1+v2, compilé contre l'API 9 | ✅ émulateurs Android 2.3.7, 5.1 et 14 (import, lecture WAV, D-pad, clavier, toucher, histoire complète) ; **à valider sur un vrai Xperia Play** |
| Firmware Cardputer / ADV (C++) | ✅ | ✅ PlatformIO (ESP32-S3) | ✅ conformité du moteur sur PC ; **à valider sur l'appareil** (écran, clavier, son, carte SD) |

## Architecture

```
editor/            Herodio Studio — React + TypeScript + React Flow + Web Audio, empaqueté avec Tauri 2
  src/engine/      moteur narratif de référence
  src/model/       projet éditable, compilation vers story.json, validation, édition audio
  src/audio/       mixage (prévisualisation ET export), lecture, enregistrement
  src/io/          fichiers .herodio, export des packs .aistory
  src/ui/          interface
  src-tauri/       application Windows (lecture et écriture de fichiers)
players/
  desktop/         lecteur Rust (egui + rodio) : Windows, Linux, Raspberry Pi (+ mode console)
  android/         lecteur Java sans dépendance, de l'API 9 à 34, compilé sans Gradle (build.py)
  cardputer/       firmware PlatformIO / Arduino pour M5Stack Cardputer et Cardputer ADV
spec/
  story.schema.json   schéma du format exécutable
  conformance/        tests partagés par les 4 moteurs
docs/              formats, moteur, installation des lecteurs
tools/             génération des sons d'exemple
```

**Principe clé** : la plateforme partage le **format de données** et les **règles du moteur**, pas le code. Chaque lecteur est natif de son appareil : Java 6 pour Android 2.3, C++ pour l'ESP32, Rust pour le PC. Les mêmes tests de conformité garantissent qu'à état égal, une histoire prend les mêmes décisions partout. Voir [docs/moteur.md](docs/moteur.md).

L'audio est **prémixé à l'export** : un seul fichier WAV mono par moment de l'histoire, à la fréquence adaptée à l'appareil. Le mixage utilisé pour l'export est le même que celui de la prévisualisation. Voir [docs/format.md](docs/format.md).

### Inspiration : STUdio

[STUdio](https://github.com/marian-m12l/studio) modélise les packs Lunii :

- des **nœuds de scène** (image et son, avec des réglages de molette, OK, accueil et lecture automatique) ;
- des **nœuds d'action** (la liste des options) ;
- une conversion des sons au moment du transfert vers l'appareil.

Herodio en reprend trois idées :

- une **réponse peut avoir son propre son**, entendu quand on la surligne (comme la molette Lunii), ce qui rend les choix utilisables par un enfant qui ne lit pas encore ;
- la **lecture automatique** de la scène suivante à la fin du son ;
- la **conversion à l'export** selon l'appareil.

Herodio y ajoute ce que Lunii n'a pas : objets, conditions, compteurs, boucles explicites, un éditeur audio et des lecteurs ouverts sur 5 plateformes, sans dépendre d'un appareil propriétaire.

## Démarrer

```sh
# Éditeur
cd editor
npm install
npm run dev            # dans le navigateur : http://localhost:1420
npm test               # tests unitaires + conformité
npx tauri dev          # application Windows
npx tauri build        # exe + installateur dans src-tauri/target/release/

# Lecteurs : voir docs/lecteurs.md
```

Tests de bout en bout (Edge, sans fenêtre visible) : lancer `npm run dev`, puis `node e2e-smoke.mjs <dossier>`, `e2e-logic.mjs`, `e2e-studio.mjs` et `e2e-export.mjs`.

## Licences

- Code : MIT.
- Bruitages et musique des exemples : générés par `tools/gen_example_audio.py`, domaine public (CC0).
- **Narration des exemples** : synthèse vocale Windows (voix « Microsoft Hortense »), générée localement. Avant toute diffusion publique, il vaut mieux la remplacer par de vraies voix enregistrées, car les conditions de redistribution de ces voix ne sont pas claires.
