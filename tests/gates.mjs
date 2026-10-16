// The descent: the map digs open board by board; tools open each new layer; side tunnels; missed days and camps;
// Galaxy Alloy wear in the Crust; and the Ancient Core finale with its core fragment.
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
check(n.filter(c => c.includes('strip')).length === 1 && !n.some(c => c.includes('gate')), 'after board 1-3 the Forest side tunnel opens; board 1-4 needs no new tools');

// ---- tools open the next layer ----
await tt('markDone', upto(4)); await tt('buildMap'); n = await nodes();
check(n.filter(c => c.includes('gate')).length === 1, 'the first Limestone board waits for bone tools');
await page.tap('.node.gate'); await page.waitForTimeout(250);
check(/side tunnel/i.test(await T(() => document.getElementById('ncGo').textContent)), 'without the bones the gate points to the side tunnel');
await page.tap('#ncClose'); await page.tap('#mapCraft'); await page.waitForTimeout(250);
check(await T(() => /Bone tools/.test(document.getElementById('craftBody').textContent) && !/Blast/.test(document.getElementById('craftBody').textContent) && document.querySelector('#craftBody .recipe button.go').disabled), 'the Forge offers bone tools (and no specials), not yet affordable');
await page.tap('#craftClose');
await tt('setBank', { bone: 12, wood: 6, coal: 3 }); await tt('buildMap'); await page.tap('.node.gate'); await page.waitForTimeout(250);
check(/Forge Bone tools/.test(await T(() => document.getElementById('ncGo').textContent)), 'with 12 bone and 6 wood the gate offers to forge bone tools');
await page.tap('#ncGo'); await page.waitForTimeout(600); let s = await st(); n = await nodes();
check(s.day.tool === 1 && !s.bank.bone && !s.bank.wood && s.bank.coal === 3 && !n.some(c => c.includes('gate')), 'one tap forges bone tools and opens Limestone Caves');

// ---- side tunnel ----
await tt('setTool', 0); await tt('setBank', { bone: 4 }); await tt('markDone', upto(3)); await tt('buildMap');
await T(() => document.querySelector('.node.strip').click()); await page.waitForTimeout(250);
check(/Gather/.test(await T(() => document.getElementById('ncGoals').textContent)), 'the side tunnel card lists what to gather');
await page.tap('#ncGo'); await page.waitForTimeout(2600);
const g = await tt('goals'); check(g && g.bone === 8 && g.wood === 6, `the side tunnel asks for what the next tools still lack (${JSON.stringify(g)})`);
check(await T(() => !!document.querySelector('.stripGoals .goal')) && await T(() => !document.getElementById('pfill')), 'goal chips replace the score bar');
await tt('giveHand', { bone: 8, wood: 6 }); await T(() => window.__deepcore.test.setScore(240));
check(await tt('stripMet') === true, 'the side tunnel is done when the haul meets the goals');
await tt('completeStrip'); await page.waitForTimeout(2400); s = await st();
check(s.day.strip[0] === true && s.bank.bone === 12 && s.bank.wood === 6 && s.day.done.length === 3, `it banks the haul and is not one of the descent's boards (${JSON.stringify(s.bank)})`);
check(await T(() => !!document.querySelector('.node.strip.done')), 'a mined side tunnel is marked until tomorrow');

// ---- missed days: the cave settles, but never past a Magmastone camp ----
await tt('setTool', 5, 90); await tt('markDone', upto(28 + 14)); await tt('setRun', { camp: 10, lastClear: '2000-01-01', day: '2000-01-02' }); await tt('tickDay'); await page.waitForTimeout(700); s = await st();
check(s.day.done.length === 38 && s.day.done.includes(37) && !s.day.done.includes(38), `a missed day in Magmastone drops you back to your last camp (${s.day.done.length} boards kept)`);
await page.tap('#pOk');
await tt('markDone', upto(13)); await tt('setRun', { camp: 0, lastClear: '2000-01-01', day: '2000-01-02' }); await tt('tickDay'); await page.waitForTimeout(700); s = await st();
check(s.day.done.length === 10 && s.day.tool === 5, `in Slate Caverns a missed day drops you to the start of the layer, tools kept (${s.day.done.length})`);
await page.tap('#pOk');

// ---- the Forge mends Galaxy Alloy with prism ore ----
await tt('setTool', 5, 50); await tt('setBank', { prismore: 3 }); await tt('mend'); s = await st();
check(Math.round(s.day.dur) === 86 && !s.bank.prismore, `three prism ore mend the tools from 50% to 86% (${s.day.dur})`);

// ---- the Crust can break the tools, sending you back to the start of Magmastone ----
await tt('setTool', 5, 1); await tt('markDone', upto(58)); await tt('start', 58); await page.waitForTimeout(2600);
check(await T(() => !document.getElementById('durChip').hidden && /TOOLS/.test(document.getElementById('durChip').textContent)), 'the tool meter shows in the Crust');
await T(() => { const t = window.__deepcore.test; for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) t.setCell(r, c, null); for (let c = 0; c < 6; c++) t.setCell(7, c, 'crust'); t.setCell(0, 0, 'crust'); t.setPieces([{ cells: [[0, 0], [0, 1]], h: 1, w: 2, mats: ['crust', 'crust'], sid: 1 }, null, null]); t.place(0, 7, 6); });
await page.waitForTimeout(4500); s = await st();
check(s.screen === 'map' && await tt('frontier') === 28 && s.day.dur === 60, `worn-out tools shatter: back to the start of Magmastone at 60% (${await tt('frontier')})`);
check(await T(() => !document.getElementById('prospector').hidden && /shattered/.test(document.getElementById('pTitle').textContent)), 'a message explains what happened');
await page.tap('#pOk');

// ---- the Ancient Core ----
await tt('setTool', 5, 90); await tt('markDone', upto(61)); await tt('openMap'); await page.waitForTimeout(800);
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
await tt('fragments', 5); await tt('markDone', upto(61)); await tt('openCore'); await tt('placePortal'); await page.waitForTimeout(4800); await page.tap('#ctDone'); await page.waitForTimeout(300); await page.tap('#credSkip'); await page.waitForTimeout(500);
check(await tt('fragments') === 5, 'core fragments stop at five');

check(errors.length === 0, 'no page errors ' + errors.join(' | '));
await close();
console.log(fails.length ? `GATE TESTS FAILED (${fails.length})` : 'GATE TESTS PASSED'); if (fails.length) process.exitCode = 1;
