// Playtest round 2: the tray after the board's last clear (a board is a fixed number of deals since v2.0.4), stars on the first board, no combo badge, wording.
import { phone, makeChecker } from './helpers.mjs';
const { check, fails } = makeChecker();
const { page, base, errors, close } = await phone();
await page.goto(base + '?debug'); await page.waitForTimeout(600);
const T = (fn, arg) => page.evaluate(fn, arg);
const tt = (f, ...a) => page.evaluate(([f, a]) => window.__deepcore.test[f](...a), [f, a]);
const one = { cells: [[0, 0]], h: 1, w: 1, mats: ['stone'], sid: 0 };

// 1. the last piece of the board must leave the tray (it used to stay drawn but could not be picked up); the board then ends
await tt('markDone', [0, 1, 2, 3]); await tt('start', 4); await page.waitForTimeout(2600);
const tg = await T(() => window.__deepcore.test.def().target);
await tt('setScore', tg);
await T((one) => { const t = window.__deepcore.test; for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) t.setCell(r, c, null); for (let c = 0; c < 6; c++) t.setCell(7, c, 'stone');
  t.setPieces([null, { cells: [[0, 0], [0, 1]], h: 1, w: 2, mats: ['stone', 'stone'], sid: 1 }, null]); t.place(1, 7, 6); }, one);
await page.waitForTimeout(2600);
await T(() => window.__deepcore.test.leave()); await page.waitForTimeout(1200);
check(await T(() => !document.getElementById('sheetScrim').hidden && /CAVE MINED/.test(document.getElementById('sheet').textContent)), 'leaving with a star ends the board with the results sheet');
check(await T(() => document.getElementById('resRetry').textContent === 'RETRY' && document.getElementById('resGo').textContent === 'CONTINUE' && !document.getElementById('kpGo') && !document.getElementById('bankBtn')), 'the results sheet offers RETRY and CONTINUE; KEEP MINING and FINISH are gone');
const tray = await T(() => [...document.querySelectorAll('.slot canvas')].map(c => !c.hidden));
check(tray[1] && !tray[0] && !tray[2], `endless boards: the placed piece's slot took the next piece (${tray})`);
const body = await T(() => document.body.innerText);
check(!/\bbank(ed)?\b/i.test(body), 'no "bank" wording on screen');
await page.tap('#resGo'); await page.waitForTimeout(2600);
check(await T(() => window.__deepcore.test.state().screen === 'map'), 'CONTINUE finishes the board and returns to the map');

// 2. the first Forest board has bones and a low 1-star line (so its first star is near certain)
await tt('start', 0); await page.waitForTimeout(2600);
const d0 = await T(() => window.__deepcore.test.def()), D1 = await T(() => window.DeepcoreData.boardParams(0, 1).starAt[0]);
check(d0.ores.includes('bone') && d0.budget.bone > 0 && d0.starAt[0] < D1, `board 1-1 has bones to mine and a lower 1-star line (${d0.starAt})`);
await tt('setScore', d0.starAt[0] + 40); await tt('bar'); await page.waitForTimeout(400);
check(await T(() => { const st = [...document.querySelectorAll('#starChip i')]; return st.length === 3 && st[0].classList.contains('lit') && !st[1].classList.contains('lit') && /^1 of 3 stars/.test(document.getElementById('starChip').getAttribute('aria-label')); }), 'with 1 star of points the meter lights the first star and fills toward the second');

// 2b. picking up a second piece while the first is still gliding back must not leave the first slot looking empty
await tt('start', 1); await page.waitForTimeout(2600);
const vis = await T(async () => { const sl = [...document.querySelectorAll('.slot')], ev = (t, el, x, y) => el.dispatchEvent(new PointerEvent(t, { bubbles: true, clientX: x, clientY: y, pointerType: 'mouse', isPrimary: true }));
  const r0 = sl[0].getBoundingClientRect(), r1 = sl[1].getBoundingClientRect();
  ev('pointerdown', sl[0], r0.left + 20, r0.top + 20); ev('pointerup', window, r0.left + 20, r0.top + 20);
  await new Promise(r => setTimeout(r, 40)); ev('pointerdown', sl[1], r1.left + 20, r1.top + 20); ev('pointerup', window, r1.left + 20, r1.top + 20);
  await new Promise(r => setTimeout(r, 600)); return sl.map(x => x.firstElementChild.style.opacity); });
check(vis.every(o => o === ''), `every tray piece stays visible after quick taps (${JSON.stringify(vis)})`);

// 3. no permanent combo badge
check(await T(() => !document.getElementById('comboMeter')), 'no combo badge on the board');
check(errors.length === 0, 'no page errors ' + errors.join(' | '));
await close();
if (fails.length) { console.log(`PLAYTEST2 TESTS FAILED (${fails.length})`); process.exit(1); } else console.log('PLAYTEST2 TESTS PASSED');
