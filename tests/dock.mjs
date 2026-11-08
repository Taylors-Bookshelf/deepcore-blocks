// Specials dock (v2.2.0, F-10): equipment slots with the anvil on the left, potion slots with the brewing table on the right.
// One equipment slot to start; the brewing table (built at the anvil) unlocks potions and a potion slot; second slots are upgrades.
// Equipment is dragged onto the board; potions are drunk on purpose and last POTION_MOVES placements (v2.3.0); Protection saves you from cave-ins.
import { phone, touchDrag, makeChecker } from './helpers.mjs';
const { check, fails } = makeChecker();
const { page, cdp, base, errors, close } = await phone();
await page.goto(base + '?debug'); await page.waitForTimeout(500);
const tt = (f, ...a) => page.evaluate(([f, a]) => window.__deepcore.test[f](...a), [f, a]);
const st = () => page.evaluate(() => { const t = window.__deepcore.test, s = t.state(); return { specials: s.specials, bank: s.bank, over: s.over, pieces: s.pieces, score: s.score, ...t.potions(), wk: t.workshop() }; });
const D = await page.evaluate(() => ({ moves: window.DeepcoreData.POTION_MOVES, ws: window.DeepcoreData.WORKSHOP, sc: window.DeepcoreData.SCORE }));
await tt('start', 4); await page.waitForTimeout(2600);
await tt('give', { coal: 200, iron: 30, copper: 40, ruby: 120, gold: 30, emerald: 12, diamond: 6, bone: 30, wood: 20, prismore: 10 });
const dockTiles = () => page.evaluate(() => ({ eq: [...document.querySelectorAll('#eqSlots .tool')].map(e => e.dataset.m || (e.classList.contains('locked') ? 'locked' : 'empty')),
  pot: [...document.querySelectorAll('#potSlots .tool')].map(e => e.dataset.m || (e.classList.contains('locked') ? 'locked' : 'empty')), brewLocked: document.getElementById('brewBtn').classList.contains('locked') }));

// ---- the starting dock: one equipment slot; potions locked behind the brewing table ----
let d = await dockTiles();
check(d.eq.join() === 'empty,locked' && d.pot.join() === 'locked,locked' && d.brewLocked, `one open equipment slot, potions locked (${JSON.stringify(d)})`);
await page.tap('#brewBtn'); await page.waitForTimeout(300);
check(await page.evaluate(() => document.getElementById('anvilTitle').textContent === 'Anvil' && document.querySelector('.recipe.flash[data-ws="table"]') !== null), 'BREW before the table is built opens the anvil at the Brewing table');
const anvilRows = await page.$$eval('#recipes .recipe .nm', e => e.map(x => x.textContent));
check(anvilRows.join() === 'Blast Charge,Sledgehammer,Brewing table,Second equipment slot', `the anvil lists equipment and its workshop upgrades (${anvilRows})`);

// ---- equipment: one slot, the next craft asks to make room ----
await page.click('.recipe[data-m="blast"] button'); await page.waitForTimeout(150);
let s = await st(); check(s.specials.join() === 'blast', 'a Blast Charge fills the equipment slot');
check(await page.$eval('.recipe[data-m="sledgehammer"] button', b => b.textContent) === 'Make room', 'with the slot full the Sledgehammer offers "Make room"');

// ---- build the brewing table: potions unlock ----
const bank0 = (await st()).bank;
await page.click('[data-ws="table"] button'); await page.waitForTimeout(300);
s = await st(); d = await dockTiles();
check(s.wk.table === 1 && Object.entries(D.ws.table.cost).every(([k, v]) => s.bank[k] === bank0[k] - v), 'building the brewing table spends its cost');
check(d.pot.join() === 'empty,locked' && !d.brewLocked, `the first potion slot opens and BREW wakes up (${d.pot})`);
check(!(await page.$('[data-ws="table"]')), 'the table is no longer offered at the anvil');
await page.tap('#anvilClose'); await page.waitForTimeout(3200);   // the first-time tip toast
await page.tap('#brewBtn'); await page.waitForTimeout(300);
const brewRows = await page.$$eval('#recipes .recipe .nm', e => e.map(x => x.textContent));
check(await page.textContent('#anvilTitle') === 'Brewing table' && brewRows.join() === 'Potion of Protection,Potion of Luck,Second potion slot', `the brewing table lists the potions and its upgrade (${brewRows})`);
await page.click('.recipe[data-m="rescue"] button'); await page.waitForTimeout(150);
check(await page.$eval('.recipe[data-m="luck"] button', b => b.textContent) === 'Make room', 'with the potion slot full the Potion of Luck offers "Make room"');
await page.tap('#anvilClose'); await page.waitForTimeout(200);
s = await st(); check(s.specials.join() === 'blast,rescue', `equipment and potion sit in their own slots (${s.specials})`);

