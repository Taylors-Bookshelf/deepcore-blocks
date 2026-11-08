// The belt (v2.4.0, F-13): 3 slots shared by equipment and potions, one open at the start, slots 2 and 3 unlocked in Craft on the map.
// Everything is made in Craft (each row asks first); the board only uses what is on the belt. Equipment is dragged onto the board
// (the Star Drill onto an edge, F-16); potions are drunk on purpose and last POTION_MOVES placements; Protection saves you from cave-ins.
import { phone, touchDrag, makeChecker } from './helpers.mjs';
const { check, fails } = makeChecker();
const { page, cdp, base, errors, close } = await phone();
await page.goto(base + '?debug'); await page.waitForTimeout(500);
const tt = (f, ...a) => page.evaluate(([f, a]) => window.__deepcore.test[f](...a), [f, a]);
const st = () => page.evaluate(() => { const t = window.__deepcore.test, s = t.state(); return { belt: t.belt(), bank: s.bank, hand: s.hand, over: s.over, pieces: s.pieces, score: s.score, ...t.potions(), wk: t.workshop() }; });
const D = await page.evaluate(() => ({ moves: window.DeepcoreData.POTION_MOVES, ws: window.DeepcoreData.WORKSHOP, sc: window.DeepcoreData.SCORE, rc: window.DeepcoreData.RECIPES }));
const slots = sel => page.evaluate(sel => [...document.querySelectorAll(sel + ' .tool')].map(e => e.dataset.m || (e.classList.contains('locked') ? (e.classList.contains('glow') ? 'glow' : 'locked') : 'empty')), sel);
const row = id => page.click(`#craftBody .ci[data-id="${id}"]`);
const yes = async () => { await page.waitForTimeout(120); const t = await page.textContent('#askTitle'); await page.click('#askYes'); await page.waitForTimeout(200); return t; };
await tt('give', { coal: 200, iron: 30, copper: 40, ruby: 120, gold: 30, emerald: 12, diamond: 12, bone: 30, wood: 20, prismore: 12, meteorite: 14 });
await tt('openMap'); await page.waitForTimeout(1200);

// ---- the starting belt: one open slot; Craft is on the map ----
check((await slots('#mapBeltSlots')).join() === 'empty,locked,locked', 'a new run has one open belt slot of three (map)');
check(await page.evaluate(() => !!document.querySelector('#mapBelt #mapCraft')), 'the Craft button sits at the end of the map\'s belt bar');
await page.click('#mapCraft'); await page.waitForTimeout(300);
check((await slots('#craftBeltSlots')).join() === 'empty,glow,locked', 'in Craft, the next locked slot glows to invite a tap');
const rows = await page.$$eval('#craftBody .ci', e => e.map(x => x.dataset.id));
check(rows.join() === 'tool,drill,blast,sledgehammer,table,rescue,luck', `Craft lists tools, equipment, the brewing table and potions (${rows})`);

// ---- craft into the free slot; a full belt says so ----
await row('blast'); check(await yes() === 'Craft Blast Charge?', 'tapping a row asks first');
let s = await st(); check(s.belt.join() === 'blast,,' && s.bank.coal === 186, 'the Blast Charge goes on the belt and its ore is spent');
await row('sledgehammer'); check(await yes() === 'Belt is full!', 'with no free slot, crafting says the belt is full');
await row('rescue'); check(await yes() === 'Build the brewing table first', 'potions need the brewing table');

// ---- unlock belt slot 2 from the glowing slot; build the table; brew ----
await page.click('#craftBeltSlots .tool.glow'); await page.waitForTimeout(200);
check(await page.evaluate(() => /Belt slot 2/.test(document.getElementById('beltPop').textContent) && !document.getElementById('beltUnlock').disabled), 'the glowing slot shows its cost, with Unlock when you can afford it');
await page.click('#beltUnlock'); check(/Unlock belt slot 2/.test(await yes()), 'Unlock asks first');
s = await st(); check(s.wk.belt2 === 1 && (await slots('#craftBeltSlots')).join() === 'blast,empty,glow', 'belt slot 2 opens and slot 3 glows next');
const bank0 = (await st()).bank;
await row('table'); await yes(); await page.waitForTimeout(200);
s = await st(); check(s.wk.table === 1 && Object.entries(D.ws.table.cost).every(([k, v]) => s.bank[k] === bank0[k] - v), 'building the brewing table spends its cost');
await row('rescue'); await yes();
s = await st(); check(s.belt.join() === 'blast,rescue,', 'the potion goes in the next free slot (the slots are shared)');

