// Vérifie la voix automatique : synthèse d'une phrase, durée, temps de calcul. node e2e-tts.mjs <dossier>
import { chromium } from 'playwright-core';
import { writeFileSync } from 'node:fs';
const out = process.argv[2] ?? '.';
const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('pageerror', e.message));
page.on('console', (m) => m.type() === 'error' && console.log('console', m.text()));
// Langue de l'interface (HERODIO_LANG=en pour l'anglais), sans passer par l'écran du premier démarrage.
await page.addInitScript((l) => localStorage.setItem('herodio-lang', l), process.env.HERODIO_LANG ?? 'fr');
await page.goto('http://localhost:1420');
const r = await page.evaluate(async () => {
  const tts = await import('/src/audio/tts.ts');
  const ok = await tts.ttsInstalled();
  const text = 'Il était une fois, dans une petite maison au bord de la forêt, une fillette qui portait un joli chaperon rouge. Que va-t-elle faire ?';
  const t0 = performance.now();
  const blob = await tts.synthesize(text);
  const t1 = performance.now();
  const blob2 = await tts.synthesize(text);
  const t2 = performance.now();
  const buf = new Uint8Array(await blob.arrayBuffer());
  return { ok, bytes: buf.length, first: Math.round(t1 - t0), cached: Math.round(t2 - t1), full: Array.from(buf) };
});
console.log('installée:', r.ok, '| octets:', r.bytes, '| durée audio ≈', ((r.bytes - 44) / 2 / 22050).toFixed(1), 's | calcul:', r.first, 'ms | cache:', r.cached, 'ms');
writeFileSync(`${out}/tts-test.wav`, Buffer.from(r.full));
await browser.close();
