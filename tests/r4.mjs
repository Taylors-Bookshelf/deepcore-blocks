// Release 4: stars and banking (push your luck), combo meter, near-miss cave-in screen, hint, daily modifiers.
import { createRequire } from 'node:module';
import { phone, makeChecker } from './helpers.mjs';
const require = createRequire(import.meta.url);
const D = require('../src/data.js'), C = require('../src/core.js');
const { check, fails } = makeChecker();

// ---- data: stars, modifiers, lamp costs ----
check(D.starsFor(999, 1000) === 0 && D.starsFor(1000, 1000) === 1 && D.starsFor(1300, 1000) === 2 && D.starsFor(1700, 1000) === 3, 'stars come at 100%, 130% and 170% of the target');
check(D.starBonus(1, 2400) === 0 && D.starBonus(2, 2400) === 240 && D.starBonus(3, 2400) === 480, 'each extra star is worth 10% of the target');
const days = Array.from({ length: 90 }, (_, i) => `2026-${String(1 + Math.floor(i / 28)).padStart(2, '0')}-${String(1 + i % 28).padStart(2, '0')}`);
const mods = days.map(d => D.modifierFor(d).id);
check(new Set(mods).size === D.MODIFIERS.length, `every one of the ${D.MODIFIERS.length} daily twists comes up within 90 days`);
check(D.modifierFor(days[3]).id === D.modifierFor(days[3]).id, 'a day always has the same twist');
const byId = Object.fromEntries(D.MODIFIERS.map(m => [m.id, m]));
const base = D.boardParams(3, 1), gold = D.boardParams(3, 1, byId.gold_rush), gem = D.boardParams(4, 1, byId.gem_fever), tre = D.boardParams(3, 1, byId.treasure_day);
check(gold.oreBoost.gold === 3 && !base.oreBoost.gold, 'Gold Rush triples gold');
check(gem.gems.emerald.p > D.boardParams(4, 1).gems.emerald.p && gem.gems.emerald.cap === D.boardParams(4, 1).gems.emerald.cap + 1, 'Gem Fever makes gems commoner and raises the cap');
check(tre.specialMul === 3 && base.specialMul === 1, 'Treasure Day triples special blocks');
check(D.lightCost('torch', byId.bright_lamps).coal === 8 && D.lightCost('lantern', byId.bright_lamps).coal === 15 && D.lightCost('torch').coal === 10, 'Bright Lamps cost 25% less (rounded up)');
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

