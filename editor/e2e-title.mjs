// Le titre de l'en-tête s'élargit avec le texte sans être tronqué : node e2e-title.mjs [capture.png]
import { chromium } from 'playwright-core';
const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
// Langue de l'interface (HERODIO_LANG=en pour l'anglais), sans passer par l'écran du premier démarrage.
await page.addInitScript((l) => localStorage.setItem('herodio-lang', l), process.env.HERODIO_LANG ?? 'fr');
await page.goto('http://localhost:1420');
await page.evaluate(() => indexedDB.deleteDatabase('keyval-store'));
await page.reload();
await page.locator('.story-card', { hasText: 'Le petit berger et le loup' }).click();
await page.locator('.welcome').waitFor({ state: 'detached', timeout: 60000 });
const t = page.locator('.title-input');
const { scroll, client } = await t.evaluate((e) => ({ scroll: e.scrollWidth, client: e.clientWidth }));
if (scroll > client) throw new Error(`titre tronqué : ${scroll} > ${client}`);
await page.locator('.toolbar').screenshot({ path: process.argv[2] ?? 'title.png' });
console.log('titre entier :', await t.inputValue(), client + 'px');
await browser.close();
