// Specials dock: three slots in any mix, crafting fills them in order, a full dock blocks crafting, dragging a special onto a piece uses it,
// Luck is tapped, Rescue is used automatically.
import { phone, touchDrag, makeChecker } from './helpers.mjs';
const { check, fails } = makeChecker();
const { page, cdp, base, errors, close } = await phone();
await page.goto(base + '?debug'); await page.waitForTimeout(500);
const tt = (f, ...a) => page.evaluate(([f, a]) => window.__deepcore.test[f](...a), [f, a]);
const st = () => page.evaluate(() => { const s = window.__deepcore.test.state(); return { specials: s.specials, bank: s.bank, over: s.over, pieces: s.pieces, luck: s.luck }; });
await tt('start', 4); await page.waitForTimeout(2600);
await tt('give', { coal: 60, iron: 20, copper: 40, ruby: 80, gold: 10, emerald: 3, diamond: 3 });

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

// drag a Blast Charge from slot 1 onto the first tray piece
const geo = () => page.evaluate(() => { const b = document.getElementById('board').getBoundingClientRect(); const c = (e) => { const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
  return { cell: (b.width + 2) / 8, tool: [...document.querySelectorAll('#dockSlots .tool')].map(c), slot: [...document.querySelectorAll('.slot')].map(c) }; });
let g = await geo();
await touchDrag(page, cdp, g.tool[0], [g.slot[0][0], g.slot[0][1] + g.cell * 1.2]); await page.waitForTimeout(400);
s = await st(); check(s.specials.join() === 'blast,rescue', `dropping a Blast Charge on a piece uses it and frees the slot (${s.specials})`);
check(s.pieces[0].mats.includes('blast'), 'the piece now carries the Blast Charge');
check(await page.evaluate(() => document.querySelectorAll('#dockSlots .tool:not(.empty)').length) === 2, 'the dock redraws with two tiles');
// a piece takes only one special
g = await geo(); await touchDrag(page, cdp, g.tool[0], [g.slot[0][0], g.slot[0][1] + g.cell * 1.2]); await page.waitForTimeout(300);
s = await st(); check(s.specials.join() === 'blast,rescue', 'a second special on the same piece is refused and kept');

// Luck is tapped from its slot; Rescue is automatic
await tt('give', { ruby: 30, diamond: 2 });
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
