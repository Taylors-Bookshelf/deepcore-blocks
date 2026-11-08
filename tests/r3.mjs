// Release 3: pick-up and return animations, tap to skip.
import { phone, touchDrag, makeChecker } from './helpers.mjs';
const { check, fails } = makeChecker();
const { page, cdp, base, errors, close } = await phone();
await page.goto(base + '?debug'); await page.waitForTimeout(500);
const T = (fn, arg) => page.evaluate(fn, arg);
const tt = (f, ...a) => page.evaluate(([f, a]) => window.__deepcore.test[f](...a), [f, a]);
const st = () => T(() => { const s = window.__deepcore.test.state(); return { specials: s.specials, bank: s.bank, busy: s.busy }; });
// (the make-room sheet and its destroy animation were removed in v2.4.0: a full belt now just says so in Craft, see dock.mjs)

// ---- pick-up and return animations ----
await tt('start', 4); await page.waitForTimeout(2600);
const geo = () => T(() => { const b = document.getElementById('board').getBoundingClientRect(); const s = [...document.querySelectorAll('.slot')].map(e => { const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }); return { cell: (b.width + 2) / 8, slots: s, b: [b.left, b.top, b.width] }; });
const scaleOf = () => T(() => { const m = /scale\(([\d.]+)\)/.exec(document.getElementById('ghost').style.transform); return m ? +m[1] : null; });
const g = await geo();
await T(() => { window.__scales = []; new MutationObserver(() => { const m = /scale\(([\d.]+)\)/.exec(document.getElementById('ghost').style.transform); if (m) window.__scales.push(+m[1]); }).observe(document.getElementById('ghost'), { attributes: true }); });
await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: g.slots[0][0], y: g.slots[0][1], id: 1 }] });
await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: g.slots[0][0], y: g.slots[0][1] - 10, id: 1 }] });
await page.waitForTimeout(400); const sc = await T(() => window.__scales);
check(sc.length > 2 && Math.min(...sc) < 0.9 && sc[sc.length - 1] > 0.99, `picked-up piece grows from tray size to board size (scale ${sc.length && Math.min(...sc).toFixed(2)} up to ${sc[sc.length - 1]})`);
// drop on an occupied spot -> flies back
await T(() => { const t = window.__deepcore.test; for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) t.setCell(r, c, 'stone'); });
await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: g.b[0] + g.cell * 3, y: g.b[1] + g.cell * 5, id: 1 }] });
await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.waitForTimeout(60);
check(await T(() => !document.getElementById('ghost').hidden), 'an invalid drop keeps the piece visible while it flies back');
await page.waitForTimeout(400);
check(await T(() => document.getElementById('ghost').hidden && document.querySelector('.slot canvas').style.opacity === '' && !!window.__deepcore.test.state().pieces[0]), 'then it is back in its slot, restored, and still unplaced');

// ---- tap to skip ----
await tt('start', 4); await page.waitForTimeout(2600);
const setup = () => T(() => { const t = window.__deepcore.test; for (let c = 0; c < 8; c++) t.setCell(7, c, null); for (let c = 0; c < 7; c++) t.setCell(7, c, c === 3 ? 'fossil' : 'stone');
  t.setPieces([{ cells: [[0, 0]], h: 1, w: 1, mats: ['stone'], sid: 0 }, null, null]); window.__deepcore.test.place(0, 7, 7); });
const timeBusy = async (skipAt) => { const t0 = Date.now(); await setup(); if (skipAt) { await page.waitForTimeout(skipAt); await page.mouse.click(190, 400); }
  while ((await st()).busy && Date.now() - t0 < 8000) await page.waitForTimeout(40); return Date.now() - t0; };
const slow = await timeBusy(0); await page.waitForTimeout(600); await tt('start', 4); await page.waitForTimeout(2600);
const fast = await timeBusy(500);
check(slow > 1800, `a special celebration normally takes about ${slow}ms`);
check(fast < slow - 800, `tapping during it skips ahead (${fast}ms instead of ${slow}ms)`);
check(await T(() => document.getElementById('skipHint').hidden), 'the "Tap to skip" hint disappears');
check(errors.filter(e => !/404/.test(e)).length === 0, 'no page errors ' + errors.join(' | '));
await close();
console.log(fails.length ? `R3 TESTS FAILED (${fails.length})` : 'R3 TESTS PASSED'); if (fails.length) process.exitCode = 1;
