// Test du studio audio sur l'exemple « La forêt enchantée » : node e2e-studio.mjs <dossier-captures>
import { chromium } from 'playwright-core';
const out = process.argv[2] ?? '.';
const browser = await chromium.launch({ channel: 'msedge', args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && !m.text().includes('404') && errors.push(m.text()));
// Langue de l'interface (HERODIO_LANG=en pour l'anglais), sans passer par l'écran du premier démarrage.
await page.addInitScript((l) => localStorage.setItem('herodio-lang', l), process.env.HERODIO_LANG ?? 'fr');
await page.goto('http://localhost:1420');
await page.evaluate(() => indexedDB.deleteDatabase('keyval-store'));
await page.reload();
await page.getByText('La forêt enchantée').click();
await page.waitForTimeout(1500);
await page.locator('.react-flow__node').filter({ hasText: 'L’orée de la forêt' }).click();
await page.locator('.mode-switch button').nth(1).click();
await page.locator('.slot button[title^="Ouvrir le studio"]').first().click();
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/4-studio.png` });
// Sélectionner un morceau de la voix et le supprimer
const clip = page.locator('.lane.role-voix .clip').first();
const box = await clip.boundingBox();
await page.mouse.move(box.x + 100, box.y + 30);
await page.mouse.down();
await page.mouse.move(box.x + 250, box.y + 30, { steps: 5 });
await page.mouse.up();
await page.locator('.studio-tools button', { hasText: 'Supprimer' }).click();
await page.waitForTimeout(500);
const n = await page.locator('.lane.role-voix .clip').count();
console.log('Extraits voix après suppression :', n);
await page.locator('.studio-bar button', { hasText: 'Lecture' }).click();
await page.waitForTimeout(1200);
await page.screenshot({ path: `${out}/5-studio-edit.png` });
await page.keyboard.press('Control+z');
await page.waitForTimeout(300);
console.log('Après annuler :', await page.locator('.lane.role-voix .clip').count());
console.log('Erreurs :', errors.length ? errors : 'aucune');
await browser.close();