// ---- rearrange and drop ----
await page.click('#craftBeltSlots [data-slot="0"]'); await page.waitForTimeout(150);
check(await page.evaluate(() => !!document.querySelector('#craftBeltSlots .tool.sel') && /Tap another slot/.test(document.getElementById('beltPop').textContent)), 'tapping an item picks it up');
await page.click('#craftBeltSlots [data-slot="1"]'); await page.waitForTimeout(150);
s = await st(); check(s.belt.join() === 'rescue,blast,', `tapping another slot swaps them (${s.belt})`);
await page.click('#craftBeltSlots [data-slot="0"]'); await page.waitForTimeout(150); await page.click('#beltDrop'); check(/Drop the Potion of Protection/.test(await yes()), 'Drop asks first');
s = await st(); check(s.belt.join() === ',blast,', 'dropping frees the slot');
await row('drill'); await yes(); await page.click('#craftClose'); await page.waitForTimeout(200);
s = await st(); check(s.belt.join() === 'drill,blast,', `the Star Drill fills the free slot (${s.belt})`);

// ---- on the board: the belt, no CRAFT or BREW; drag a Blast Charge, which mines what it breaks ----
await tt('start', 4); await page.waitForTimeout(2600);
check((await slots('#beltSlots')).join() === 'drill,blast,locked' && !(await page.$('#anvilBtn')), 'the board shows the belt, with no crafting');
const geo = () => page.evaluate(() => { const b = document.getElementById('board').getBoundingClientRect(); const c = (e) => { if (!e) return null; const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
  return { left: b.left, top: b.top, right: b.right, cell: (b.width + 2) / 8, blast: c(document.querySelector('#beltSlots .tool[data-m="blast"]')), drill: document.querySelector('#beltSlots .tool[data-m="drill"]') && c(document.querySelector('#beltSlots .tool[data-m="drill"]')), slot: [...document.querySelectorAll('.slot')].map(c) }; });
await page.evaluate(() => { const t = window.__deepcore.test; for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) t.setCell(r, c, null); for (let r = 2; r <= 4; r++) for (let c = 2; c <= 4; c++) t.setCell(r, c, 'coal'); t.setCell(7, 7, 'stone'); });
let g = await geo();
await touchDrag(page, cdp, g.blast, [g.slot[1][0], g.slot[1][1] + g.cell * 1.2]); await page.waitForTimeout(300);
s = await st(); check(s.belt.includes('blast'), 'a Blast Charge dropped off the board is kept');
g = await geo(); await touchDrag(page, cdp, g.blast, [g.left + 3.5 * g.cell, g.top + 3.5 * g.cell + g.cell * 1.2]); await page.waitForTimeout(3500);
s = await st(); let grid = await page.evaluate(() => window.__deepcore.test.state().grid);
check(!s.belt.includes('blast') && [2, 3, 4].every(r => [2, 3, 4].every(c => !grid[r][c])) && grid[7][7], 'dropping it on the board clears exactly the 3x3 patch and frees its slot');
check(s.hand.coal === 9, `what the Blast Charge breaks is mined into the haul (${JSON.stringify(s.hand)})`);

// ---- the Star Drill goes on an edge: the left edge picks a row ----
await page.evaluate(() => { const t = window.__deepcore.test; for (let c = 0; c < 7; c++) t.setCell(5, c, c % 2 ? 'iron' : 'stone'); t.setCell(1, 1, 'stone'); });
g = await geo(); await touchDrag(page, cdp, g.drill, [g.left + 3.5 * g.cell, g.top + 3.5 * g.cell + g.cell * 1.2]); await page.waitForTimeout(400);
s = await st(); check(s.belt.includes('drill'), 'the Star Drill dropped in the middle of the board is kept (it goes on an edge)');
g = await geo(); await touchDrag(page, cdp, g.drill, [g.left + 0.3 * g.cell, g.top + 5.5 * g.cell + g.cell * 1.2]); await page.waitForTimeout(3200);
s = await st(); grid = await page.evaluate(() => window.__deepcore.test.state().grid);
check(!s.belt.includes('drill') && grid[5].every(v => !v) && grid[1][1] && grid[7][7], 'on the left edge it mines exactly that row');
check(s.hand.iron === 3, `the drilled row is mined into the haul (${JSON.stringify(s.hand)})`);

