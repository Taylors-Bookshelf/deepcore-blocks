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
const nodes = await page.$$eval('.node', e => e.length); if (nodes !== 1) fail(`a fresh day shows only the first board, got ${nodes} nodes`);
await page.click('.node.open'); await page.waitForTimeout(2400);

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

// Craft (v2.4.0): one screen on the map; each row asks first; a full one-slot belt says so
await T(() => { const t = window.__deepcore.test; t.give({ coal: 99, iron: 99, gold: 99, ruby: 99, copper: 99, diamond: 9, emerald: 9, bone: 99 }); t.openMap(); });
await page.waitForTimeout(1200);
await page.click('#mapCraft'); await page.waitForTimeout(300);
const names = await page.$$eval('#craftBody .ci .nm', e => e.map(x => x.textContent));
if (names.slice(1).join() !== 'Star Drill,Blast Charge,Sledgehammer,Brewing table,Potion of Protection,Potion of Luck') fail('unexpected Craft rows: ' + names);
await page.click('#craftBody .ci[data-id="drill"]'); await page.waitForTimeout(150);
if (await page.textContent('#askTitle') !== 'Craft Star Drill?') fail('tapping a row should ask first');
await page.click('#askYes'); await page.waitForTimeout(200);
if ((await T(() => window.__deepcore.test.belt()))[0] !== 'drill') fail('the crafted Star Drill should be on the belt');
await page.click('#craftBody .ci[data-id="blast"]'); await page.waitForTimeout(150);
if (await page.textContent('#askTitle') !== 'Belt is full!') fail('with the one belt slot full, crafting should say the belt is full');
await page.click('#askYes'); await page.click('#craftClose');

// retired ores are gone, the All Clear bonus is SCORE.allClear, the day key is Pacific, analytics fire
const extra = await T(() => { const t = window.__deepcore.test; const m = window.__deepcore.MATS; t.start(0);
  const pac = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date());
  return { retired: ['lapis', 'quartz'].filter(k => m[k]), bonus: t.allClearBonus(), target: t.def().target, day: t.state().dayState.day, pac,
    events: [...new Set(window.DCA.buffer.map(e => e.event))] }; });
if (extra.retired.length) fail('retired blocks still present: ' + extra.retired);
if (extra.bonus !== 250) fail(`all-clear bonus ${extra.bonus} should be 250`);
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
