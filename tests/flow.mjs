// Game-flow tests on a phone-sized browser: the unbanked "hand", losing it on a cave-in, banking it on a clear, wood, and the Luck Tonic.
import { phone, makeChecker } from './helpers.mjs';
const { check, fails } = makeChecker();
const { page, base, errors, close } = await phone();
await page.goto(base + '?debug'); await page.waitForTimeout(500);
const T = fn => page.evaluate(fn);
const st = () => T(() => { const s = window.__deepcore.test.state(); return { hand: s.hand, bank: s.bank, luck: s.luck, luckLive: s.luckLive, crafted: s.crafted, over: s.over, screen: s.screen, busy: s.busy, score: s.score }; });
const board = async idx => { await page.evaluate(i => window.__deepcore.test.start(i), idx); await page.waitForTimeout(2600); };
const rowSetup = (mats, bar) => page.evaluate(([mats, bar]) => { const t = window.__deepcore.test; for (let c = 0; c < 8; c++) t.setCell(7, c, null); mats.forEach((m, c) => { if (m) t.setCell(7, c, m); });
  t.setPieces([{ cells: [[0, 0], [0, 1]], h: 1, w: 2, mats: ['stone', 'stone'], sid: 1 }, null, null]); window.__deepcore.test.place(0, 7, mats.length); }, [mats, bar]);

// ---- mining goes to the hand, not the stash ----
await board(4);
await T(() => window.__deepcore.test.give({ coal: 3 }));
await rowSetup(['coal', 'coal', 'iron', 'copper', 'log', 'log']); await page.waitForTimeout(2500);
let s = await st();
check(s.hand.coal === 2 && s.hand.iron === 1 && s.hand.copper === 1 && s.hand.wood === 2, `mined ore and wood land in the hand (${JSON.stringify(s.hand)})`);
check(s.bank.coal === 3 && !s.bank.iron && !s.bank.wood, 'the stash did not change yet');
const shown = await T(() => [...document.querySelectorAll('.si')].map(e => e.dataset.k + ':' + e.querySelector('.n').textContent + e.querySelector('.pl').textContent).join(' '));
check(/coal:3\+2/.test(shown) && /wood:0\+2/.test(shown), `stash shows banked count and +haul (${shown})`);
check((await T(() => document.getElementById('bestPlus').textContent)).startsWith('+'), 'Today shows the points of the board in progress as +n');

// ---- a cave-in without a Rescue Potion spills the hand ----
await T(() => window.__deepcore.test.gameOver()); await page.waitForTimeout(900);
s = await st();
check(Object.values(s.hand).every(v => !v), 'cave-in empties the hand');
check(s.bank.coal === 3 && !s.bank.iron, 'cave-in leaves the banked stash alone');
check(await T(() => window.DCA.buffer.some(e => e.event === 'board_fail' && e.properties.hand_lost >= 6)), 'analytics recorded the lost haul');
check(await T(() => !document.getElementById('over').hidden), 'cave-in screen is shown');
await page.waitForTimeout(1500);

// ---- restarting the board starts from an empty hand; clearing banks it ----
await board(4); s = await st(); check(Object.values(s.hand).every(v => !v), 'a restarted board starts with an empty hand');
await T(() => window.__deepcore.test.giveHand({ coal: 5, iron: 2 })); await T(() => window.__deepcore.test.complete()); await page.waitForTimeout(2300);
s = await st(); check(s.bank.coal === 8 && s.bank.iron === 2 && Object.values(s.hand).every(v => !v), `clearing the board banks the hand (${JSON.stringify(s.bank)})`);
check(s.screen === 'map', 'clearing returns to the map');

// ---- Luck Tonic ----
await board(4);
await T(() => window.__deepcore.test.give({ cinnabar: 24, diamond: 2 }));
await page.tap('#anvilBtn'); await page.waitForTimeout(200);
const names = await page.$$eval('.recipe .nm', e => e.map(x => x.textContent)); check(names.join() === 'Blast charge,Jackhammer,Rescue Potion,Luck Tonic', 'anvil lists four recipes: ' + names);
await (await page.$$('.recipe button.go'))[3].click(); await page.waitForTimeout(150);
s = await st(); check(s.crafted.luck === 1 && s.bank.cinnabar === 12 && s.bank.diamond === 1, 'Luck Tonic crafted for 12 cinnabar + 1 diamond');
check(await (await page.$$('.recipe button.go'))[3].isDisabled(), 'only one Luck Tonic can be held');
await page.tap('#anvilClose');
await page.tap('.chip.tap'); await page.waitForTimeout(1400);
s = await st(); check(s.luck === 7, 'drinking starts 7 lucky sets');
check(await T(() => !document.getElementById('luckBadge').hidden && document.querySelectorAll('#luckBadge .pips i.on').length === 7), 'luck badge shows 7 lit pips');
await T(() => { const t = window.__deepcore.test; t.deal(); }); s = await st(); check(s.luck === 6 && s.luckLive, 'each deal uses one lucky set');
for (let i = 0; i < 6; i++) await T(() => window.__deepcore.test.deal());
s = await st(); check(s.luck === 0 && s.luckLive, 'after the 7th lucky set the last one is still live');
check(await T(() => document.getElementById('luckTxt').textContent) === 'Last lucky set', 'badge says it is the last lucky set');
await T(() => window.__deepcore.test.deal()); s = await st(); check(!s.luckLive && await T(() => document.getElementById('luckBadge').hidden), 'luck expires with a clear indicator going away');

check(errors.length === 0, 'no page errors ' + errors.join(' | '));
await close();
console.log(fails.length ? `FLOW TESTS FAILED (${fails.length})` : 'FLOW TESTS PASSED'); if (fails.length) process.exitCode = 1;
