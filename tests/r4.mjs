// Release 4, updated for v2.0.4: a board is a fixed number of deals, stars from its points (0 to 3), RETRY / CONTINUE; combo meter, near-miss cave-in screen, hint, daily modifiers.
import { createRequire } from 'node:module';
import { phone, makeChecker } from './helpers.mjs';
const require = createRequire(import.meta.url);
const D = require('../src/data.js'), C = require('../src/core.js');
const { check, fails } = makeChecker();

// ---- data: scoring, stars, ore budget, modifiers ----
{ const at = [1000, 1500, 2000]; check(D.starsFromScore(0, at) === 0 && D.starsFromScore(999, at) === 0 && D.starsFromScore(1000, at) === 1 && D.starsFromScore(1500, at) === 2 && D.starsFromScore(2000, at) === 3, 'stars run from 0 to 3 on the board\'s points'); }
{ const P = (c, n, st, ac) => D.placePoints(c, n, st, ac);
  check(P(4, 0, 0, false).total === 40 && P(5, 1, 1, false).total === 150, 'a placement scores 10 a block, a line 100');
  check(P(0, 2, 1, false).combo === 250 && P(0, 3, 1, false).combo === 600 && P(0, 4, 1, false).combo === 1200 && P(0, 5, 1, false).combo === 1200, 'Double +250, Triple +600, Quad (and more) +1200');
  check(P(0, 1, 2, false).streak === 50 && P(0, 1, 5, false).streak === 200 && P(0, 1, 20, false).streak === 500 && P(0, 0, 3, false).streak === 0, 'a streak adds +50 per clear in a row after the first, up to +500, and only on a clear');
  check(P(0, 1, 1, true).allClear === 250 && P(0, 0, 0, true).allClear === 0, 'an All Clear adds +250 on top of its clear');
  check(D.SCORE.special.blast === 200 && D.SCORE.special.sledgehammer === 350 && D.SCORE.special.luck === -150 && D.SCORE.special.rescue === -250, 'crafted specials: Blast +200, Sledgehammer +350, Luck Potion -150, Rescue Potion -250'); }
check(D.ZONES.every((z, zi) => z.core || Array.from({ length: z.boards }, (_, j) => D.boardParams(zi, j)).every(p => p.starAt.length === 3 && p.starAt[0] < p.starAt[1] && p.starAt[1] < p.starAt[2] && p.target === p.starAt[0] && p.deals >= 4)), 'every board has three rising star lines, a 1-star pass mark and at least 4 deals');
check(D.boardParams(D.ZONES.length - 1, 0).starAt.length === 0, 'the Ancient Core has no stars');
check(D.boardParams(0, 0).starAt[0] < D.boardParams(0, 1).starAt[0], 'board 1-1 (the tutorial) has a lower 1-star line');
{ const sp = i => D.boardParams(i, 1).starAt[2] - D.boardParams(i, 1).starAt[0]; check(sp(D.MAGMA_Z) >= 2 * sp(3) * .9 && sp(D.CRUST_Z) > sp(3) && sp(3) > sp(0), `the star lines spread further apart the deeper you go (${[0, 3, D.MAGMA_Z, D.CRUST_Z].map(sp)})`); }
check(D.DEALS.slice(0, D.CRUST_Z + 1).every((n, i) => i === 0 || n >= D.DEALS[i - 1]), 'boards get more deals layer by layer');
{ const r = D.rng(3), b = D.boardParams(2, 3).budget, runs = Array.from({ length: 400 }, () => C.rollBudget(b, r));
  check(runs.every(x => x.coal === Math.floor(b.coal)) && Math.abs(runs.reduce((a, x) => a + (x.iron || 0), 0) / 400 - b.iron) < .1, 'the ore budget is exact for whole numbers and a chance for the fraction');
  const def = D.boardParams(2, 3), left = C.rollBudget(def.budget, r), want = Object.values(left).reduce((a, x) => a + x, 0); let lo = 0, hi = 0, got = 0;
  for (let d = def.deals; d >= 1; d--) { const set = C.chooseSet(lo, hi, def.d, { rnd: r }).map(sh => C.dressPiece(sh, def, { rnd: r, budgeted: true })); C.spreadOre(set, left, Math.max(1, d - 1), r); set.forEach(p => p.mats.forEach(m => { if (D.STAR_ORES.includes(m)) got++; })); }
  check(got === want, `a board deals exactly its ore budget over its deals (${got} of ${want})`); }
