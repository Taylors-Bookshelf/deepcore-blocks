// Release 3: the make-room sheet and destroy animation, pick-up and return animations, tap to skip.
import { phone, touchDrag, makeChecker } from './helpers.mjs';
const { check, fails } = makeChecker();
const { page, cdp, base, errors, close } = await phone();
await page.goto(base + '?debug'); await page.waitForTimeout(500);
const T = (fn, arg) => page.evaluate(fn, arg);
const tt = (f, ...a) => page.evaluate(([f, a]) => window.__deepcore.test[f](...a), [f, a]);
const st = () => T(() => { const s = window.__deepcore.test.state(); return { specials: s.specials, bank: s.bank, busy: s.busy }; });
await tt('start', 4); await page.waitForTimeout(2600);
await tt('give', { coal: 60, iron: 20, copper: 40, ruby: 80, gold: 10, emerald: 3, diamond: 3 });
for (const m of ['blast', 'sledgehammer', 'rescue']) await tt('addSpecial', m);

// ---- the sheet ----
await page.tap('#anvilBtn'); await page.waitForTimeout(250);
const rows = await page.$$('.recipe button.go');
const luckBtn = rows[3]; check(/Make room/.test(await luckBtn.textContent()) && !(await luckBtn.isDisabled()), 'with a full dock an affordable recipe offers "Make room"');
const bankBefore = (await st()).bank;
await luckBtn.click(); await page.waitForTimeout(400);
check(await T(() => !document.getElementById('sheetScrim').hidden), 'the sheet opens');
const txt = await T(() => document.getElementById('sheet').textContent);
check(/ALL 3 SLOTS FULL/.test(txt) && /Make room for a Luck Tonic/.test(txt) && /Pick a special to destroy\. Your ore is only spent if you go ahead\./.test(txt), 'sheet copy matches the spec');
check(await T(() => document.getElementById('shGo').disabled) && await T(() => document.querySelectorAll('.pick').length) === 3, 'DESTROY & CRAFT is disabled until a slot is picked; three tiles are offered');
await page.tap('#shCancel'); await page.waitForTimeout(200);
let s = await st(); check(await T(() => document.getElementById('sheetScrim').hidden) && s.specials.join() === 'blast,sledgehammer,rescue' && JSON.stringify(s.bank) === JSON.stringify(bankBefore), 'cancel changes nothing and spends nothing');
await luckBtn.click(); await page.waitForTimeout(300);
await page.tap('.pick[data-i="1"]'); await page.waitForTimeout(100);
check(await T(() => document.getElementById('shGo').disabled === false && document.querySelector('.pick.on').dataset.i === '1' && /DESTROY/.test(document.querySelector('.pickName.sel').textContent) && !!document.querySelector('.pick.on .crk')), 'picking a tile enables the button and marks it with a red ring, cracks and DESTROY');

// ---- the destroy animation ----
await page.tap('#shGo'); await page.waitForTimeout(150);
s = await st(); check(s.specials.join() === 'blast,luck,rescue' && s.bank.ruby === bankBefore.ruby - 12 && s.bank.diamond === bankBefore.diamond - 1, `ore is spent and the new special takes the destroyed slot (${s.specials})`);
check(await T(() => document.getElementById('sheetScrim').hidden && document.getElementById('anvil').hidden), 'the sheet and the anvil close');
check(await T(() => !!document.querySelector('#dockSlots .tool.anim .shake') && !!document.querySelector('#dockSlots .tool.anim .crk')), 'phase 1: the old special cracks and shakes');
await page.waitForTimeout(600);
check(await T(() => document.querySelectorAll('#dockSlots .shard').length === 4 && document.querySelectorAll('#dockSlots .dust').length === 4), 'phase 2: it shatters into four shards with dust');
await page.waitForTimeout(800);
check(await T(() => !!document.querySelector('#dockSlots .tool.anim canvas.land')), 'phase 3: the new special lands with a bounce');
await page.waitForTimeout(700);
check(await T(() => !document.querySelector('#dockSlots .anim') && document.querySelector('#dockSlots .tool:nth-child(2)').dataset.m === 'luck'), 'the dock settles with the Luck Tonic in the second slot');
check(await T(() => window.DCA.buffer.some(e => e.event === 'special_destroyed' && e.properties.destroyed === 'sledgehammer' && e.properties.crafted === 'luck')), 'analytics recorded the destroyed and crafted specials');
// destroyed-slot cannot be used while the animation runs
// ---- on the map the swap is immediate ----
await tt('start', 0); await page.waitForTimeout(2500);

