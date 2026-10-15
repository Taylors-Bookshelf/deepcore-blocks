import { phone } from './helpers.mjs';
const { page, base, errors, close } = await phone({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
const shot = (n) => page.screenshot({ path: `/tmp/pt/${n}.png` });
await page.goto(base + '?debug'); await page.waitForTimeout(1200); await shot('01-home');
await page.tap('#mapBtn'); await page.waitForTimeout(1500); await shot('02-map');
const T = (fn, arg) => page.evaluate(fn, arg);
// greedy bot: most lines cleared, then lowest placement
const bot = () => T(() => { const t = window.__deepcore.test, s = t.state(); if (s.busy || s.over || !s.pieces) return 'wait';
  let best = null; s.pieces.forEach((p, i) => { if (!p) return; for (let r = 0; r <= 8 - p.h; r++) for (let c = 0; c <= 8 - p.w; c++) if (t.fits(p, r, c)) {
    const g = s.grid.map(row => row.map(Boolean)); p.cells.forEach(([a, b]) => g[r + a][c + b] = true); let n = 0; for (let k = 0; k < 8; k++) { if (g[k].every(Boolean)) n++; if (g.every(row => row[k])) n++; }
    const v = n * 100 + r * 2 + p.cells.length; if (!best || v > best.v) best = { i, r, c, v }; } });
  if (!best) return 'stuck'; t.place(best.i, best.r, best.c); return 'ok'; });
async function play(tag, maxMoves = 200) {
  for (let m = 0; m < maxMoves; m++) {
    if (await T(() => !document.getElementById('sheetScrim').hidden)) { await shot(tag + '-prompt'); return 'prompt'; }
    if (await T(() => !document.getElementById('over').hidden)) { await shot(tag + '-over'); return 'over'; }
    if (await T(() => window.__deepcore.test.state().screen !== 'game')) return 'left';
    const r = await bot(); if (m === 6) await shot(tag + '-mid');
    await page.waitForTimeout(r === 'ok' ? 450 : 600);
  }
  return 'max';
}
await T(() => window.__deepcore.test.start(0)); await page.waitForTimeout(2600); await shot('03-board1');
await T(() => { const b = [...document.querySelectorAll('button')].find(b => /skip/i.test(b.textContent)); if (b) b.click(); }); await page.waitForTimeout(500);
console.log('board1', await play('04-b1'));
await page.waitForTimeout(500);
await T(() => { window.__deepcore.test.markDone([0,1,2,3,4,5,6,7,8,9,10,11,12]); window.__deepcore.test.give({ coal: 40, copper: 30, iron: 20, ruby: 30, gold: 10, emerald: 3, diamond: 2 }); window.__deepcore.test.start(13); });
await page.waitForTimeout(2600); await shot('05-deep');
console.log('board 4-2', await play('06-d'));
await page.waitForTimeout(800);
await T(() => { window.__deepcore.test.start(21); }); await page.waitForTimeout(2600);
console.log('board 6-2', await play('07-u'));
await page.waitForTimeout(800);
await T(() => { document.getElementById('over').hidden = true; document.getElementById('sheetScrim').hidden = true; window.__deepcore.test.start(13); }); await page.waitForTimeout(2600);
await page.tap('#anvilBtn'); await page.waitForTimeout(700); await shot('08-anvil');
await T(() => { document.getElementById('anvil').hidden = true; }); await page.tap('#infoBtn'); await page.waitForTimeout(700); await shot('09-guide');
console.log('errors', errors);
await close();
