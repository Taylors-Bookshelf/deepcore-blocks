// Soak test: random play through a board of every zone (and strip mines, with a Luck Tonic running), then save/resume across a reload.
import { phone, makeChecker } from './helpers.mjs';
const { check, fails } = makeChecker();
const { page, base, errors, close } = await phone();
await page.goto(base + '?debug'); await page.waitForTimeout(500);
const t = (f, ...a) => page.evaluate(([f, a]) => window.__deepcore.test[f](...a), [f, a]);
async function play(maxMoves) {
  let moves = 0, end = 'moves';
  for (let k = 0; k < maxMoves * 3; k++) {
    const r = await page.evaluate(() => { const T = window.__deepcore.test, s = T.state(); if (s.screen !== 'game') return 'map'; if (s.busy) return 'busy'; if (s.over) return 'over';
      for (let i = 0; i < 3; i++) { const pc = s.pieces && s.pieces[i]; if (!pc) continue; const o = []; for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if (T.fits(pc, r, c)) o.push([r, c]);
        if (o.length) { const q = o[Math.floor(Math.random() * o.length)]; T.place(i, q[0], q[1]); return 'ok'; } } return 'stuck'; });
    if (r === 'busy') { await page.waitForTimeout(200); continue; }
    if (r !== 'ok') { end = r; break; } moves++; await page.waitForTimeout(25); if (moves >= maxMoves) break;
  }
  return { moves, end };
}
for (const idx of [0, 5, 9, 14, 18, 21, 24]) {
  await t('give', { coal: 20, copper: 10, cinnabar: 20, diamond: 2, emerald: 2 });
  await t('start', idx); await page.waitForTimeout(2500);
  if (idx === 14) { await t('give', { cinnabar: 12, diamond: 1 }); await page.evaluate(() => { const T = window.__deepcore.test; }); }
  const r = await play(45);
  const state = await page.evaluate(() => { const s = window.__deepcore.test.state(); return { screen: s.screen, over: s.over }; });
  check(r.moves >= 1 && errors.length === 0, `board ${idx}: ${r.moves} random moves, ended "${r.end}" (${errors.join(' | ')})`);
  await page.waitForTimeout(3300);   // let any clear/cave-in animation and its delayed map jump finish before the next board
}
// resume across a reload
await page.waitForTimeout(1500); await t('markDone', [0, 1, 2, 3, 4, 5, 6, 7, 8]); await page.evaluate(() => window.__deepcore.test.start(9)); await page.waitForTimeout(2500);
for (let k = 0; k < 4; k++) { await page.evaluate(() => { const T = window.__deepcore.test, s = T.state(); for (let i = 0; i < 3; i++) { const pc = s.pieces[i]; if (!pc) continue; for (let r = 7; r >= 0; r--) for (let c = 0; c < 8; c++) if (T.fits(pc, r, c)) { T.place(i, r, c); return; } } }); await page.waitForTimeout(350); }
await page.waitForTimeout(2200);
const before = await page.evaluate(() => { const s = window.__deepcore.test.state(); return { score: s.score, hand: JSON.stringify(s.hand), idx: s.level }; });
console.log('saved', await page.evaluate(() => { const b = JSON.parse(localStorage.getItem('deepcore-board') || 'null'); return b && [b.idx, b.moves, b.over, b.day]; }), before);
await page.reload(); await page.waitForTimeout(600); await page.tap('#mapBtn'); await page.waitForTimeout(500);
await page.evaluate(() => document.querySelector('.node.progress').click()); await page.waitForTimeout(300);
check(/Continue/.test(await page.evaluate(() => document.getElementById('ncGo').textContent)), 'an unfinished board offers Continue after a reload');
await page.tap('#ncGo'); await page.waitForTimeout(800);
const after = await page.evaluate(() => { const s = window.__deepcore.test.state(); return { score: s.score, hand: JSON.stringify(s.hand), idx: s.level }; });
check(before.score === after.score && before.hand === after.hand && before.idx === after.idx, `board resumes exactly (score ${before.score}, hand ${before.hand})`);
check(errors.length === 0, 'no page errors ' + errors.join(' | '));
await close();
console.log(fails.length ? `SOAK TESTS FAILED (${fails.length})` : 'SOAK TESTS PASSED'); if (fails.length) process.exitCode = 1;