// ---- pick-up and return animations ----
await tt('start', 4); await page.waitForTimeout(2600);
const geo = () => T(() => { const b = document.getElementById('board').getBoundingClientRect(); const s = [...document.querySelectorAll('.slot')].map(e => { const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }); return { cell: (b.width + 2) / 8, slots: s, b: [b.left, b.top, b.width] }; });
const scaleOf = () => T(() => { const m = /scale\(([\d.]+)\)/.exec(document.getElementById('ghost').style.transform); return m ? +m[1] : null; });
const g = await geo();
await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: g.slots[0][0], y: g.slots[0][1], id: 1 }] });
await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: g.slots[0][0], y: g.slots[0][1] - 10, id: 1 }] });
await page.waitForTimeout(10); const k0 = await scaleOf(); await page.waitForTimeout(300); const k1 = await scaleOf();
check(k0 !== null && k0 < 0.9 && k1 > 0.99, `picked-up piece grows from tray size to board size (scale ${k0 && k0.toFixed(2)} then ${k1})`);
// drop on an occupied spot -> flies back
await T(() => { const t = window.__deepcore.test; for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) t.setCell(r, c, 'stone'); });
await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: g.b[0] + g.cell * 3, y: g.b[1] + g.cell * 5, id: 1 }] });
await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.waitForTimeout(60);
check(await T(() => !document.getElementById('ghost').hidden), 'an invalid drop keeps the piece visible while it flies back');
await page.waitForTimeout(400);
check(await T(() => document.getElementById('ghost').hidden && document.querySelector('.slot canvas').style.opacity === '' && !!window.__deepcore.test.state().pieces[0]), 'then it is back in its slot, restored, and still unplaced');

// ---- tap to skip ----
await tt('start', 4); await page.waitForTimeout(2600);
const setup = () => T(() => { const t = window.__deepcore.test; for (let c = 0; c < 8; c++) t.setCell(7, c, null); for (let c = 0; c < 7; c++) t.setCell(7, c, c === 3 ? 'prism' : 'stone');
  t.setPieces([{ cells: [[0, 0]], h: 1, w: 1, mats: ['stone'], sid: 0 }, null, null]); window.__deepcore.test.place(0, 7, 7); });
const timeBusy = async (skipAt) => { const t0 = Date.now(); await setup(); if (skipAt) { await page.waitForTimeout(skipAt); await page.mouse.click(190, 400); }
  while ((await st()).busy && Date.now() - t0 < 8000) await page.waitForTimeout(40); return Date.now() - t0; };
const slow = await timeBusy(0); await page.waitForTimeout(600); await tt('start', 4); await page.waitForTimeout(2600);
const fast = await timeBusy(500);
check(slow > 1800, `a special celebration normally takes about ${slow}ms`);
check(fast < slow - 800, `tapping during it skips ahead (${fast}ms instead of ${slow}ms)`);
check(await T(() => document.getElementById('skipHint').hidden), 'the "Tap to skip" hint disappears');
check(errors.filter(e => !/404/.test(e)).length === 0, 'no page errors ' + errors.join(' | '));
await close();
console.log(fails.length ? `R3 TESTS FAILED (${fails.length})` : 'R3 TESTS PASSED'); if (fails.length) process.exitCode = 1;