check(D.starBonus(1, 2400) === 0 && D.starBonus(2, 2400) === 240 && D.starBonus(3, 2400) === 480, 'each extra star is worth 10% of the 1-star line');
const days = Array.from({ length: 90 }, (_, i) => `2026-${String(1 + Math.floor(i / 28)).padStart(2, '0')}-${String(1 + i % 28).padStart(2, '0')}`);
const mods = days.map(d => D.modifierFor(d).id);
check(new Set(mods).size === D.MODIFIERS.length, `every one of the ${D.MODIFIERS.length} daily twists comes up within 90 days`);
check(D.modifierFor(days[3]).id === D.modifierFor(days[3]).id, 'a day always has the same twist');
const byId = Object.fromEntries(D.MODIFIERS.map(m => [m.id, m]));
const base = D.boardParams(3, 1), gold = D.boardParams(3, 1, byId.gold_rush), gem = D.boardParams(4, 1, byId.gem_fever), tre = D.boardParams(3, 1, byId.treasure_day);
check(gold.budget.gold === 3 * base.budget.gold, 'Gold Rush triples the gold budget');
check(gem.budget.emerald > D.boardParams(4, 1).budget.emerald && gem.budget.diamond > D.boardParams(4, 1).budget.diamond, 'Gem Fever raises the board\'s gem budget');
check(tre.specialMul === 3 && base.specialMul === 1, 'Treasure Day triples special blocks');
check(D.ZONES.every((z, i) => i === 0 || i >= D.TOOLS.length || Object.entries(D.toolCost(i)).every(([k, v]) => D.toolCost(i, byId.forge_day)[k] === Math.ceil(v * .75))), 'Forge Day makes tools 25% cheaper (rounded up)');
// the hint engine returns legal, ranked moves
{ const S = C.SHAPES, lo = 0, hi = 0; const r = C.rankMoves(lo, hi, [S[3], S[4], null]); check(r.length > 0 && r[0].v >= r[r.length - 1].v, 'rankMoves lists legal moves best first'); }

// ---- the game ----
const { page, base: url, errors, close } = await phone();
await page.goto(url + '?debug'); await page.waitForTimeout(500);
const T = (fn, arg) => page.evaluate(fn, arg);
const tt = (f, ...a) => page.evaluate(([f, a]) => window.__deepcore.test[f](...a), [f, a]);
const st = () => T(() => { const s = window.__deepcore.test.state(); return { reached: s.reached, score: s.score, hand: s.hand, bank: s.bank, day: s.dayState, over: s.over, screen: s.screen, hintInfo: s.hintInfo, combo: s.combo, level: s.level, busy: s.busy }; });
const target = () => T(() => window.__deepcore.test.def().target);
const clearRow = () => T(() => { const t = window.__deepcore.test; for (let c = 0; c < 8; c++) t.setCell(7, c, null); for (let c = 0; c < 6; c++) t.setCell(7, c, 'stone');
  t.setPieces([{ cells: [[0, 0], [0, 1]], h: 1, w: 2, mats: ['stone', 'stone'], sid: 1 }, null, null]); window.__deepcore.test.place(0, 7, 6); });
const board = async (i) => { await tt('start', i); await page.waitForTimeout(2600); };
// end the board: the last deal, with the score set so the final clear (2 blocks + 1 line = 120 points) lands where we want
const finish = async (pts) => { await tt('setScore', pts); await tt('lastDeal'); await clearRow(); await page.waitForTimeout(2600); };

