// The descent: the map digs open board by board; tools open each new layer (no side tunnels since v2.0.2); missed days and camps
// (every layer's first board since v2.1.0); no tool wear until F-9; and the Ancient Core finale with its core fragment.
import { phone, makeChecker } from './helpers.mjs';
const { check, fails } = makeChecker();
const { page, base, errors, close } = await phone();
await page.goto(base + '?debug'); await page.waitForTimeout(500);
const T = (fn, arg) => page.evaluate(fn, arg);
const tt = (fn, ...a) => page.evaluate(([f, a]) => window.__deepcore.test[f](...a), [fn, a]);
const nodes = () => T(() => [...document.querySelectorAll('#mapNodes .node')].map(n => n.className.replace('node ', '')));
const st = () => T(() => { const s = window.__deepcore.test.state(); return { bank: s.bank, day: s.dayState, screen: s.screen }; });
const upto = n => Array.from({ length: n }, (_, k) => k);

await page.tap('#mapBtn'); await page.waitForTimeout(500);
let n = await nodes(); check(n.length === 1 && n[0].includes('open'), 'a fresh descent shows only the first board');
await tt('markDone', [0]); await tt('buildMap'); n = await nodes(); check(n.length === 2, 'clearing a board digs open the next one');
await tt('markDone', [0, 1, 2]); await tt('buildMap'); n = await nodes();
check(n.length === 4 && !n.some(c => c.includes('strip') || c.includes('gate')), 'after board 1-3 only board 1-4 opens: no side tunnel, and no new tools needed');

// ---- tools open the next layer ----
await tt('markDone', upto(8)); await tt('buildMap'); n = await nodes();
check(n.filter(c => c.includes('gate')).length === 1, 'the first Limestone board waits for bone tools');
await page.tap('.node.gate'); await page.waitForTimeout(250);
check(/Open Craft/.test(await T(() => document.getElementById('ncGo').textContent)) && /Replay boards/.test(await T(() => document.getElementById('ncNote').textContent)), 'without the bones the gate points to Craft and to replaying boards');
await page.tap('#ncClose'); await page.tap('#mapCraft'); await page.waitForTimeout(250);
check(await T(() => /Bone tools/.test(document.getElementById('craftBody').textContent) && !!document.querySelector('#craftBody .ci[data-id="tool"] .short')), 'Craft offers bone tools, not yet affordable');
await page.tap('#craftClose');
const bc = await tt('tcost', 1); await tt('setBank', { bone: bc.bone, wood: bc.wood, coal: 3 }); await tt('buildMap'); await page.tap('.node.gate'); await page.waitForTimeout(250);
check(/Open Craft/.test(await T(() => document.getElementById('ncGo').textContent)) && /forge them in Craft/.test(await T(() => document.getElementById('ncNote').textContent)) && (await st()).day.tool === 0, `even with ${bc.bone} bone and ${bc.wood} wood the gate only points to Craft: tools are never forged from the board card (v2.5.0)`);
await page.tap('#ncGo'); await page.waitForTimeout(400);
check(await T(() => !document.getElementById('craftPanel').hidden && document.getElementById('nodeCard').hidden), 'Open Craft opens Craft and closes the card');
await page.click('#craftBody .ci[data-id="tool"]'); await page.waitForTimeout(150); await page.click('#askYes'); await page.waitForTimeout(300); await page.tap('#craftClose'); await page.waitForTimeout(400);
let s = await st(); n = await nodes();
{ const c = await tt('tcost', 1); check(s.day.tool === 1 && !s.bank.bone && !s.bank.wood && s.bank.coal === 3 && !n.some(c => c.includes('gate')), `forging bone tools in Craft (today's price) opens Limestone Caves right away on the map (${JSON.stringify(s.bank)})`); }
await page.tap('.node.open'); await page.waitForTimeout(600);
check((await st()).screen === 'game', 'one tap on the newly opened board starts it');
await T(() => window.__deepcore.test.openMap()); await page.waitForTimeout(800);

