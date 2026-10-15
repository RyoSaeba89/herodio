// Exporte toutes les histoires fournies pour plusieurs plateformes : node e2e-export-all.mjs <dossier> [plateformes…]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
const out = process.argv[2] ?? '.';
const platforms = process.argv.slice(3).length ? process.argv.slice(3) : ['Windows', 'Android 2.3', 'Cardputer ADV'];
const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
await page.goto('http://localhost:1420');
await page.evaluate(() => indexedDB.deleteDatabase('keyval-store'));
await page.reload();
await page.locator('.story-card').first().waitFor();
const titles = await page.locator('.story-card b').allInnerTexts();
for (const title of titles) {
  if (!(await page.locator('.welcome').count())) { await page.getByTitle('Nouvelle histoire ou exemple').click(); }
  await page.locator('.story-card', { hasText: title }).click();
  await page.locator('.welcome').waitFor({ state: 'detached', timeout: 60000 });
  await page.getByText('📦 Exporter mon histoire').click();
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
