# Third-party components

*[Version française](THIRD_PARTY.md)*

Herodio's code is under the MIT licence ([LICENSE](LICENSE)). The published programs also include the following components.

## Herodio Studio (editor)

| Component | Licence | Source |
|---|---|---|
| Piper voice `fr_FR-siwis-medium` (SIWIS data) | **CC BY 4.0** — attribution required | https://huggingface.co/rhasspy/piper-voices · https://creativecommons.org/licenses/by/4.0/ |
| Piper voice `en_US-ljspeech-medium` (LJ Speech data) | public domain | https://huggingface.co/rhasspy/piper-voices · https://keithito.com/LJ-Speech-Dataset/ |
| piper_phonemize (WebAssembly), via `@diffusionstudio/piper-wasm` 1.0.0 | MIT | https://github.com/diffusion-studio/piper-wasm |
| espeak-ng data and code, included in piper_phonemize | **GPL-3.0** ([text](LICENSES/GPL-3.0.txt)) | https://github.com/espeak-ng/espeak-ng · https://github.com/rhasspy/piper-phonemize |
| onnxruntime-web 1.30.0 | MIT | https://github.com/microsoft/onnxruntime |
| React, React Flow (@xyflow/react), zustand, immer, fflate, idb-keyval | MIT | npm |
| Nunito font (@fontsource-variable/nunito) | SIL OFL 1.1 | https://github.com/googlefonts/nunito |
| Tauri 2 | MIT / Apache-2.0 | https://github.com/tauri-apps/tauri |

espeak-ng is a separate component, loaded on its own (`editor/public/tts/vendor/`). Its corresponding source code is available at the addresses above. `editor/scripts/setup-tts.mjs` rebuilds these files from npm.

## Players

- **PC / Raspberry Pi (Rust)**: eframe/egui, rodio, image, zip, serde, crossterm and their dependencies, under MIT and/or Apache-2.0 licences. The full list is in `players/desktop/Cargo.lock`.
- **Android**: no dependencies (Java and the Android API only).
- **Cardputer**: M5Unified, M5GFX and M5Cardputer (MIT), ArduinoJson (MIT), the Arduino-ESP32 framework (LGPL-2.1, with parts under Apache-2.0). The firmware's full source code is in `players/cardputer/`, which makes it possible to rebuild and relink it.

## Included stories

The adaptations, pictures, sound effects and music are Herodio creations under **CC0**. The original tales are in the public domain. The narration uses the Siwis voice (CC BY 4.0 above) for the French versions and the LJ Speech voice (public domain) for the English versions; the attribution is in each pack's `metadata.json`.