// 1. every deal placed but too few points for a star: the board is not cleared, the haul is not banked, RETRY or MAP
await board(9); const tg = await target(), sa = await T(() => window.__deepcore.test.def().starAt);
await tt('give', { coal: 10 }); await tt('giveHand', { coal: 4, wood: 2 }); await finish(0);
let s = await st();
check(s.reached && s.busy && s.bank.coal === 10 && !s.day.done.includes(9), `placing every deal with too few points ends the board without clearing it or banking (bank coal ${s.bank.coal})`);
check(await T(() => /NOT ENOUGH POINTS/.test(document.getElementById('sheet').textContent) && !!document.getElementById('resRetry') && !!document.getElementById('resMap') && !document.getElementById('resGo')), 'a 0-star result offers RETRY or MAP, never CONTINUE');
await page.tap('#resMap'); await page.waitForTimeout(800); s = await st();
check(s.screen === 'map' && s.bank.coal === 10 && !s.day.done.includes(9) && !(s.day.stars || {})[9] && !Object.keys(s.hand).length, 'leaving a 0-star board drops the haul and leaves it uncleared');
// 2. RETRY is a clean restart: nothing from the run is kept
await board(9); await tt('giveHand', { coal: 4 }); await finish(sa[1]);
check(await T(() => /BOARD CLEARED/.test(document.getElementById('sheet').textContent) && document.querySelectorAll('.shStar.got').length === 2 && !!document.getElementById('resRetry') && !!document.getElementById('resGo')), 'with 2 stars of points the results sheet shows them and offers RETRY or CONTINUE');
await page.tap('#resRetry'); await page.waitForTimeout(2600); s = await st();
check(s.screen === 'game' && !s.reached && s.score < 50 && !Object.keys(s.hand).length && s.bank.coal === 10 && !s.day.done.includes(9) && !(s.day.stars || {})[9], 'RETRY restarts the board and discards that run (ore, points, stars)');
// 3. CONTINUE banks the haul and records the stars and the star bonus
await tt('giveHand', { coal: 4 }); await finish(sa[1]);
await page.tap('#resGo'); await page.waitForTimeout(3200); s = await st();
check(s.screen === 'map' && s.day.done.includes(9) && s.day.stars[9] === 2 && s.bank.coal === 14, `CONTINUE clears the board with 2 stars and banks the haul (bank coal ${s.bank.coal})`);
check(s.day.scores[9] >= tg + D.starBonus(2, tg), 'the star bonus is part of the board score');
// 4. three stars: still the same choice, and the bonus is paid
await board(10); await page.tap('#pauseBtn'); await page.waitForTimeout(300);
check(await T(() => /Stars in Limestone Caves: 2 of 24/.test(document.getElementById('sheet').textContent) && !!document.getElementById('pauseResume') && !!document.getElementById('pauseQuit')), 'the pause sheet shows the stars earned in the layer (2 of 24 in the Limestone Caves)');
await page.tap('#pauseResume'); await page.waitForTimeout(200);
const tg5 = await target(), sa5 = await T(() => window.__deepcore.test.def().starAt);
await finish(sa5[2]);
check(await T(() => document.querySelectorAll('.shStar.got').length === 3 && !!document.getElementById('resGo')), 'three stars show on the results sheet');
await page.tap('#resGo'); await page.waitForTimeout(3200); s = await st();
check(s.day.stars[10] === 3 && s.day.scores[10] > tg5 + D.starBonus(3, tg5) - 1, `the board is banked with 3 stars (bonus ${D.starBonus(3, tg5)})`);
// 5. a worse replay never lowers the stars you already have
await board(10); check(!(await tt('practice')), 'a replay is an ordinary board (it gives ore)'); await finish(sa5[0]); await page.tap('#resGo'); await page.waitForTimeout(3200);
check((await st()).day.stars[10] === 3, 'a 1-star replay keeps the 3 stars');
// 6. the board ends after its last deal: a cave-in after it is impossible, and the results sheet comes back after a reload
await board(11); await finish((await T(() => window.__deepcore.test.def().starAt))[0]);
await tt('gameOver'); await page.waitForTimeout(800); s = await st();
check(!s.over && s.reached, 'after the last deal the board cannot cave in');
await page.reload(); await page.waitForTimeout(900); await page.tap('#mapBtn'); await page.waitForTimeout(500);
await T(() => document.querySelector('.node.progress').click()); await page.waitForTimeout(1200);
check(await T(() => !document.getElementById('sheetScrim').hidden && !!document.getElementById('resGo')), 'a board left on its results sheet reopens on it');
await page.tap('#resGo'); await page.waitForTimeout(3200);

