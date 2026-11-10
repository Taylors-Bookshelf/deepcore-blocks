// Release 4, updated for v2.4.0: endless boards (leave through the cart bar once you have a star, the third star ends the board), stars from
// points (0 to 3), RETRY / CONTINUE; combo meter, the cave-in screen, hint, daily modifiers.
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
{ const at = i => D.boardParams(i, 1).starAt; check([1, 2, 3, 4, 5, 6].every(i => at(i)[0] >= at(0)[0]) && D.STAR_LINES.slice(0, 7).every(l => l[2] - l[0] >= 1000), `every layer's 1-star line is above the Forest's, and three stars sit well above one (v2.5.0)`); }
check(D.DEALS.slice(0, D.CRUST_Z + 1).every((n, i) => i === 0 || n >= D.DEALS[i - 1]), 'the dealer\'s grace (the old board length) grows layer by layer');
{ const r = D.rng(3), def = D.boardParams(2, 3), N = 4000; let iron = 0, gems = 0;
  // v2.4.0: no fixed budget; each piece carries ore at the layer's rate (D.ORE_RATE x the old budget over the old board length)
  for (let n = 0; n < N; n++) { const p = C.orePiece(C.dressPiece(C.SHAPES[20], def, { rnd: r, budgeted: true }), def, {}, r); p.mats.forEach(m => { if (m === 'iron') iron++; }); }
  const want = def.orePer.iron * N; check(Math.abs(iron - want) / want < .12, `each piece carries ore at its layer's rate (${iron} iron in ${N} pieces, expected about ${Math.round(want)})`);
  const g = D.boardParams(4, 3), dealt = {}; for (let n = 0; n < 3000; n++) { const p = C.orePiece(C.dressPiece(C.SHAPES[20], g, { rnd: r, budgeted: true }), g, dealt, r); p.mats.forEach(m => { if (m === 'diamond') gems++; }); }
  check(gems <= g.oreCap.diamond, `gems are capped per board (${gems} diamonds, cap ${g.oreCap.diamond})`); }
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
// end the board: set the score so one clear (2 blocks + 1 line = 120 points) lands where we want, then leave through the cart bar
const finish = async (pts, leave = true) => { await tt('setScore', pts - 120); await clearRow(); await page.waitForTimeout(2600); if (leave) { await tt('cart'); await page.waitForTimeout(150); if (!(await T(() => document.getElementById('askScrim').hidden))) await page.click('#askYes'); await page.waitForTimeout(1100); } };

