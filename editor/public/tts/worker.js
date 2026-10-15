// Synthèse vocale Piper dans un Web Worker (hors ligne) : texte → phonèmes (espeak-ng) → modèle ONNX → PCM.
// Message reçu : { id, text, voice } ; réponse : { id, pcm: Float32Array, sampleRate } ou { id, error }.
/* global ort, createPiperPhonemize */
importScripts('vendor/ort.wasm.min.js', 'vendor/piper_phonemize.js');

ort.env.wasm.numThreads = 1; // pas de SharedArrayBuffer nécessaire
ort.env.wasm.wasmPaths = new URL('vendor/', self.location.href).href;

const sessions = new Map();

async function load(voice) {
  let s = sessions.get(voice);
  if (!s) {
    s = (async () => {
      const config = await (await fetch(`voices/${voice}.onnx.json`)).json();
      const model = await (await fetch(`voices/${voice}.onnx`)).arrayBuffer();
      const session = await ort.InferenceSession.create(model, { executionProviders: ['wasm'] });
      return { config, session };
    })();
    sessions.set(voice, s);
    s.catch(() => sessions.delete(voice));
  }
  return s;
}

function phonemize(text, espeakVoice) {
  return new Promise((resolve, reject) => {
    let done = false;
    createPiperPhonemize({
      print: (data) => { done = true; resolve(JSON.parse(data).phoneme_ids); },
      printErr: () => {}, // avertissements d'espeak-ng sans conséquence
      locateFile: (f) => 'vendor/' + f,
    }).then((m) => {
      m.callMain(['-l', espeakVoice, '--input', JSON.stringify([{ text }]), '--espeak_data', '/espeak-ng-data']);
      if (!done) reject(new Error('phonémisation impossible'));
    }, reject);
  });
}

/** Découpe en phrases : le modèle est plus fiable sur des morceaux courts. */
function sentences(text) {
  return (text.replace(/\s+/g, ' ').match(/[^.!?…]+[.!?…]*["»”]?\s*/g) || []).map((s) => s.trim()).filter(Boolean);
}

async function speak(text, voice, rate) {
  const { config, session } = await load(voice);
  const sr = config.audio.sample_rate;
  const pause = new Float32Array(Math.round(sr * 0.28));
  const parts = [];
  for (const s of sentences(text)) {
    const ids = await phonemize(s, config.espeak.voice);
    const inf = config.inference;
    const feeds = {
      input: new ort.Tensor('int64', BigInt64Array.from(ids.map(BigInt)), [1, ids.length]),
      input_lengths: new ort.Tensor('int64', BigInt64Array.from([BigInt(ids.length)]), [1]),
      scales: new ort.Tensor('float32', Float32Array.from([inf.noise_scale, inf.length_scale * rate, inf.noise_w]), [3]),
    };
    if (Object.keys(config.speaker_id_map || {}).length) feeds.sid = new ort.Tensor('int64', BigInt64Array.from([0n]), [1]);
    const out = await session.run(feeds);
    parts.push(out.output.data, pause);
  }
  const pcm = new Float32Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) { pcm.set(p, o); o += p.length; }
  return { pcm, sampleRate: sr };
}

self.onmessage = async (e) => {
  const { id, text, voice, rate = 1 } = e.data;
  try {
    const { pcm, sampleRate } = await speak(text, voice, rate);
    self.postMessage({ id, pcm, sampleRate }, [pcm.buffer]);
  } catch (err) {
    self.postMessage({ id, error: String((err && err.message) || err) });
  }
};
