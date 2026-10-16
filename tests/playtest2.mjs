// Playtest round 2: the tray after a clear that reaches the target, wood stars on the ore-free first board, no combo badge, wording.
import { phone, makeChecker } from './helpers.mjs';
const { check, fails } = makeChecker();
const { page, base, errors, close } = await phone();
await page.goto(base + '?debug'); await page.waitForTimeout(600);
const T = (fn, arg) => page.evaluate(fn, arg);
const tt = (f, ...a) => page.evaluate(([f, a]) => window.__deepcore.test[f](...a), [f, a]);
const one = { cells: [[0, 0]], h: 1, w: 1, mats: ['stone'], sid: 0 };

// 1. the piece that reaches the target must leave the tray (it used to stay drawn but could not be picked up)
await tt('markDone', [0, 1, 2, 3]); await tt('start', 4); await page.waitForTimeout(2600);
const tg = await T(() => window.__deepcore.test.def().target);
await tt('setScore', tg - 5);
await T((one) => { const t = window.__deepcore.test; for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) t.setCell(r, c, null); for (let c = 0; c < 6; c++) t.setCell(7, c, 'stone');
  t.setPieces([one, { cells: [[0, 0], [0, 1]], h: 1, w: 2, mats: ['stone', 'stone'], sid: 1 }, one]); t.place(1, 7, 6); }, one);
await page.waitForTimeout(2600);
check(await T(() => !document.getElementById('sheetScrim').hidden), 'reaching the target asks FINISH or KEEP MINING');
check(await T(() => document.getElementById('kpGo').textContent === 'KEEP MINING' && document.getElementById('kpBank').textContent === 'FINISH'), 'the buttons say KEEP MINING and FINISH (no "bank")');
await page.tap('#kpGo'); await page.waitForTimeout(400);
const tray = await T(() => [...document.querySelectorAll('.slot canvas')].map(c => !c.hidden));
check(tray[0] && !tray[1] && tray[2], `the placed middle piece is gone from the tray (${tray})`);
check(await T(() => document.getElementById('bankBtn').textContent === 'FINISH'), 'the bar button says FINISH');
// the remaining two pieces can still be picked up and placed
await T(() => { window.__deepcore.test.place(0, 0, 0); }); await page.waitForTimeout(300);
await T(() => { window.__deepcore.test.place(2, 0, 2); }); await page.waitForTimeout(600);
const after = await T(() => window.__deepcore.test.state().pieces.filter(Boolean).length);
check(after === 3, `placing the other two deals a fresh set (${after} pieces)`);
const body = await T(() => document.body.innerText);
check(!/\bbank(ed)?\b/i.test(body), 'no "bank" wording on screen');

// 2. the first Forest board now has bones, so its stars count ore value like every other board
await tt('start', 0); await page.waitForTimeout(2600);
const d0 = await T(() => window.__deepcore.test.def());
check(!d0.starWood && d0.ores.includes('bone') && d0.starAt[0] < d0.starAt[1], `board 1-1 has bones to mine for stars (${d0.starAt})`);
await tt('setCollected', { bone: d0.starAt[0] }); await page.waitForTimeout(400);
check(await T(() => document.getElementById('scStars').textContent === '★★★' && /\//.test(document.getElementById('scTxt').textContent)), 'with 2-star ore value the chip points at the third star');

// 3. no permanent combo badge
check(await T(() => !document.getElementById('comboMeter')), 'no combo badge on the board');
check(errors.length === 0, 'no page errors ' + errors.join(' | '));
await close();
if (fails.length) { console.log(`PLAYTEST2 TESTS FAILED (${fails.length})`); process.exit(1); } else console.log('PLAYTEST2 TESTS PASSED');
