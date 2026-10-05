// Smoke test: serves the game, walks Home → Map → Board 1, plays random legal moves, checks a few systems.
// Run: npm install && npx playwright install chromium && npm test
import { chromium } from 'playwright';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const types = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.png':'image/png', '.webmanifest':'application/manifest+json' };
const server = http.createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
    const file = normalize(join(root, p)); if (!file.startsWith(root)) throw 0;
    res.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream' }); res.end(await readFile(file));
  } catch { res.writeHead(404); res.end(); }
}).listen(0);
const base = `http://localhost:${server.address().port}/`;

const fail = (m) => { console.error('FAIL:', m); process.exitCode = 1; };
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 420, height: 860 } })).newPage();
const errors = []; page.on('pageerror', e => errors.push(e.message));
await page.goto(base + '?debug'); await page.waitForTimeout(500);
const T = (fn, arg) => page.evaluate(fn, arg);

await page.click('#mapBtn'); await page.waitForTimeout(300);
const nodes = await page.$$eval('.node', e => e.length); if (nodes !== 20) fail(`expected 20 map nodes, got ${nodes}`);
await page.click('.node.open'); await page.click('#ncGo'); await page.waitForTimeout(2400);

let moves = 0, end = 'ok';
for (let k = 0; k < 200; k++) {
  const r = await T(() => { const t = window.__deepcore.test, s = t.state(); if (s.screen !== 'game') return 'map'; if (s.busy) return 'busy'; if (s.over) return 'over';
    for (let i = 0; i < 3; i++) { const pc = s.pieces && s.pieces[i]; if (!pc) continue; const o = [];
      for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if (t.fits(pc, r, c)) o.push([r, c]);
      if (o.length) { const q = o[Math.floor(Math.random() * o.length)]; t.place(i, q[0], q[1]); return 'ok'; } }
    return 'stuck'; });
  if (r === 'busy') { await page.waitForTimeout(250); continue; }
  if (r !== 'ok') { end = r; break; }
  moves++; await page.waitForTimeout(30);
}
console.log(`board 1: ${moves} random moves, ended: ${end}`);
if (end === 'stuck') fail('a dealt set had no legal placement');

// crafting limits: one of each craftable
await T(() => { const t = window.__deepcore.test; t.start(5); t.give({ coal: 99, iron: 99, gold: 99, cinnabar: 99, copper: 99, diamond: 9, emerald: 9 }); });
await page.waitForTimeout(2400);
await page.click('#anvilBtn'); await page.waitForTimeout(150);
const names = await page.$$eval('.recipe .nm', e => e.map(x => x.textContent));
if (names.join() !== 'Blast charge,Jackhammer,Rescue Potion,Luck Tonic') fail('unexpected recipes: ' + names);
await (await page.$$('.recipe button.go'))[0].click(); await page.waitForTimeout(80);
const blastBtn = await page.$$eval('.recipe button.go', e => e[0].disabled);
if (!blastBtn) fail('blast charge should be limited to one');
await page.click('#anvilClose');

// retired ores are gone, all-clear is capped at 15% of the target, the day key is Pacific, analytics fire
const extra = await T(() => { const t = window.__deepcore.test; const m = window.__deepcore.MATS; t.start(0);
  const pac = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date());
  return { retired: ['lapis', 'quartz'].filter(k => m[k]), bonus: t.allClearBonus(), target: t.def().target, day: t.state().dayState.day, pac,
    events: [...new Set(window.DCA.buffer.map(e => e.event))] }; });
if (extra.retired.length) fail('retired blocks still present: ' + extra.retired);
if (extra.bonus > extra.target * 0.2) fail(`all-clear bonus ${extra.bonus} too large for target ${extra.target}`);
if (extra.day !== extra.pac) fail(`day key ${extra.day} is not Pacific ${extra.pac}`);
for (const e of ['session_start', 'board_start', 'piece_place']) if (!extra.events.includes(e)) fail('missing analytics event ' + e);
// the debug hooks must not exist when the same page is served from a real hostname
const b2 = await chromium.launch({ args: ['--host-resolver-rules=MAP deepcore.example 127.0.0.1'] });
const prod = await b2.newPage();
await prod.goto(`http://deepcore.example:${server.address().port}/?debug`); await prod.waitForTimeout(400);
if (await prod.evaluate(() => !!window.__deepcore)) fail('debug hooks exposed on a non-local host');
await b2.close();

console.log(errors.length ? 'page errors: ' + errors.join(' | ') : 'no page errors');
if (errors.length) process.exitCode = 1;
await browser.close(); server.close();
console.log(process.exitCode ? 'SMOKE TEST FAILED' : 'SMOKE TEST PASSED');