// ---- Potion of Luck: drunk on purpose, POTION_MOVES placements ----
await page.evaluate(() => { const t = window.__deepcore.test; t.addSpecial('luck'); });
const score0 = (await st()).score;
await page.tap('#beltSlots .tool[data-m="luck"]'); await page.waitForTimeout(1500);
s = await st(); check(s.luck === D.moves && s.luckLive && !s.belt.includes('luck') && s.score === Math.max(0, score0 + D.sc.special.luck), `drinking Luck starts ${D.moves} lucky placements and costs its points`);

// ---- cave-in while holding a Potion of Protection: no automatic save ----
await page.evaluate(() => { const t = window.__deepcore.test; t.addSpecial('rescue'); });
await tt('gameOver'); await page.waitForTimeout(1500); s = await st();
check(s.over && s.belt.includes('rescue') && /Potion of Protection on your belt/.test(await page.textContent('#overTip')), 'a potion on the belt does not save you on its own; the cave-in screen says to drink it first');
await page.tap('#retry'); await page.waitForTimeout(2600);

// ---- Potion of Protection: every cave-in in its window is undone ----
await page.evaluate(() => { const t = window.__deepcore.test, b = t.state().specials; b.splice(0, 3, 'rescue', 'blast', null); t.fitDock(); });
await tt('addSpecial', 'blast'); await page.waitForTimeout(150);
const score1 = (await st()).score;
await page.tap('#beltSlots .tool[data-m="rescue"]'); await page.waitForTimeout(2200);
s = await st();
check(s.protLive && s.prot === D.moves && !s.belt.includes('rescue') && s.score === Math.max(0, score1 + D.sc.special.rescue), 'drinking Protection covers the next placements and costs its points');
check(await page.evaluate(() => !document.getElementById('protBadge').hidden && document.querySelectorAll('#protBadge .pips i.on').length === Math.ceil(window.DeepcoreData.POTION_MOVES / 3) && /15 placements/.test(document.getElementById('protTxt').textContent)), 'the Protection badge shows five pips and the placements left');
await page.evaluate(() => { const t = window.__deepcore.test; t.setPieces([{ cells: [[0, 0]], h: 1, w: 1, mats: ['stone'], sid: 0 }, null, null]); t.setNext(null); });
const before = await st();
await tt('gameOver'); await page.waitForTimeout(750);
check(await page.evaluate(() => window.__deepcore.test.fx().fxList) > 0, 'the save plays its shield animation');
await page.waitForTimeout(1500); s = await st();
check(!s.over && s.protLive && s.prot === before.prot && s.score === before.score, `a cave-in while protected is undone for free and the protection carries on (prot ${s.prot})`);
check(await page.evaluate(() => [...document.querySelectorAll('#beltSlots .tool[data-m]')].map(e => e.dataset.m).join() === 'blast'), 'the belt is redrawn right away');
check(await page.evaluate(() => { const p = window.__deepcore.test.state().pieces; return p.every(Boolean) && [...document.querySelectorAll('.slot canvas')].every(c => !c.hidden && c.style.width); }), 'the fresh pieces show in the tray right away');
await page.evaluate(() => { const t = window.__deepcore.test; for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) t.setCell(r, c, null); t.setCell(3, 3, 'stone'); });
g = await geo(); await touchDrag(page, cdp, g.blast, [g.left + 3.5 * g.cell, g.top + 3.5 * g.cell + g.cell * 1.2]); await page.waitForTimeout(3500);
s = await st(); check(!s.belt.includes('blast') && !(await page.evaluate(() => window.__deepcore.test.state().grid[3][3])), 'after a save the Blast Charge still drags onto the board');
await tt('tickPotions', D.moves);
s = await st(); check(!s.protLive && s.prot === 0, 'Protection wears off after its placements');

// ---- an old save's list of specials: what fits the belt stays (equipment first), the rest goes back to the stash ----
await page.evaluate(() => { const t = window.__deepcore.test; t.setRun({ wk: {} }); const s = t.state(); s.specials.splice(0, s.specials.length, 'blast', 'sledgehammer', 'luck'); t.setBank({}); t.fitDock(); });
s = await st(); check(s.belt.join() === 'blast,,' && s.bank.copper === 11 && s.bank.ruby === 21 && s.bank.bone === 4, `without belt slots the extras are refunded as ore (${s.belt}, ${JSON.stringify(s.bank)})`);

check(errors.filter(e => !/404/.test(e)).length === 0, 'no page errors ' + errors.join(' | '));
await close();
console.log(fails.length ? `DOCK TESTS FAILED (${fails.length})` : 'DOCK TESTS PASSED'); if (fails.length) process.exitCode = 1;
