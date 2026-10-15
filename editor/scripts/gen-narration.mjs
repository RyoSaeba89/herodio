// Génère la narration des histoires fournies avec la voix automatique d'Herodio (Piper, voix Siwis),
// en utilisant exactement le moteur de l'éditeur, dans Edge sans fenêtre.
// Prérequis : `npm run dev` lancé. Usage : node scripts/gen-narration.mjs
import { chromium } from 'playwright-core';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const pub = join(import.meta.dirname, '../public/examples');
const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage();
await page.goto('http://localhost:1420');
const jobs = await page.evaluate(async () => {
  const { STORIES } = await import('/src/stories/index.ts');
  const { narrationTexts, textHash } = await import('/src/stories/dsl.ts');
  return STORIES.flatMap((s) => narrationTexts(s).map((text) => ({ story: s.id, text, hash: textHash(text) })));
});
const tmp = mkdtempSync(join(tmpdir(), 'herodio-voix-'));
let done = 0;
for (const j of jobs) {
  const dir = join(pub, j.story, 'voix');
  const out = join(dir, j.hash + '.ogg');
  if (existsSync(out)) continue;
  mkdirSync(dir, { recursive: true });
  const bytes = await page.evaluate(async (text) => {
    const { synthesize } = await import('/src/audio/tts.ts');
    return Array.from(new Uint8Array(await (await synthesize(text)).arrayBuffer()));
  }, j.text);
  const wav = join(tmp, j.hash + '.wav');
  writeFileSync(wav, Buffer.from(bytes));
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', wav, '-c:a', 'libvorbis', '-q:a', '4', out]);
  done++;
  process.stdout.write(`\r${done} narration(s) générée(s)`);
}
console.log(`\n${jobs.length} textes, ${done} nouveaux fichiers.`);
await browser.close();
