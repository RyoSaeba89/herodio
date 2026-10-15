// Installe la voix automatique (synthèse vocale libre Piper) dans public/tts/ pour un fonctionnement hors ligne :
// - moteur : onnxruntime-web (MIT) et piper_phonemize/espeak-ng (WebAssembly, espeak-ng sous GPL-3) copiés depuis node_modules ;
// - voix : fr_FR-siwis-medium (Piper, données SIWIS sous CC BY 4.0), téléchargée une seule fois depuis Hugging Face.
// Usage : node scripts/setup-tts.mjs   (appelé automatiquement par npm run dev / npm run build)
import { copyFileSync, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const vendor = join(root, 'public/tts/vendor');
const voices = join(root, 'public/tts/voices');
mkdirSync(vendor, { recursive: true });
mkdirSync(voices, { recursive: true });

const copies = [
  ['node_modules/onnxruntime-web/dist/ort.wasm.min.js', 'ort.wasm.min.js'],
  ['node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm', 'ort-wasm-simd-threaded.wasm'],
  ['node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.mjs', 'ort-wasm-simd-threaded.mjs'],
  ['node_modules/@diffusionstudio/piper-wasm/build/piper_phonemize.js', 'piper_phonemize.js'],
  ['node_modules/@diffusionstudio/piper-wasm/build/piper_phonemize.wasm', 'piper_phonemize.wasm'],
  ['node_modules/@diffusionstudio/piper-wasm/build/piper_phonemize.data', 'piper_phonemize.data'],
];
for (const [src, dst] of copies) {
  const to = join(vendor, dst);
  if (!existsSync(to) || statSync(to).size !== statSync(join(root, src)).size) copyFileSync(join(root, src), to);
}

const VOICE = 'fr_FR-siwis-medium';
const BASE = 'https://huggingface.co/rhasspy/piper-voices/resolve/main/fr/fr_FR/siwis/medium/';
for (const f of [`${VOICE}.onnx.json`, 'MODEL_CARD', `${VOICE}.onnx`]) {
  const to = join(voices, f === 'MODEL_CARD' ? `${VOICE}.MODEL_CARD.txt` : f);
  if (existsSync(to) && statSync(to).size > 0) continue;
  process.stdout.write(`Téléchargement de la voix : ${f}… `);
  try {
    const res = await fetch(BASE + f);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    writeFileSync(to, Buffer.from(await res.arrayBuffer()));
    console.log('ok');
  } catch (e) {
    // Sans réseau, l'éditeur fonctionne : seule la voix automatique est indisponible.
    console.log(`échec (${e.message}) — la voix automatique sera indisponible.`);
    break;
  }
}