// 1. without a star the cart bar is grey and does nothing: there is no way to end a board with 0 stars except a cave-in
await board(9); const tg = await target(), sa = await T(() => window.__deepcore.test.def().starAt);
await tt('give', { coal: 10 }); await tt('giveHand', { coal: 4, wood: 2 }); await finish(sa[0] - 200);
let s = await st();
check(!s.reached && !s.over && await T(() => document.getElementById('cartBar').classList.contains('off') && document.getElementById('askScrim').hidden), 'below the first star the cart bar is grey and tapping it does nothing');
// 2. one star lights the cart bar; it asks "Done here?"; the results sheet offers RETRY or CONTINUE; RETRY is a clean restart
await tt('setScore', sa[1] - 120); await clearRow(); await page.waitForTimeout(2600);
check(await T(() => document.getElementById('cartBar').classList.contains('on')), 'with a star the cart bar lights up');
await tt('cart'); await page.waitForTimeout(150);
check(await T(() => document.getElementById('askTitle').textContent === 'Done here?'), 'tapping it asks "Done here?"');
await page.click('#askNo'); await page.waitForTimeout(200); s = await st(); check(!s.reached && s.screen === 'game', 'No keeps you mining');
await tt('cart'); await page.waitForTimeout(150); await page.click('#askYes'); await page.waitForTimeout(1100);
check(await T(() => /BOARD CLEARED/.test(document.getElementById('sheet').textContent) && document.querySelectorAll('.shStar.got').length === 2 && !!document.getElementById('resRetry') && !!document.getElementById('resGo')), 'Yes ends the board: the results sheet shows 2 stars and offers RETRY or CONTINUE');
await page.tap('#resRetry'); await page.waitForTimeout(2600); s = await st();
check(s.screen === 'game' && !s.reached && s.score < 50 && !Object.keys(s.hand).length && s.bank.coal === 10 && !s.day.done.includes(9) && !(s.day.stars || {})[9], 'RETRY restarts the board and discards that run (ore, points, stars)');
// 3. CONTINUE banks the haul and records the stars and the star bonus
await tt('giveHand', { coal: 4 }); await finish(sa[1]);
await page.tap('#resGo'); await page.waitForTimeout(3200); s = await st();
check(s.screen === 'map' && s.day.done.includes(9) && s.day.stars[9] === 2 && s.bank.coal === 14, `CONTINUE clears the board with 2 stars and banks the haul (bank coal ${s.bank.coal})`);
check(s.day.scores[9] >= tg + D.starBonus(2, tg), 'the star bonus is part of the board score');
// 4. the third star ends the board on its own
await board(10); await page.tap('#pauseBtn'); await page.waitForTimeout(300);
check(await T(() => /Stars in Limestone Caves: 2 of 24/.test(document.getElementById('sheet').textContent) && /Placements on this board: 0/.test(document.getElementById('sheet').textContent) && !!document.getElementById('pauseResume') && !!document.getElementById('pauseQuit')), 'the pause card shows the placements on this board and the stars in the layer (2 of 24 in the Limestone Caves)');
check(await T(() => [...document.querySelectorAll('.pauseBtns button')].map(b => b.id).join() === 'pauseQuit,pauseRestart,pauseResume'), 'pause buttons run Map, Restart, Resume from left to right');
await page.tap('#pauseResume'); await page.waitForTimeout(200);
const tg5 = await target(), sa5 = await T(() => window.__deepcore.test.def().starAt);
await finish(sa5[2], false);
check(await T(() => document.querySelectorAll('.shStar.got').length === 3 && !!document.getElementById('resGo')), 'reaching the third star ends the board and shows the results');
await page.tap('#resGo'); await page.waitForTimeout(3200); s = await st();
check(s.day.stars[10] === 3 && s.day.scores[10] > tg5 + D.starBonus(3, tg5) - 1, `the board is banked with 3 stars (bonus ${D.starBonus(3, tg5)})`);
// 5. a worse replay never lowers the stars you already have
await board(10); check(!(await tt('practice')), 'a replay is an ordinary board (it gives ore)'); await finish(sa5[0]); await page.tap('#resGo'); await page.waitForTimeout(3200);
check((await st()).day.stars[10] === 3, 'a 1-star replay keeps the 3 stars');
// 6. once the board has ended it cannot cave in, and the results sheet comes back after a reload
await board(11); await finish((await T(() => window.__deepcore.test.def().starAt))[0]);
await tt('gameOver'); await page.waitForTimeout(800); s = await st();
check(!s.over && s.reached, 'after leaving, the board cannot cave in');
await page.reload(); await page.waitForTimeout(900); await page.tap('#mapBtn'); await page.waitForTimeout(500);
await T(() => document.querySelector('.node.progress').click()); await page.waitForTimeout(1200);
check(await T(() => !document.getElementById('sheetScrim').hidden && !!document.getElementById('resGo')), 'a board left on its results sheet reopens on it');
await page.tap('#resGo'); await page.waitForTimeout(3200);
// 6b. a cave-in is a failure even after a star (v2.5.0): no stars, no haul, the board stays uncleared
await board(12); await tt('giveHand', { coal: 3 }); await tt('setScore', (await T(() => window.__deepcore.test.def().starAt))[0] + 10); await tt('bar');
await tt('gameOver'); await page.waitForTimeout(1300); s = await st();
check(s.over && !s.day.done.includes(12) && !(s.day.stars || {})[12] && /isn't cleared/.test(await T(() => document.getElementById('finalNote').textContent)), 'a cave-in after a star does not clear the board or keep the star');
check(await T(() => document.getElementById('retry').textContent === 'Retry' && document.getElementById('again').textContent === 'Return to map'), 'the cave-in buttons read Retry and Return to map');
await page.tap('#again'); await page.waitForTimeout(900); s = await st();
check(s.screen === 'map' && !Object.keys(s.hand).filter(k => s.hand[k]).length && s.bank.coal === 14, `and the haul is lost (bank coal ${s.bank.coal})`);

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
// 7. the cave-in screen
await board(10); await tt('gameOver'); await page.waitForTimeout(1500);
const over = await T(() => [document.getElementById('overWhy').textContent, document.getElementById('overTip').textContent, document.getElementById('overBar').hidden]);
check(/The cave gave way after \d+ placements?\./.test(over[0]) && over[1].length > 20 && over[2], `the cave-in screen says how long the board lasted and gives a tip (${over[0]})`);
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
await T(() => window.__deepcore.test.showHome()); await page.waitForTimeout(300);
check(await T((n) => document.getElementById('homeTwist').textContent.includes(n), modName), `the home screen shows today's twist (${modName})`);
const forgeDay = days.find(d => D.modifierFor(d).id === 'forge_day'); await tt('previewDay', forgeDay);
const lc = await tt('tcost', 1); check(lc.bone === Math.ceil(D.TOOLS[1].cost.bone * .75) && lc.wood === Math.ceil(D.TOOLS[1].cost.wood * .75), `on a Forge Day bone tools cost a quarter less (${JSON.stringify(lc)})`);
check(errors.filter(e => !/404/.test(e)).length === 0, 'no page errors ' + errors.join(' | '));
await close();
console.log(fails.length ? `R4 TESTS FAILED (${fails.length})` : 'R4 TESTS PASSED'); if (fails.length) process.exitCode = 1;
