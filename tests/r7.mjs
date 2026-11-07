// Release 2.0.2: the tutorial rejects off-target drops (B-3), resource counts sit below their icons and cap at 99+ (B-4),
// the map and the board recover after the phone sleeps (B-1), and the Geode and side tunnels are gone (I-6, side tunnels).
import { readFile } from 'node:fs/promises';
import { phone, touchDrag, makeChecker } from './helpers.mjs';
const { check, fails } = makeChecker();

// ---- source: the Geode is gone for good ----
{ const src = (await Promise.all(['src/data.js', 'src/core.js', 'src/game.js', 'src/meta.js', 'src/maps.js', 'index.html'].map(f => readFile(new URL('../' + f, import.meta.url), 'utf8')))).join('\n');
  check(!/geode|prism stone|'prism'|\bprism:/i.test(src), 'no Geode (or its old name, Prism Stone) left anywhere in the game');
  check(!/STRIP_BASE|stripGoals|side tunnel/i.test(src), 'no side tunnels left in the game'); }

const { page, cdp, base, errors, close } = await phone();
await page.goto(base + '?debug'); await page.waitForTimeout(600);
const T = (fn, arg) => page.evaluate(fn, arg);
const tt = (f, ...a) => page.evaluate(([f, a]) => window.__deepcore.test[f](...a), [f, a]);

// ---- B-3: during the tutorial only the glowing spot takes a piece ----
await page.tap('#mapBtn'); await page.waitForTimeout(400); await page.tap('.node.open'); await page.waitForTimeout(3000);
check(await T(() => window.__deepcore.test.tut().active), 'board 1-1 starts the tutorial on a fresh profile');
const geo = () => T(() => { const b = document.getElementById('board').getBoundingClientRect(), s = [...document.querySelectorAll('.slot')].map(e => { const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
  return { b: [b.left, b.top], cell: b.width / 8, s }; });
const filled = () => T(() => window.__deepcore.test.state().grid.flat().filter(Boolean).length);
let g = await geo();
// the first tutorial piece is a 1x3 bar meant for the bottom row; drop it on row 2 instead (the piece rides above the finger)
await touchDrag(page, cdp, g.s[0], [g.b[0] + g.cell * 4.5, g.b[1] + g.cell * 3 + g.cell * 1.15]); await page.waitForTimeout(600);
check(await filled() === 0 && (await T(() => window.__deepcore.test.tut().placed)) === 0, 'an off-target drop is not placed and does not count as a tutorial step');
check(await T(() => /^Not there/.test(document.getElementById('tutorText').textContent) && !document.getElementById('tutor').hidden), 'the caption nudges the player back to the glowing spot');
check(await T(() => { const s = window.__deepcore.test.state(); return !!s.hintInfo && s.hintInfo.i === 0 && s.pieces[0]; }), 'the piece is back in the tray and still glowing');
// the right spot works
await tt('place', 0, 7, 0); await page.waitForTimeout(900);
check((await T(() => window.__deepcore.test.tut().placed)) === 1 && /bottom row/.test(await T(() => document.getElementById('tutorText').textContent)), 'the glowing spot takes the piece and the tutorial moves on');
await page.tap('#tutorSkip'); await page.waitForTimeout(200);
check(!(await T(() => window.__deepcore.test.tut().active)), 'Skip still ends the tutorial');

// ---- B-4: counts below the icons, 99+ above 99 ----
await tt('setBank', { coal: 150, bone: 7, wood: 99 }); await page.waitForTimeout(200);
const strip = await T(() => [...document.querySelectorAll('.si')].filter(e => !e.hidden).map(e => { const c = e.querySelector('canvas').getBoundingClientRect(), n = e.querySelector('.n').getBoundingClientRect(); return { k: e.dataset.k, n: e.querySelector('.n').textContent, icon: c.width, below: n.top >= c.bottom - 1, inside: n.bottom <= document.getElementById('stash').getBoundingClientRect().bottom + .5 }; }));
const by = Object.fromEntries(strip.map(o => [o.k, o]));
check(by.coal && by.coal.n === '99+' && by.wood.n === '99' && by.bone.n === '7', `counts above 99 read 99+ (${strip.map(o => o.k + ':' + o.n)})`);
check(strip.every(o => o.below && o.inside), 'every count sits below its icon, inside the strip');
check(strip.every(o => o.icon >= 22), `icons keep their full size (${strip.map(o => o.icon)})`);
check(await T(() => /150/.test(document.querySelector('.si[data-k="coal"]').title)), 'the real total is in the tooltip');

// ---- B-1: coming back from sleep resets an interrupted drag and the map keeps taking taps ----
const sleep = async () => { await T(() => { Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); }); await page.waitForTimeout(150);
  await T(() => { Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('focus')); }); await page.waitForTimeout(400); };
g = await geo();
await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: g.s[1][0], y: g.s[1][1], id: 1 }] });
await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: g.s[1][0], y: g.s[1][1] - 120, id: 1 }] }); await page.waitForTimeout(100);
await sleep();   // the phone sleeps mid-drag and the touch never ends
check(await T(() => document.getElementById('ghost').hidden && [...document.querySelectorAll('.slot canvas')].every(c => c.style.opacity === '')), 'waking up drops the half-finished drag and shows every tray piece');
await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
await page.tap('#pauseBtn'); await page.waitForTimeout(300); await page.tap('#pauseQuit'); await page.waitForTimeout(250); await page.tap('#askYes'); await page.waitForTimeout(500);
for (let k = 0; k < 3; k++) await sleep();
await T(() => document.querySelector('#mapNodes .node').click()); await page.waitForTimeout(300);
check(await T(() => !document.getElementById('nodeCard').hidden || window.__deepcore.test.state().screen === 'game'), 'after several sleeps the map still answers a tap on a board');
await T(() => { if (!document.getElementById('nodeCard').hidden) document.getElementById('ncClose').click(); else window.__deepcore.test.openMap(); }); await page.waitForTimeout(400);
const sc = await T(() => { const s = document.getElementById('mapScroll'); return getComputedStyle(s).overflowY; });
check(sc !== 'hidden', `the map can still scroll after waking (${sc})`);

check(errors.filter(e => !/404/.test(e)).length === 0, `no page errors (${errors.join(' | ')})`);
await close();
console.log(fails.length ? `R7 TESTS FAILED (${fails.length})` : 'R7 TESTS PASSED'); if (fails.length) process.exitCode = 1;
