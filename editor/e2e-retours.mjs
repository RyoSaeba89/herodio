// Retours de l'alpha 0.2.3, corrigés en 0.3.0 dans Edge (Playwright, avec `npm run dev`) : node e2e-retours.mjs
import { chromium } from 'playwright-core';
const browser = await chromium.launch({ channel: 'msedge', args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.addInitScript(() => localStorage.setItem('herodio-lang', 'fr'));
await page.goto('http://localhost:1420');
await page.getByText('Le château mystérieux').click();
await page.waitForTimeout(800);
const fails = [];
const check = (ok, msg) => { console.log((ok ? 'OK    ' : 'ÉCHEC ') + msg); if (!ok) fails.push(msg); };

// 1. Maj dans un champ de texte : React Flow passe en mode sélection ; le canevas ne doit pas se couvrir de violet.
await page.locator('.react-flow__node').filter({ hasText: 'Où aller' }).click();
await page.locator('.inspector textarea').first().click();
await page.keyboard.down('Shift');
await page.waitForTimeout(200);
const pane = await page.evaluate(() => { const s = getComputedStyle(document.querySelector('.react-flow__pane')); return s.backgroundColor + ' ' + s.pointerEvents; });
await page.keyboard.up('Shift');
check(!pane.includes('214') && !pane.includes('none'), `Maj dans un champ ne colore pas le canevas (${pane})`);
const panel = await page.evaluate(() => getComputedStyle(document.querySelector('.react-flow__controls')).borderRightWidth);
check(panel === '0px', `les boutons de zoom n'héritent pas du style du panneau de gauche (bordure ${panel})`);

// 2. Une scène avec un son ne passe pas toute seule à la suite.
await page.getByText('▶ Jouer mon histoire').click();
await page.waitForTimeout(500);
const first = await page.locator('.play-card h2').innerText();
await page.waitForFunction(() => !document.querySelector('.play-card.speaking'), null, { timeout: 30000 });
await page.waitForTimeout(800);
check(await page.locator('.play-card h2').innerText() === first, `la scène « ${first} » attend « Suivant » après son son`);

// 3. La souris reste où l'on a cliqué : la réponse qui apparaît dessous ne coupe pas la question.
const b = await page.getByText('⏭ Suivant').boundingBox();
await page.mouse.move(b.x + 10, b.y + b.height / 2);
await page.mouse.down(); await page.mouse.up();
await page.waitForTimeout(400);
await page.mouse.move(b.x + 12, b.y + b.height / 2);
await page.waitForTimeout(200);
const under = await page.evaluate(([x, y]) => !!document.elementFromPoint(x, y)?.closest('.choice-btn'), [b.x + 12, b.y + b.height / 2]);
check(under && await page.locator('.play-card.speaking').count() === 1, 'la question est toujours lue, curseur sur une réponse');
const o = await page.locator('.choice-btn').nth(0).boundingBox();
await page.mouse.move(o.x + 20, o.y - 30, { steps: 3 });
await page.mouse.move(o.x + 20, o.y + 10, { steps: 3 });
await page.waitForTimeout(400);
check(await page.locator('.play-card.speaking').count() === 0, 'survoler ensuite une réponse la fait entendre');

await browser.close();
process.exit(fails.length ? 1 : 0);
