// Langue au premier démarrage, dans Edge (Playwright) : node e2e-lang.mjs <dossier-captures>
// Vérifie l'écran de choix, l'interface et les exemples en anglais, puis le retour au français par la barre d'outils.
import { chromium } from 'playwright-core';
const out = process.argv[2] ?? '.';
const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text() + ' @ ' + m.location().url));
page.on('response', (r) => r.status() >= 400 && errors.push(r.status() + ' ' + r.url()));
const check = (ok, what) => { console.log((ok ? '✔ ' : '✘ ') + what); if (!ok) process.exitCode = 1; };

await page.goto('http://localhost:1420');
await page.evaluate(() => { localStorage.clear(); indexedDB.deleteDatabase('keyval-store'); });
await page.reload();
await page.locator('.lang-picker').waitFor();
check(await page.locator('.welcome:not(.lang-picker)').count() === 0, 'premier démarrage : seul le choix de langue est affiché');
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/1-langue.png` });

await page.getByRole('button', { name: /English/ }).click();
await page.locator('.story-card').first().waitFor();
await page.screenshot({ path: `${out}/2-welcome-en.png` });
check(await page.getByText('Create audio stories where you are the hero!').count() === 1, 'accueil en anglais');
check(await page.locator('html').getAttribute('lang') === 'en', '<html lang="en">');
const titles = await page.locator('.story-card b').allInnerTexts();
console.log('  Exemples :', titles.join(' · '));
check(titles.includes('The three little pigs') && titles.includes('Stone soup'), 'exemples en anglais');

await page.locator('.story-card', { hasText: 'The mysterious castle' }).click();
await page.locator('.welcome').waitFor({ state: 'detached', timeout: 60000 });
await page.waitForTimeout(600);
await page.screenshot({ path: `${out}/3-editor-en.png` });
check(await page.getByText('▶ Play my story').count() === 1, 'barre d’outils en anglais');
check(await page.locator('.react-flow__node', { hasText: 'Where to go?' }).count() === 1, 'blocs de l’histoire en anglais');
check(await page.getByRole('button', { name: 'Zoom in' }).count() === 1, 'commandes de React Flow en anglais');

await page.getByText('▶ Play my story').click();
await page.getByText('⏭ Next').click();
await page.getByRole('button', { name: /Go into the castle/ }).click();
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/4-play-en.png` });
check((await page.locator('.play-card h2').innerText()).includes('The door is locked'), 'partie jouée en anglais');
await page.getByText('⏹ Stop').first().click();

await page.locator('.react-flow__node', { hasText: 'Where to go?' }).click();
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/5-inspector-en.png` });
check(await page.getByText('Possible answers').count() === 1, 'inspecteur en anglais');
await page.locator('.react-flow__pane').click({ position: { x: 30, y: 30 } });
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/6-story-en.png` });
check(await page.locator('.voice-card').innerText().then((s) => s.includes('LJ Speech')), 'voix anglaise proposée pour une histoire anglaise');

// Retour au français : l'histoire ouverte est conservée (autosauvegarde)
await page.waitForTimeout(1500);
await page.locator('.lang-select').selectOption('fr');
await page.waitForLoadState('load');
await page.getByText('▶ Jouer mon histoire').waitFor();
await page.screenshot({ path: `${out}/7-retour-fr.png` });
check(await page.locator('.react-flow__node', { hasText: 'Where to go?' }).count() === 1, 'retour au français : l’histoire anglaise reste ouverte');
check(await page.locator('.lang-picker').count() === 0, 'le choix de langue ne réapparaît pas');

console.log('Erreurs :', errors.length ? errors : 'aucune');
if (errors.length) process.exitCode = 1;
await browser.close();