// ---- second slots ----
await tt('openWs', 'anvil'); await page.waitForTimeout(200); await page.click('[data-ws="equip2"] button'); await page.waitForTimeout(200);
await tt('openWs', 'brew'); await page.waitForTimeout(200); await page.click('[data-ws="potion2"] button'); await page.waitForTimeout(200);
await page.click('.recipe[data-m="luck"] button'); await page.waitForTimeout(150); await page.tap('#anvilClose'); await page.waitForTimeout(200);
await tt('openWs', 'anvil'); await page.waitForTimeout(200); await page.click('.recipe[data-m="sledgehammer"] button'); await page.waitForTimeout(150); await page.tap('#anvilClose'); await page.waitForTimeout(200);
s = await st(); d = await dockTiles();
check(s.wk.equip2 && s.wk.potion2 && d.eq.join() === 'blast,sledgehammer' && d.pot.join() === 'rescue,luck', `both second slots built: two of each (${JSON.stringify(d)})`);

// ---- drag a Blast Charge onto the board ----
const geo = () => page.evaluate(() => { const b = document.getElementById('board').getBoundingClientRect(); const c = (e) => { const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
  return { left: b.left, top: b.top, cell: (b.width + 2) / 8, blast: c(document.querySelector('#eqSlots .tool[data-m="blast"]')), slot: [...document.querySelectorAll('.slot')].map(c) }; });
await page.evaluate(() => { const t = window.__deepcore.test; for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) t.setCell(r, c, null); for (let r = 2; r <= 4; r++) for (let c = 2; c <= 4; c++) t.setCell(r, c, 'stone'); t.setCell(7, 7, 'stone'); });
let g = await geo();
await touchDrag(page, cdp, g.blast, [g.slot[1][0], g.slot[1][1] + g.cell * 1.2]); await page.waitForTimeout(300);
s = await st(); check(s.specials.includes('blast'), 'a Blast Charge dropped off the board is kept');
g = await geo(); await touchDrag(page, cdp, g.blast, [g.left + 3.5 * g.cell, g.top + 3.5 * g.cell + g.cell * 1.2]); await page.waitForTimeout(3500);
s = await st(); const grid = await page.evaluate(() => window.__deepcore.test.state().grid);
check(!s.specials.includes('blast') && [2, 3, 4].every(r => [2, 3, 4].every(c => !grid[r][c])) && grid[7][7], 'dropping it on the board clears exactly the 3x3 patch and frees its slot');
d = await dockTiles(); check(d.eq.join() === 'sledgehammer,empty', `the dock redraws (${d.eq})`);

// ---- Potion of Luck: drunk on purpose, POTION_MOVES placements ----
const score0 = (await st()).score;
await page.tap('#potSlots .tool[data-m="luck"]'); await page.waitForTimeout(1500);
s = await st(); check(s.luck === D.moves && s.luckLive && !s.specials.includes('luck') && s.score === Math.max(0, score0 + D.sc.special.luck), `drinking Luck starts ${D.moves} lucky placements and costs its points`);

// ---- cave-in without protection while holding a Potion of Protection: no automatic save ----
await tt('gameOver'); await page.waitForTimeout(1500); s = await st();
check(s.over && s.specials.includes('rescue') && /holding a Potion of Protection/.test(await page.textContent('#overTip')), 'a potion in the dock does not save you on its own; the cave-in screen says to drink it first');
check(await page.evaluate(() => !document.getElementById('rescueBtn') && [...document.querySelectorAll('#over .row button')].map(b => b.id).join() === 'retry,again'), 'after a cave-in the only choices are Retry and Map');
await page.tap('#retry'); await page.waitForTimeout(2600);

