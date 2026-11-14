// v2.8.0 release tests: the streak grace (a streak of 2+ survives one placement that clears nothing, dimmed; a second one ends it),
// the star cart (stars ride in the cart, a marker on the rails at each star line), and the calmer celebration sounds play without errors.
import { createRequire } from 'node:module';
import { phone, makeChecker } from './helpers.mjs';
const require = createRequire(import.meta.url);
const D = require('../src/data.js');
const { check, fails } = makeChecker();

// ---- the streak rule, shared by the game and the simulators ----
{ let s = { st: 0, dim: false }; const step = n => (s = D.stepStreak(s.st, s.dim, n));
  step(1); step(1); check(s.st === 2 && !s.dim, 'two clears in a row make a streak of 2');
  step(0); check(s.st === 2 && s.dim, 'one placement that clears nothing dims the streak and keeps its count');
  step(2); check(s.st === 3 && !s.dim, 'the next clear relights it and adds one');
  step(0); step(0); check(s.st === 0 && !s.dim, 'two placements in a row that clear nothing end it');
  s = { st: 1, dim: false }; step(0); check(s.st === 0, 'a single clear has no grace (a streak starts at 2)');
  check(D.placePoints(0, 1, 3, false).streak === 2 * D.SCORE.streakStep, 'the streak bonus still counts clears after the first'); }

// ---- in the game ----
const { page, base, errors, close } = await phone();
await page.goto(base + '?debug'); await page.waitForFunction(() => window.__deepcore);
const T = (f, a) => page.evaluate(([f, a]) => window.__deepcore.test[f](a), [f, a]);
await T('start', 9); await page.waitForTimeout(2600);
const one = { cells: [[0, 0]], h: 1, w: 1, mats: ['stone'], sid: 0 };
// clear row r by filling its first 7 cells and dropping a single block in the last; or drop a block where it clears nothing
const clearRow = r => page.evaluate(([r, one]) => { const t = window.__deepcore.test; for (let c = 0; c < 7; c++) t.setCell(r, c, 'stone'); t.setPieces([one, null, null]); t.place(0, r, 7); }, [r, one]);
const miss = (r, c) => page.evaluate(([r, c, one]) => { const t = window.__deepcore.test; t.setPieces([one, null, null]); t.place(0, r, c); }, [r, c, one]);
const chip = () => page.evaluate(() => { const e = document.getElementById('streakChip'); return { hidden: e.hidden, dim: e.classList.contains('dim'), text: e.textContent }; });
await page.evaluate(() => { const t = window.__deepcore.test; for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) t.setCell(r, c, null); });
await clearRow(7); await page.waitForTimeout(900); await clearRow(6); await page.waitForTimeout(900);
let st = await T('state'); check(st.combo === 2 && !st.streakDim, `two clears make a streak of 2 (${st.combo})`);
await miss(0, 0); await page.waitForTimeout(700);
st = await T('state'); let ch = await chip();
check(st.combo === 2 && st.streakDim && !ch.hidden && ch.dim, `a placement that clears nothing dims the chip and keeps the streak (${st.combo}, ${JSON.stringify(ch)})`);
await clearRow(5); await page.waitForTimeout(900);
st = await T('state'); ch = await chip();
check(st.combo === 3 && !st.streakDim && !ch.dim && /×3/.test(ch.text), `the next clear relights it at 3 (${ch.text})`);
await miss(0, 2); await page.waitForTimeout(700); await miss(0, 4); await page.waitForTimeout(900);
st = await T('state'); ch = await chip();
check(st.combo === 0 && !st.streakDim && ch.hidden, 'two misses in a row end the streak and hide the chip');

// star cart: no stars, then one, then two; the markers light as the lines are passed
const at = (await T('def')).starAt;
const cart = () => page.evaluate(() => { const b = document.getElementById('cartBar'); return { load: b.querySelector('.load').textContent, lit: [...b.querySelectorAll('.mk')].map(m => m.classList.contains('lit')) }; });
await T('setScore', at[0] - 10); await T('bar'); let c = await cart();
check(c.load === '' && c.lit.every(x => !x), 'below the first star line the cart is empty and no marker is lit');
await T('setScore', at[0] + 10); await T('bar'); c = await cart();
check(c.load === '★' && c.lit[0] && !c.lit[1], 'past the first line the cart carries a star and the first marker lights');
await T('setScore', at[1] + 10); await T('bar'); c = await cart();
check(c.load === '★★' && c.lit[1] && !c.lit[2], 'past the second line it carries two');
const mk = await page.evaluate(() => [...document.querySelectorAll('#cartBar .mk')].map(m => m.getBoundingClientRect().x));
check(mk[0] < mk[1] && mk[1] < mk[2], 'the markers stand in order along the rails');

check(errors.length === 0, `no page errors (${errors.join(' | ')})`);
await close();
if (fails.length) { console.error(`\n${fails.length} check(s) failed`); process.exit(1); }
console.log('\nall v2.8.0 checks passed');
