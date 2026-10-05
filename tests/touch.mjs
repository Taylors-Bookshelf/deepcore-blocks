// Phone-style tests: layout at 390px wide, header, fixed tray piece size, real touch drags, sound, info panel.
import { phone, touchDrag, makeChecker } from './helpers.mjs';
const { check, fails } = makeChecker();
const { page, cdp, base, errors, close } = await phone();
await page.goto(base + '?debug'); await page.waitForTimeout(600);
check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'page is not wider than the phone screen');
check(await page.evaluate(() => { const b = document.getElementById('mapBtn').getBoundingClientRect(); return b.left >= 0 && b.right <= innerWidth && b.bottom <= innerHeight; }), 'home buttons are on screen');
await page.tap('#mapBtn'); await page.waitForTimeout(300); await page.tap('.node.open'); await page.tap('#ncGo'); await page.waitForTimeout(2600);

// header: Today | (info, anvil) | Board, and no separate big score
const hdr = await page.evaluate(() => { const r = id => document.getElementById(id).getBoundingClientRect(); const t = document.querySelector('header .stat').getBoundingClientRect(), b = document.querySelector('header .stat.right').getBoundingClientRect();
  return { todayR: t.right, boardL: b.left, infoL: r('infoBtn').left, infoR: r('infoBtn').right, anvilL: r('anvilBtn').left, anvilR: r('anvilBtn').right, anvilH: r('anvilBtn').height, score: !!document.getElementById('score') }; });
check(hdr.infoL > hdr.todayR && hdr.anvilR < hdr.boardL && hdr.infoR < hdr.anvilL, 'info and anvil sit between Today and Board');
check(hdr.anvilH >= 60, `anvil button is large (${Math.round(hdr.anvilH)}px tall)`);
check(!hdr.score, 'redundant big score removed');
check(await page.evaluate(() => /\d+ \/ \d+/.test(document.getElementById('ptxt').textContent)), 'progress bar shows score / target');

// tray: no boxes, one fixed piece size even with a 1x5 bar; sizes never change when a piece is placed
await page.evaluate(() => { const t = window.__deepcore.test; const mk = (cells, w, h) => ({ cells, h, w, mats: cells.map(() => 'dirt'), sid: 0 });
  t.setPieces([mk([[0,0],[0,1],[0,2],[0,3],[0,4]], 5, 1), mk([[0,0],[0,1]], 2, 1), mk([[0,0],[1,0],[1,1]], 2, 2)]); });
const px = () => page.evaluate(() => [...document.querySelectorAll('.slot')].map(s => { const c = s.firstElementChild; const sp = window.__deepcore.test.state().pieces[+s.dataset.i]; return c.hidden || !sp ? null : { cs: Math.round(c.clientWidth / sp.w), w: c.clientWidth, slotW: s.clientWidth }; }));
const s0 = await px();
check(new Set(s0.filter(Boolean).map(o => o.cs)).size === 1, `all tray pieces share one cell size (${JSON.stringify(s0.map(o => o && o.cs))})`);
check(s0[0].w <= s0[0].slotW, '1x5 bar fits inside its slot at full size');
check(await page.evaluate(() => getComputedStyle(document.querySelector('.slot')).backgroundColor === 'rgba(0, 0, 0, 0)'), 'tray slots have no background box');

// real touch drag: the piece rides ABOVE the finger
const geo = () => page.evaluate(() => { const b = document.getElementById('board').getBoundingClientRect(); const s = [...document.querySelectorAll('.slot')].map(e => { const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }); return { b: [b.left, b.top, b.width], s, cell: b.width / 8 }; });
let g = await geo();
const fingerY = g.b[1] + g.cell * 5 + g.cell * 1.15;       // finger below row 4's bottom edge -> bar's bottom row should be row 4 (0-based)
await touchDrag(page, cdp, g.s[0], [g.b[0] + g.cell * 4, fingerY]); await page.waitForTimeout(500);
const placed = await page.evaluate(() => { const gr = window.__deepcore.test.state().grid; const rows = []; gr.forEach((row, r) => { if (row.some(Boolean)) rows.push(r); }); return rows; });
check(placed.length === 1 && placed[0] === 4, `bar landed on the row above the fingertip (row ${placed})`);
const s1 = await px();
check(s1[1] && s1[1].cs === s0[1].cs && s1[2].cs === s0[2].cs, 'remaining pieces did not resize after placing the bar');

// a drop on an occupied spot is caught as an invalid drop, and repeated tries are flagged
g = await geo();
for (let k = 0; k < 2; k++) await touchDrag(page, cdp, g.s[1], [g.b[0] + g.cell * 4, fingerY]);
await page.waitForTimeout(300);
const ev = await page.evaluate(() => window.DCA.buffer.map(e => e.event));
check(ev.includes('piece_place'), 'analytics saw piece_place'); check(ev.includes('drop_invalid'), 'analytics saw drop_invalid'); check(ev.includes('repeat_attempt'), 'analytics flagged the repeated attempt');

// sound: the audio engine starts after a tap, and the icon toggles and remembers
check(await page.evaluate(() => window.__deepcore.test.audioState()) === 'running', 'audio context is running after touches');
check(await page.getAttribute('#sound', 'aria-pressed') === 'true', 'sound starts on');
await page.tap('#sound'); check(await page.getAttribute('#sound', 'aria-pressed') === 'false', 'sound icon toggles off');
await page.reload(); await page.waitForTimeout(500);
check(await page.getAttribute('#sound', 'aria-pressed') === 'false', 'sound-off survives a reload');
await page.tap('#mapBtn'); await page.waitForTimeout(300); await page.tap('.node.open'); await page.tap('#ncGo'); await page.waitForTimeout(2400);
await page.tap('#sound'); check(await page.getAttribute('#sound', 'aria-pressed') === 'true', 'sound icon toggles back on');

// info panel
await page.tap('#infoBtn'); await page.waitForTimeout(200);
check(await page.evaluate(() => document.querySelectorAll('#infoTabs button').length) === 4, 'info panel has four sections');
for (let i = 1; i <= 4; i++) { await page.tap(`#infoTabs button:nth-child(${i})`); await page.waitForTimeout(80); }
await page.tap('#infoTabs button:nth-child(2)');
const txt = await page.evaluate(() => document.getElementById('infoBody').textContent);
check(/Coal/.test(txt) && /Common/.test(txt) && /Unusual/.test(txt) && /Rare/.test(txt) && /points each/.test(txt), 'resources section lists names, rarity and points');
await page.tap('#infoClose');

// difficulty naming
await page.evaluate(() => window.__deepcore.test.start(19)); await page.waitForTimeout(2500);
check(await page.evaluate(() => document.getElementById('tier').textContent) === 'Expert', 'top difficulty is named Expert');
check(!(await page.content()).includes('Brutal'), 'no "Brutal" left in the page');

check(errors.length === 0, 'no page errors ' + errors.join(' | '));
await close();
console.log(fails.length ? `TOUCH TESTS FAILED (${fails.length})` : 'TOUCH TESTS PASSED');
if (fails.length) process.exitCode = 1;