// ---- Potion of Protection: covers the next POTION_MOVES placements; every cave-in in that window is undone ----
await page.evaluate(() => { const t = window.__deepcore.test, s = t.state(); s.specials.splice(0, s.specials.length, 'rescue', 'sledgehammer'); t.addSpecial('blast'); });
await page.waitForTimeout(150);
const score1 = (await st()).score;
await page.tap('#potSlots .tool[data-m="rescue"]'); await page.waitForTimeout(2200);
s = await st();
check(s.protLive && s.prot === D.moves && !s.specials.includes('rescue') && s.score === Math.max(0, score1 + D.sc.special.rescue), 'drinking Protection covers the next placements and costs its points');
check(await page.evaluate(() => !document.getElementById('protBadge').hidden && document.querySelectorAll('#protBadge .pips i.on').length === Math.ceil(window.DeepcoreData.POTION_MOVES / 3) && /15 placements/.test(document.getElementById('protTxt').textContent)), 'the Protection badge shows five pips and the placements left');
await page.evaluate(() => { const t = window.__deepcore.test; t.setPieces([{ cells: [[0, 0]], h: 1, w: 1, mats: ['stone'], sid: 0 }, null, null]); t.setNext(null); });
const before = await st();
await tt('gameOver'); await page.waitForTimeout(750);
check(await page.evaluate(() => window.__deepcore.test.fx().fxList) > 0, 'the save plays its shield animation');
await page.waitForTimeout(1500); s = await st();
check(!s.over && s.protLive && s.prot === before.prot && s.score === before.score, `a cave-in while protected is undone for free and the protection carries on (prot ${s.prot})`);
check(await page.evaluate(() => { const t = [...document.querySelectorAll('#dockSlots .tool:not(.empty)')].map(e => e.dataset.m); return t.join() === 'sledgehammer,blast'; }), 'the dock is redrawn right away');
check(await page.evaluate(() => { const p = window.__deepcore.test.state().pieces; return p.every(Boolean) && [...document.querySelectorAll('.slot canvas')].every(c => !c.hidden && c.style.width); }), 'the fresh pieces show in the tray right away');
// equipment still drags after a save (2.1.2 regression)
await page.evaluate(() => { const t = window.__deepcore.test; for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) t.setCell(r, c, null); t.setCell(3, 3, 'stone'); });
g = await geo(); await touchDrag(page, cdp, g.blast, [g.left + 3.5 * g.cell, g.top + 3.5 * g.cell + g.cell * 1.2]); await page.waitForTimeout(3500);
s = await st(); check(!s.specials.includes('blast') && !(await page.evaluate(() => window.__deepcore.test.state().grid[3][3])), 'after a save the Blast Charge still drags onto the board');
// it wears off after its placements
await tt('tickPotions', D.moves);
s = await st(); check(!s.protLive && s.prot === 0, 'Protection wears off after its placements');
await tt('gameOver'); await page.waitForTimeout(1500); s = await st(); check(s.over, 'once it has worn off a cave-in ends the board');

// ---- an old save with too many specials: extras go back to the stash ----
await page.evaluate(() => { const t = window.__deepcore.test; t.setRun({ wk: {} }); const s = t.state(); s.specials.splice(0, s.specials.length, 'blast', 'sledgehammer', 'luck'); t.setBank({}); t.fitDock(); });
s = await st(); check(s.specials.join() === 'blast' && s.bank.copper === 10 && s.bank.ruby === 20 && s.bank.bone === 4, `without upgrades the extras are refunded as ore (${s.specials}, ${JSON.stringify(s.bank)})`);

check(errors.filter(e => !/404/.test(e)).length === 0, 'no page errors ' + errors.join(' | '));
await close();
console.log(fails.length ? `DOCK TESTS FAILED (${fails.length})` : 'DOCK TESTS PASSED'); if (fails.length) process.exitCode = 1;
