// Captures d'écran du Studio pour le README, en français et en anglais : node e2e-captures.mjs <dossier>
import { chromium } from 'playwright-core';
const out = process.argv[2] ?? '.';
const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage({ viewport: { width: 1440, height: 860 } });

/** Premier démarrage dans la langue voulue ; ouvre l'exemple `story` si donné. */
async function start(button, story) {
  await page.goto('http://localhost:1420');
  await page.evaluate(() => { localStorage.clear(); indexedDB.deleteDatabase('keyval-store'); });
  await page.reload();
  await page.locator('.lang-picker').waitFor();
  await page.getByRole('button', { name: new RegExp(button) }).click();
  await page.locator('.story-card').first().waitFor();
  await page.waitForTimeout(1500);
  if (!story) return;
  await page.locator('.story-card', { hasText: story }).click();
  await page.locator('.welcome').waitFor({ state: 'detached', timeout: 60000 });
  await page.waitForTimeout(800);
}

const LANGS = [
  ['fr', 'Français', 'Le château mystérieux', 'Les trois petits cochons', '▶ Jouer mon histoire'],
  ['en', 'English', 'The mysterious castle', 'The three little pigs', '▶ Play my story'],
];
for (const [lang, button, castle, pigs, play] of LANGS) {
  await start(button);
  await page.screenshot({ path: `${out}/studio-accueil-${lang}.png` });
  await start(button, castle);
  await page.locator('.react-flow__controls-fitview').click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${out}/studio-editeur-${lang}.png` });
  await start(button, pigs);
  await page.getByText(play).click();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${out}/studio-jouer-${lang}.png` });
  console.log('✔ ' + lang);
}
await browser.close();