// ---- missed days: the cave settles, but never past the layer's camp (its first board, once cleared) ----
await tt('setTool', 5, 90); await tt('markDone', upto(40 + 5)); await tt('setRun', { lastClear: '2000-01-01', day: '2000-01-02' }); await tt('tickDay'); await page.waitForTimeout(700); s = await st();
check(s.day.done.length === 41 && s.day.done.includes(40) && !s.day.done.includes(41), `a missed day in Magmastone drops you back to its camp (${s.day.done.length} boards kept)`);
await page.tap('#pOk');
await tt('markDone', upto(16 + 3)); await tt('setRun', { lastClear: '2000-01-01', day: '2000-01-02' }); await tt('tickDay'); await page.waitForTimeout(700); s = await st();
check(s.day.done.length === 17 && s.day.tool === 5, `in Slate Caverns a missed day drops you to its camp, tools kept (${s.day.done.length})`);
await page.tap('#pOk');
await tt('markDone', upto(5)); await tt('setRun', { lastClear: '2000-01-01', day: '2000-01-02' }); await tt('tickDay'); await page.waitForTimeout(700); s = await st();
check(s.day.done.length === 0, `the Forest has no camp: a missed day drops you to its start (${s.day.done.length})`);
await page.tap('#pOk');

// ---- no tool wear until backlog F-9: the Crust can't break the tools ----
await tt('setTool', 5, 1); await tt('markDone', upto(48)); await tt('start', 48); await page.waitForTimeout(2600);
check(await T(() => !document.getElementById('durChip') || document.getElementById('durChip').hidden), 'no tool meter on the board');
await T(() => { const t = window.__deepcore.test; for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) t.setCell(r, c, null); for (let c = 0; c < 6; c++) t.setCell(7, c, 'crust'); t.setCell(0, 0, 'crust'); t.setPieces([{ cells: [[0, 0], [0, 1]], h: 1, w: 2, mats: ['crust', 'crust'], sid: 1 }, null, null]); t.place(0, 7, 6); });
await page.waitForTimeout(2500); s = await st();
check(s.screen === 'game' && s.day.dur === 1, `mining crust rock doesn't wear or break the tools (${s.screen}, ${s.day.dur})`);

// ---- the Ancient Core ----
await tt('setTool', 5, 90); await tt('markDone', upto(56)); await tt('setRun', { scores: { 0: 500, 1: 900 } }); await tt('openMap'); await page.waitForTimeout(800);
check(await T(() => !!document.querySelector('.node.core')), 'after the Crust the Core appears on the map');
await page.tap('.node.core'); await page.waitForTimeout(600);
check(await T(() => !document.getElementById('core').hidden && !document.getElementById('corePiece').hidden), 'the Core opens with one piece to place');
await tt('placePortal'); await page.waitForTimeout(4800);
check(await T(() => !document.getElementById('coreTally').hidden && +document.getElementById('ctTotal').textContent.replace(/,/g, '') > 0), 'placing the portal leads to the final tally');
await page.fill('#ctName', 'Tester'); await page.tap('#ctDone'); await page.waitForTimeout(500);
check(await T(() => !document.getElementById('credits').hidden), 'the credits roll');
await page.tap('#credSkip'); await page.waitForTimeout(800); s = await st();
const life = await tt('life');
check(s.screen === 'home' && s.day.done.length === 0 && s.day.tool === 0 && await tt('fragments') === 1 && life.hall.length === 1 && life.hall[0].name === 'Tester', 'the descent starts again on the grass with one core fragment and the record kept');
check(await T(() => !document.getElementById('homeFrag').hidden), 'a small sign of the past life shows on the home screen');
await tt('fragments', 5); await tt('markDone', upto(56)); await tt('openCore'); await tt('placePortal'); await page.waitForTimeout(4800); await page.tap('#ctDone'); await page.waitForTimeout(300); await page.tap('#credSkip'); await page.waitForTimeout(500);
check(await tt('fragments') === 5, 'core fragments stop at five');

check(errors.length === 0, 'no page errors ' + errors.join(' | '));
await close();
console.log(fails.length ? `GATE TESTS FAILED (${fails.length})` : 'GATE TESTS PASSED'); if (fails.length) process.exitCode = 1;
