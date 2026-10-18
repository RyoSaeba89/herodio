# Composants tiers

*[English version](THIRD_PARTY.en.md)*

Le code d'Herodio est sous licence MIT ([LICENSE](LICENSE)). Les programmes publiés incluent aussi les composants suivants.

## Herodio Studio (éditeur)

| Composant | Licence | Source |
|---|---|---|
| Voix Piper `fr_FR-siwis-medium` (données SIWIS) | **CC BY 4.0** — attribution obligatoire | https://huggingface.co/rhasspy/piper-voices · https://creativecommons.org/licenses/by/4.0/ |
| Voix Piper `en_US-ljspeech-medium` (données LJ Speech) | domaine public | https://huggingface.co/rhasspy/piper-voices · https://keithito.com/LJ-Speech-Dataset/ |
| piper_phonemize (WebAssembly), via `@diffusionstudio/piper-wasm` 1.0.0 | MIT | https://github.com/diffusion-studio/piper-wasm |
| Données et code d'espeak-ng, inclus dans piper_phonemize | **GPL-3.0** ([texte](LICENSES/GPL-3.0.txt)) | https://github.com/espeak-ng/espeak-ng · https://github.com/rhasspy/piper-phonemize |
| onnxruntime-web 1.30.0 | MIT | https://github.com/microsoft/onnxruntime |
| React, React Flow (@xyflow/react), zustand, immer, fflate, idb-keyval | MIT | npm |
| Police Nunito (@fontsource-variable/nunito) | SIL OFL 1.1 | https://github.com/googlefonts/nunito |
| Tauri 2 | MIT / Apache-2.0 | https://github.com/tauri-apps/tauri |
| Microsoft Edge WebView2 Runtime (installateur hors ligne, dans `…-windows-setup.exe` seulement ; lancé seulement s'il manque) | licence Microsoft, redistribution prévue par Microsoft | https://developer.microsoft.com/microsoft-edge/webview2 |

espeak-ng est un composant séparé, chargé à part (`editor/public/tts/vendor/`). Son code source correspondant est disponible aux adresses ci-dessus. `editor/scripts/setup-tts.mjs` reconstitue ces fichiers depuis npm.

## Lecteurs

- **PC / Raspberry Pi (Rust)** : eframe/egui, rodio, image, zip, serde, crossterm et leurs dépendances, sous licences MIT et/ou Apache-2.0. La liste complète est dans `players/desktop/Cargo.lock`.
- **Android** : aucune dépendance (Java et API Android seuls).

## Histoires fournies

Les adaptations, illustrations, bruitages et musiques sont des créations Herodio sous **CC0**. Les contes d'origine sont du domaine public. La narration utilise la voix Siwis (CC BY 4.0 ci-dessus) pour les versions françaises et la voix LJ Speech (domaine public) pour les versions anglaises ; l'attribution figure dans le `metadata.json` de chaque pack.
