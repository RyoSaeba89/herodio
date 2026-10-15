// Convertit des SVG en PNG avec Edge (aperçus) : node render.mjs sortie.png a.svg b.svg … [--cols=4]
import { chromium } from '../../editor/node_modules/playwright-core/index.mjs';
import { readFileSync } from 'node:fs';
const args = process.argv.slice(2);
const cols = Number((args.find((a) => a.startsWith('--cols=')) ?? '--cols=4').slice(7));
const [out, ...files] = args.filter((a) => !a.startsWith('--'));
const b = await chromium.launch({ channel: 'msedge' });
const w = 320, h = 240;
const p = await b.newPage({ viewport: { width: w * Math.min(cols, files.length), height: h * Math.ceil(files.length / cols) } });
await p.setContent(`<style>body{margin:0;display:grid;grid-template-columns:repeat(${cols},${w}px)}div{width:${w}px;height:${h}px;position:relative}img{width:100%;height:100%}span{position:absolute;left:4px;top:2px;font:12px sans-serif;background:#fff9;padding:1px 4px}</style>`
  + files.map((f) => `<div><img src="data:image/svg+xml;base64,${readFileSync(f).toString('base64')}"><span>${f.split(/[\/]/).pop()}</span></div>`).join(''));
await p.waitForTimeout(300);
await p.screenshot({ path: out });
await b.close();
