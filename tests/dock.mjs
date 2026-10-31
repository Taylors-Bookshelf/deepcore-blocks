// Specials dock: three slots in any mix, crafting fills them in order, a full dock blocks crafting, dragging a special onto a piece uses it,
// Luck is tapped, Rescue is used automatically.
import { phone, touchDrag, makeChecker } from './helpers.mjs';
const { check, fails } = makeChecker();
const { page, cdp, base, errors, close } = await phone();
await page.goto(base + '?debug'); await page.waitForTimeout(500);
const tt = (f, ...a) => page.evaluate(([f, a]) => window.__deepcore.test[f](...a), [f, a]);
const st = () => page.evaluate(() => { const s = window.__deepcore.test.state(); return { specials: s.specials, bank: s.bank, over: s.over, pieces: s.pieces, luck: s.luck }; });
await tt('start', 4); await page.waitForTimeout(2600);
await tt('give', { coal: 60, iron: 20, copper: 40, ruby: 80, gold: 10, emerald: 3, diamond: 3, bone: 20 });

// craft in order, duplicates allowed, the fourth is refused
await page.tap('#anvilBtn'); await page.waitForTimeout(200);
const craft = async (i) => { await (await page.$$('.recipe button.go'))[i].click(); await page.waitForTimeout(120); };
await craft(0); await craft(0); await craft(2);
let s = await st(); check(s.specials.join() === 'blast,blast,rescue', `crafting fills the dock in order and allows duplicates (${s.specials})`);
const labels = await page.$$eval('.recipe button.go', e => e.map(b => b.textContent + (b.disabled ? '!' : '')));
check(labels.every(l => l === 'Make room'), `with three specials held every affordable craft button says "Make room" (${labels})`);
s = await st(); check(s.specials.length === 3, 'the dock never holds more than three');
await page.tap('#anvilClose');
check(await page.evaluate(() => document.querySelectorAll('#dockSlots .tool:not(.empty)').length) === 3 && !(await page.evaluate(() => document.getElementById('anvilBtn').classList.contains('afford'))), 'three dock tiles are shown and the CRAFT glow turns off when full');
check(await page.evaluate(() => !!document.querySelector('#dockSlots .tool[data-m="blast"] .spark')), 'the Blast Charge has its fuse spark');

// drag a Blast Charge straight onto the board: it blows up the 3x3 patch under the finger
const geo = () => page.evaluate(() => { const b = document.getElementById('board').getBoundingClientRect(); const c = (e) => { const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
  return { left: b.left, top: b.top, cell: (b.width + 2) / 8, tool: [...document.querySelectorAll('#dockSlots .tool')].map(c), slot: [...document.querySelectorAll('.slot')].map(c) }; });
await page.evaluate(() => { const t = window.__deepcore.test; for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) t.setCell(r, c, null); for (let r = 2; r <= 4; r++) for (let c = 2; c <= 4; c++) t.setCell(r, c, 'stone'); t.setCell(7, 7, 'stone'); });
let g = await geo();
// a drop outside the board does nothing and keeps the special
await touchDrag(page, cdp, g.tool[0], [g.slot[1][0], g.slot[1][1] + g.cell * 1.2]); await page.waitForTimeout(300);
s = await st(); check(s.specials.join() === 'blast,blast,rescue', `a Blast Charge dropped off the board is kept (${s.specials})`);
g = await geo(); const target = [g.left + 3.5 * g.cell, g.top + 3.5 * g.cell + g.cell * 1.2];
await touchDrag(page, cdp, g.tool[0], target); await page.waitForTimeout(3500);
s = await st(); const grid = await page.evaluate(() => window.__deepcore.test.state().grid);
check(s.specials.join() === 'blast,rescue', `dropping a Blast Charge on the board uses it and frees the slot (${s.specials})`);
check([2, 3, 4].every(r => [2, 3, 4].every(c => !grid[r][c])) && grid[7][7], 'it clears exactly the 3x3 patch under the finger');
check(await page.evaluate(() => document.querySelectorAll('#dockSlots .tool:not(.empty)').length) === 2, 'the dock redraws with two tiles');

// Luck is tapped from its slot; Rescue is automatic
await tt('give', { ruby: 30, bone: 8 });
await page.tap('#anvilBtn'); await page.waitForTimeout(200); await craft(3); await page.tap('#anvilClose'); await page.waitForTimeout(200);
s = await st(); check(s.specials.join() === 'blast,rescue,luck', 'Luck Tonic joins the dock');
await page.tap('#dockSlots .tool[data-m="luck"]'); await page.waitForTimeout(1500);
s = await st(); check(s.luck === 7 && s.specials.join() === 'blast,rescue', 'tapping the Luck Tonic drinks it and frees its slot');
const before = (await st()).specials.length;
await tt('gameOver'); await page.waitForTimeout(1500); s = await st();
check(s.specials.join() === 'blast' && !s.over, `a cave-in uses the Rescue Potion automatically (${s.specials})`);
check(errors.filter(e => !/404/.test(e)).length === 0, 'no page errors ' + errors.join(' | '));
await close();
console.log(fails.length ? `DOCK TESTS FAILED (${fails.length})` : 'DOCK TESTS PASSED'); if (fails.length) process.exitCode = 1;