// 5b. a two-line clear pays its lines and the Double, and mines exactly the ore in its lines (no bonus ore since v2.0.4)
{ const sq = C.SHAPES.findIndex(sh => sh.w === 2 && sh.h === 2 && sh.cells.length === 4);
  await board(9); await tt('setCollected', {}); await tt('setScore', 0);
  await T((sq) => { const t = window.__deepcore.test; for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) t.setCell(r, c, null); t.setCell(0, 0, 'stone'); for (const r of [6, 7]) for (let c = 0; c < 8; c++) t.setCell(r, c, c < 6 ? 'coal' : null);
    t.setPieces([{ cells: [[0, 0], [0, 1], [1, 0], [1, 1]], h: 2, w: 2, mats: ['stone', 'stone', 'stone', 'stone'], sid: sq }, null, null]); t.place(0, 6, 6); }, sq);
  await page.waitForTimeout(2500); const col = await T(() => window.__deepcore.test.collected()), sc = (await st()).score;
  check(col.coal === 12 && sc === 40 + 200 + 250, `a double clear that mined 12 coal gives 12 coal and 40 + 200 + 250 points (coal ${col.coal}, score ${sc})`); }
// 6. combos
await board(9);
for (let k = 0; k < 2; k++) { await clearRow(); await page.waitForTimeout(2300); }
s = await st(); check(s.combo >= 2, `two clears in a row make a streak (${s.combo})`);
check(await T(() => !document.getElementById('comboMeter')), 'there is no permanent combo badge on the board');
// 7. near-miss cave-in screen
await board(10); await tt('gameOver'); await page.waitForTimeout(1500);
const over = await T(() => [document.getElementById('overWhy').textContent, document.getElementById('overTip').textContent, document.getElementById('overBar').firstElementChild.style.width]);
check(/1[2-5] of 15 placements left/.test(over[0]) && over[1].length > 20 && over[2] === '0%', `the cave-in screen says how many placements were left and gives a tip (${over[0]})`);
check(!/easier/.test(over[1]), 'no mercy note after the first cave-in');
for (let k = 0; k < 2; k++) { await page.tap('#retry'); await page.waitForTimeout(2600); await tt('gameOver'); await page.waitForTimeout(1500); }
check(await T(() => /go easier/.test(document.getElementById('overTip').textContent)), 'after repeated cave-ins the screen tells you the dealer will ease up');

// 8. hint
await page.tap('#retry'); await page.waitForTimeout(2600); await tt('give', { coal: 5 });
check(await T(() => !document.getElementById('hintBtn').disabled), 'hint is available when you hold coal');
const coal0 = (await st()).bank.coal; await page.tap('#hintBtn'); await page.waitForTimeout(250); await page.tap('#askYes'); await page.waitForTimeout(1300); s = await st();
check(s.bank.coal === coal0 - 5 && s.hintInfo && await T(() => !!document.querySelector('.slot.hint')), 'a hint costs 5 coal and marks a piece and a spot');
check(await T(() => { const t = window.__deepcore.test, s2 = t.state(); const p = s2.pieces[s2.hintInfo.i]; return t.fits(p, s2.hintInfo.r0, s2.hintInfo.c0); }), 'the hinted spot is a legal placement');
await tt('setBank', { coal: 4 }); await page.waitForTimeout(100);
check(await T(() => document.getElementById('hintBtn').disabled), 'hint is disabled without enough coal');
check(await T(() => window.DCA.buffer.some(e => e.event === 'hint_used')), 'analytics recorded the hint');

// 9. daily twist shown, and Forge Day makes tools cheaper
await T(() => window.__deepcore.test.openMap());
const modName = await T(() => window.__deepcore.test.mod().name);
check(await T((n) => document.getElementById('mapDate').textContent.includes(n), modName), `the map shows today's twist (${modName})`);
const forgeDay = days.find(d => D.modifierFor(d).id === 'forge_day'); await tt('previewDay', forgeDay);
const lc = await tt('tcost', 1); check(lc.bone === Math.ceil(D.TOOLS[1].cost.bone * .75) && lc.wood === Math.ceil(D.TOOLS[1].cost.wood * .75), `on a Forge Day bone tools cost a quarter less (${JSON.stringify(lc)})`);
check(errors.filter(e => !/404/.test(e)).length === 0, 'no page errors ' + errors.join(' | '));
await close();
console.log(fails.length ? `R4 TESTS FAILED (${fails.length})` : 'R4 TESTS PASSED'); if (fails.length) process.exitCode = 1;
