// Progression tests: the map digs open as boards are cleared; torch/lantern gates; strip mines; the daily reset and day-end tally.
import { phone, makeChecker } from './helpers.mjs';
const { check, fails } = makeChecker();
const { page, base, errors, close } = await phone();
await page.goto(base + '?debug'); await page.waitForTimeout(500);
const T = (fn, arg) => page.evaluate(fn, arg);
const tt = (fn, ...a) => page.evaluate(([f, a]) => window.__deepcore.test[f](...a), [fn, a]);
const nodes = () => T(() => [...document.querySelectorAll('#mapNodes .node')].map(n => n.className.replace('node ', '')));
const st = () => T(() => { const s = window.__deepcore.test.state(); return { bank: s.bank, day: s.dayState }; });

await page.tap('#mapBtn'); await page.waitForTimeout(500);
let n = await nodes(); check(n.length === 1 && n[0].includes('open'), 'a fresh day shows only the first board');
await tt('markDone', [0]); await tt('buildMap'); n = await nodes(); check(n.length === 2, 'clearing a board digs open the next one');
await tt('markDone', [0, 1]); await tt('buildMap'); n = await nodes(); check(n.length === 3, 'one more cleared, one more revealed');

// ---- the torch gate (board 1-4) ----
await tt('markDone', [0, 1, 2]); await tt('buildMap'); n = await nodes();
check(n.filter(c => c.includes('gate')).length === 1 && n.filter(c => c.includes('strip')).length === 1, 'after board 1-3: a gate marker for 1-4 and a strip-mine branch appear');
await page.tap('.node.gate'); await page.waitForTimeout(250);
check(/Craft torches/.test(await T(() => document.getElementById('ncGo').textContent)), 'tapping the gate offers to craft torches');
await page.tap('#ncGo'); await page.waitForTimeout(250);
check(await T(() => !document.getElementById('craftPanel').hidden), 'craft panel opens on the map');
check(await T(() => document.querySelector('#craftBody .recipe button.go').disabled), 'cannot craft a torch without coal and wood');
await tt('setBank', { coal: 20, wood: 10 }); await tt('craftLight', 0); await page.waitForTimeout(100);
let s = await st(); check(s.bank.coal === 10 && s.bank.wood === 5 && s.day.lights[0] === 1, 'a torch costs 10 coal + 5 wood');
check(await T(() => !!document.querySelector('.node.gate')), 'one torch is not enough');
await tt('craftLight', 0); s = await st(); check(s.day.lights[0] === 2 && !s.bank.coal, 'second torch placed');
await page.tap('#craftClose'); await page.waitForTimeout(200); n = await nodes();
check(!n.some(c => c.includes('gate')) && n.length === 5, 'with two torches the gate opens and board 1-4 is revealed');

// ---- the lantern gate (board 2-4) ----
await tt('markDone', [0, 1, 2, 3, 4, 5, 6]); await tt('buildMap');
check(await T(() => !!document.querySelector('.node.gate')), 'a lantern gate guards board 2-4');
await tt('setBank', { coal: 20, copper: 10 }); await tt('craftLight', 1); s = await st();
check(s.bank.coal === 0 && s.bank.copper === 0 && s.day.lights[1] === 1, 'a lantern costs 20 coal + 10 copper');

// ---- strip mine ----
await tt('setBank', { coal: 5 });
await T(() => [...document.querySelectorAll('.node.strip')].find(b => /Stone Caves/.test(b.getAttribute('aria-label'))).click()); await page.waitForTimeout(250);
const goalTxt = await T(() => document.getElementById('ncGoals').textContent.replace(/\s+/g, ' '));
check(/Gather/.test(goalTxt), 'strip mine card lists what to gather (' + goalTxt.trim() + ')');
await page.tap('#ncGo'); await page.waitForTimeout(2600);
const g = await tt('goals'); check(g && g.coal === 15 && g.copper === 10, `strip mine asks for exactly what two lanterns still lack (${JSON.stringify(g)})`);
check(await T(() => !!document.querySelector('.stripGoals .goal')) && await T(() => !document.getElementById('pfill')), 'goal chips replace the score bar');
check(await tt('stripMet') === false, 'goals not met yet');
await tt('giveHand', { coal: 15, copper: 10 }); await T(() => window.__deepcore.test.setScore(240));
check(await tt('stripMet') === true, 'strip mine is complete when the haul meets the goals');
const doneBefore = (await st()).day.done.length;
await tt('completeStrip'); await page.waitForTimeout(2400); s = await st();
check(s.day.strip[1] === true && s.day.bonus === 240 && s.bank.coal === 20 && s.bank.copper === 10, `strip mine banks the haul and adds its score to the daily bonus (${JSON.stringify({ b: s.day.bonus, bank: s.bank })})`);
check(s.day.done.length === doneBefore, 'the strip mine is not one of the 20 boards');
check(/bonus 240/.test(await T(() => document.getElementById('mapProg').textContent)), 'map header shows the bonus');
check(await T(() => !!document.querySelector('.node.strip.done')), 'cleared strip mine is marked');

// ---- daily reset ----
await tt('setBank', { coal: 10, iron: 2 });
await tt('newDay', '2000-01-01'); await page.waitForTimeout(200);
const h = await tt('history'); s = await st();
check(Object.values(s.bank).every(v => !v), 'the stash is emptied at the new day');
check(h.lastDay && h.lastDay.leftover === 10 * 15 + 2 * 30 && h.lastDay.bonus === 240, `leftovers became bonus points on yesterday's record (${JSON.stringify(h.lastDay)})`);
check(s.day.done.length === 0 && !s.day.lights[0] && !s.day.bonus, 'the new day starts fresh (no boards, lights or bonus)');

// ---- day-end tally after the last board ----
await tt('markDone', Array.from({ length: 19 }, (_, i) => i)); await tt('setBank', { coal: 7, gold: 1 });
await tt('start', 19); await page.waitForTimeout(2600); await tt('complete'); await page.waitForTimeout(3600);
check(await T(() => !document.getElementById('prospector').hidden), 'Prospector badge shows after all 20');
await page.tap('#pOk'); await page.waitForTimeout(300);
check(await T(() => !document.getElementById('dayEnd').hidden && /\d+ bonus points/.test(document.getElementById('dayEndTotal').textContent)), 'day-end tally shows leftover bonus points');
await page.tap('#dayEndCraft'); await page.waitForTimeout(250);
check(await T(() => !document.getElementById('craftPanel').hidden), 'the tally lets you spend leftovers on specials');
await page.tap('#craftClose');

// ---- info panel documents the new systems ----
await page.tap('#homeBtn').catch(() => {});
check(errors.length === 0, 'no page errors ' + errors.join(' | '));
await close();
console.log(fails.length ? `GATE TESTS FAILED (${fails.length})` : 'GATE TESTS PASSED'); if (fails.length) process.exitCode = 1;