// 1. reaching the target: cleared, haul banked, prompt
await board(4); const tg = await target();
await tt('give', { coal: 10 }); await tt('giveHand', { coal: 4, wood: 2 }); await tt('setScore', tg - 5); await clearRow(); await page.waitForTimeout(2600);
let s = await st();
check(s.reached && s.hand.coal === undefined && s.bank.coal === 14 && s.day.done.includes(4), `reaching the target clears the board and banks the haul at once (bank coal ${s.bank.coal})`);
check(await T(() => !document.getElementById('sheetScrim').hidden && /BOARD CLEARED/.test(document.getElementById('sheet').textContent) && !!document.getElementById('kpGo') && !!document.getElementById('kpBank')), 'a prompt offers BANK IT or KEEP GOING');
check(s.day.stars[4] === 1 && s.day.scores[4] > tg, 'the clear is recorded with 1 star');
// 2. keep going: stars, bank button, risk
await page.tap('#kpGo'); await page.waitForTimeout(300);
check(await T(() => !!document.getElementById('bankBtn') && document.querySelectorAll('.pbar .mk').length === 3 && !!document.querySelector('.pbar.over')), 'playing on shows star markers and a BANK button');
await tt('setScore', Math.round(tg * 1.3)); await page.waitForTimeout(600);
check(await T(() => document.getElementById('mk0').classList.contains('on') && document.getElementById('mk1').classList.contains('on') && !document.getElementById('mk2').classList.contains('on') && /\//.test(document.getElementById('pgoal').textContent)), 'two stars light up and the bar shows the next goal');
await tt('giveHand', { coal: 3 }); const bankBefore = (await st()).bank.coal;
await tt('gameOver'); await page.waitForTimeout(1500); s = await st();
check(s.over && s.hand.coal === undefined && s.bank.coal === bankBefore, 'a cave-in while playing on loses only the ore gathered since the clear');
check(await T(() => /keep your clear/.test(document.getElementById('overWhy').textContent)) && s.day.done.includes(4) && s.day.stars[4] === 1, 'the clear and its single star are kept');
check(!s.day.fails || !s.day.fails[4], 'that cave-in does not count as a failed attempt');

// 3. banking with 3 stars pays the star bonus
await page.tap('#again'); await page.waitForTimeout(600); await board(5); const tg5 = await target();
await tt('setScore', Math.round(tg5 * 1.7) - 5); await clearRow(); await page.waitForTimeout(2600);
check(await T(() => document.querySelectorAll('.shStar.got').length) === 3, 'the prompt shows three stars earned');
await page.tap('#kpBank'); await page.waitForTimeout(3200); s = await st();
const expectBonus = D.starBonus(3, tg5);
check(s.day.stars[5] === 3 && s.day.scores[5] >= Math.round(tg5 * 1.7) && s.screen === 'map', `banking at three stars records 3 stars and returns to the map (bonus ${expectBonus})`);
check(s.day.scores[5] - (Math.round(tg5 * 1.7) - 5) > expectBonus, 'the star bonus is part of the board score');
// 4. auto-bank at three stars while playing on
await board(6); const tg6 = await target(); await tt('setScore', tg6 - 5); await clearRow(); await page.waitForTimeout(2600); await page.tap('#kpGo'); await page.waitForTimeout(300);
await tt('setScore', Math.round(tg6 * 1.7) - 5); await clearRow(); await page.waitForTimeout(4200); s = await st();
check(s.screen === 'map' && s.day.stars[6] === 3, 'reaching three stars while playing on banks the board automatically');
// 5. practice replays can still raise your stars
await board(6); check(await tt('practice'), 'replay is a practice run'); await tt('setScore', Math.round(await target() * 1.3) - 5); await clearRow(); await page.waitForTimeout(2600); await page.tap('#kpBank'); await page.waitForTimeout(3200);
check((await st()).day.stars[6] === 3, 'a worse replay never lowers the stars you already have');

// 6. combo meter
await board(4);
for (let k = 0; k < 2; k++) { await clearRow(); await page.waitForTimeout(2300); }
s = await st(); check(s.combo >= 2, `two clears in a row make a combo (${s.combo})`);
check(await T(() => !document.getElementById('comboMeter').hidden && /×\d/.test(document.getElementById('cmN').textContent) && document.querySelectorAll('#comboMeter .pips i.on').length === 3), 'the combo meter shows the multiplier and three lit pips');
// 7. near-miss cave-in screen
await board(5); await tt('setScore', Math.round(tg5 * .93)); await tt('gameOver'); await page.waitForTimeout(1500);
const over = await T(() => [document.getElementById('overWhy').textContent, document.getElementById('overTip').textContent, document.getElementById('overBar').firstElementChild.style.width]);
check(/So close/.test(over[0]) && /points short/.test(over[0]) && over[1].length > 20 && over[2] === '93%', `the cave-in screen says how close you were and gives a tip (${over[0]})`);
check(!/easier/.test(over[1]), 'no mercy note after the first cave-in');
for (let k = 0; k < 2; k++) { await page.tap('#retry'); await page.waitForTimeout(2600); await tt('gameOver'); await page.waitForTimeout(1500); }
check(await T(() => /go easier/.test(document.getElementById('overTip').textContent)), 'after repeated cave-ins the screen tells you the dealer will ease up');

// 8. hint
await page.tap('#retry'); await page.waitForTimeout(2600); await tt('give', { coal: 5 });
check(await T(() => !document.getElementById('hintBtn').disabled), 'hint is available when you hold coal');
const coal0 = (await st()).bank.coal; await page.tap('#hintBtn'); await page.waitForTimeout(300); s = await st();
check(s.bank.coal === coal0 - 3 && s.hintInfo && await T(() => !!document.querySelector('.slot.hint')), 'a hint costs 3 coal and marks a piece and a spot');
check(await T(() => { const t = window.__deepcore.test, s2 = t.state(); const p = s2.pieces[s2.hintInfo.i]; return t.fits(p, s2.hintInfo.r0, s2.hintInfo.c0); }), 'the hinted spot is a legal placement');
await tt('setBank', { coal: 2 }); await page.waitForTimeout(100);
check(await T(() => document.getElementById('hintBtn').disabled), 'hint is disabled without enough coal');
check(await T(() => window.DCA.buffer.some(e => e.event === 'hint_used')), 'analytics recorded the hint');

// 9. daily twist shown, and Bright Lamps cheaper
await T(() => window.__deepcore.test.openMap());
const modName = await T(() => window.__deepcore.test.mod().name);
check(await T((n) => document.getElementById('mapProg').textContent.includes(n), modName), `the map shows today's twist (${modName})`);
const lampDay = days.find(d => D.modifierFor(d).id === 'bright_lamps'); await tt('previewDay', lampDay);
const lc = await tt('lcost', 0); check(lc.coal === 8 && lc.wood === 4, `on a Bright Lamps day a torch costs 8 coal + 4 wood (${JSON.stringify(lc)})`);
check(errors.filter(e => !/404/.test(e)).length === 0, 'no page errors ' + errors.join(' | '));
await close();
console.log(fails.length ? `R4 TESTS FAILED (${fails.length})` : 'R4 TESTS PASSED'); if (fails.length) process.exitCode = 1;
