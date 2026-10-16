// Exporte toutes les histoires fournies pour plusieurs plateformes : node e2e-export-all.mjs <dossier> [plateformes…]
// HERODIO_LANG=en exporte les versions anglaises (interface et histoires en anglais).
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
const out = process.argv[2] ?? '.';
const platforms = process.argv.slice(3).length ? process.argv.slice(3) : ['Windows', 'Android 2.3', 'Cardputer ADV'];
const L = process.env.HERODIO_LANG === 'en'
  ? { more: 'New story or example', exp: '📦 Export my story' }
  : { more: 'Nouvelle histoire ou exemple', exp: '📦 Exporter mon histoire' };
const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
// Langue de l'interface (HERODIO_LANG=en pour l'anglais), sans passer par l'écran du premier démarrage.
await page.addInitScript((l) => localStorage.setItem('herodio-lang', l), process.env.HERODIO_LANG ?? 'fr');
await page.goto('http://localhost:1420');
await page.evaluate(() => indexedDB.deleteDatabase('keyval-store'));
await page.reload();
await page.locator('.story-card').first().waitFor();
const titles = await page.locator('.story-card b').allInnerTexts();
for (const title of titles) {
  if (!(await page.locator('.welcome').count())) { await page.getByTitle(L.more).click(); }
  await page.locator('.story-card', { hasText: title }).click();
  await page.locator('.welcome').waitFor({ state: 'detached', timeout: 60000 });
  await page.getByText(L.exp).click();
  for (const pf of platforms) {
    await page.locator('.platform', { hasText: pf }).first().click();
    const dir = `${out}/${pf.replace(/\W+/g, '')}`;
    mkdirSync(dir, { recursive: true });
    const dl = page.waitForEvent('download', { timeout: 300000 });
    await page.locator('.export-actions .export-btn').click();
    const d = await dl;
    await d.saveAs(`${dir}/${d.suggestedFilename()}`);
    console.log(pf, '→', d.suggestedFilename());
  }
  await page.locator('.export .modal-close').click();
}
await browser.close();
