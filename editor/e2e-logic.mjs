// Création d'une histoire avec objet + condition à la souris, lecture, enregistrement et réouverture.
// node e2e-logic.mjs <dossier-captures>
import { chromium } from 'playwright-core';
const out = process.argv[2] ?? '.';
const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto('http://localhost:1420');
await page.evaluate(() => indexedDB.deleteDatabase('keyval-store'));
await page.reload();
await page.locator('.welcome-card.new').click();
await page.locator('.mode-switch button').nth(1).click();

const node = (text) => page.locator('.react-flow__node').filter({ hasText: text }).first();
const handleOf = async (text, i = 0) => (await node(text).locator('.react-flow__handle.source').nth(i).boundingBox());
async function dragTo(from, x, y) {
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(x, y, { steps: 12 });
  await page.mouse.up();
}
// Glisser une flèche dans le vide puis choisir le type de bloc dans le menu.
async function extend(text, port, type, x, y) {
  await dragTo(await handleOf(text, port), x, y);
  await page.locator('.menu button', { hasText: type }).click();
  await page.waitForTimeout(200);
}
const title = async (t) => { const f = page.locator('.inspector label:has-text("Titre") + input'); await f.fill(t); };

await extend('Début', 0, 'Scène', 450, 150); await title('Le couloir');
await extend('Le couloir', 0, 'Objet', 750, 250);
await page.locator('.big-option', { hasText: 'Le donner' }).click();
await page.locator('.chip.add').click();
await page.locator('.new-thing input').fill('Clé rouillée');
await page.locator('.new-thing .btn.primary').click();
await extend('Donner', 0, 'Condition', 450, 420);
await page.locator('.big-option', { hasText: 'a un objet' }).click();
await page.locator('.chip', { hasText: 'Clé rouillée' }).click();
await extend('Condition', 0, 'Fin', 800, 520); await title('Porte ouverte');
await extend('Condition', 1, 'Fin', 450, 700); await title('Porte fermée');
await page.locator('.react-flow__pane').click({ position: { x: 50, y: 50 } });
await page.getByText('🧹 Ranger').click();
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/9-logic.png` });
const checkText = await page.locator('.btn.check').innerText();
console.log('Bouton vérification :', checkText.trim());

await page.getByText('▶ Jouer mon histoire').click();
await page.getByText('⏭ Suivant').click();
console.log('Fin atteinte :', await page.locator('.play-card h2').innerText(), '| sac :', await page.locator('.play-state').first().innerText());
await page.getByText('⏹ Arrêter').first().click();

const dl = page.waitForEvent('download');
await page.keyboard.press('Control+s');
const file = `${out}/${(await dl).suggestedFilename()}`;
await (await dl).saveAs(file);
await page.evaluate(() => indexedDB.deleteDatabase('keyval-store'));
await page.reload();
const chooser = page.waitForEvent('filechooser');
await page.locator('.welcome-card', { hasText: 'Ouvrir' }).click();
await (await chooser).setFiles(file);
await page.waitForTimeout(800);
console.log('Blocs après réouverture :', await page.locator('.react-flow__node').count(), '| titre :', await page.locator('.title-input').inputValue());
console.log('Erreurs :', errors.length ? errors : 'aucune');
await browser.close();
