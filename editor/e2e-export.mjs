// Exporte un exemple pour chaque plateforme : node e2e-export.mjs <dossier> [exemple]
import { chromium } from 'playwright-core';
const out = process.argv[2] ?? '.';
const example = process.argv[3] ?? 'La forêt enchantée';
const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
// Langue de l'interface (HERODIO_LANG=en pour l'anglais), sans passer par l'écran du premier démarrage.
await page.addInitScript((l) => localStorage.setItem('herodio-lang', l), process.env.HERODIO_LANG ?? 'fr');
await page.goto('http://localhost:1420');
await page.evaluate(() => indexedDB.deleteDatabase('keyval-store'));
await page.reload();
await page.getByText(example).click();
await page.waitForTimeout(1500);
await page.getByText('📦 Exporter mon histoire').click();
for (const pf of ['Windows', 'Android 2.3']) {
  await page.locator('.platform', { hasText: pf }).first().click();
  if (pf === 'Windows') await page.screenshot({ path: `${out}/6-export.png` });
  const dl = page.waitForEvent('download');
  await page.locator('.export-actions .export-btn').click();
  const d = await dl;
  await d.saveAs(`${out}/${d.suggestedFilename()}`);
  console.log('Exporté :', d.suggestedFilename());
}
console.log('Erreurs :', errors.length ? errors : 'aucune');
await browser.close();
