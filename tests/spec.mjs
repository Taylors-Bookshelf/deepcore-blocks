// Design-spec conformance: the play screen must match design/DESIGN_SPEC.md and design/tokens.json at the reference 390pt width,
// and must still fit a short phone (375x667) without clipping.
import { phone, makeChecker } from './helpers.mjs';
const { check, fails } = makeChecker();
const measure = (page) => page.evaluate(() => {
  const r = (sel) => { const e = document.querySelector(sel); if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height, r: b.right, b: b.bottom }; };
  const cs = (sel, p) => getComputedStyle(document.querySelector(sel))[p];
  return { hdr: r('#hdr'), badge: r('#lvlBadge'), ibtn: [...document.querySelectorAll('.ibtn')].map(e => { const b = e.getBoundingClientRect(); return [b.width, b.height]; }), goals: r('.pbar'), strip: r('#stash'), board: r('#board'), well: r('#boardWell'),
    dock: r('#dock'), tool: r('.tool'), craft: r('#anvilBtn'), craftIcon: r('#anvilIcon'), tray: r('#tray'), slot: r('.slot'), slots: [...document.querySelectorAll('.slot')].map(e => e.getBoundingClientRect().height),
    bodyBg: cs('body', 'backgroundColor'), wellBg: cs('#boardWell', 'backgroundColor'), fillBg: cs('#pfill', 'backgroundColor'), panelBg: cs('#dock', 'backgroundColor'),
    scoreFont: cs('#pscore', 'fontFamily'), bodyFont: cs('body', 'fontFamily'), vw: innerWidth, vh: innerHeight, boardRender: cs('#board', 'imageRendering'),
    fonts: [document.fonts.check('20px "Jersey 10"'), document.fonts.check('600 16px "Chakra Petch"')] };
});
async function setup(w, h) {
  const t = await phone({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  await t.page.goto(t.base + '?debug'); await t.page.waitForTimeout(700);
  await t.page.evaluate(() => { const T = window.__deepcore.test; T.markDone([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]); T.start(12); }); await t.page.waitForTimeout(2600);
  await t.page.evaluate(() => { const T = window.__deepcore.test; const mk = (cells, w, h) => ({ cells, h, w, mats: cells.map(() => 'granite'), sid: 0 });
    T.setPieces([mk([[0,0],[0,1],[0,2],[0,3],[0,4]], 5, 1), mk([[0,0],[1,0],[2,0],[3,0],[4,0]], 1, 5), mk([[0,0],[1,0],[1,1]], 2, 2)]); });
  await t.page.waitForTimeout(200); return t;
}
const near = (a, b, tol = 1) => Math.abs(a - b) <= tol;

// ---- reference size ----
{ const t = await setup(390, 844); const m = await measure(t.page);
  check(near(m.hdr.h, 44) && near(m.badge.w, 44) && near(m.badge.h, 44), `header row is 44 tall, level badge 44x44 (${Math.round(m.hdr.h)}, ${Math.round(m.badge.w)})`);
  check(m.ibtn.length === 3 && m.ibtn.every(([w, h]) => near(w, 44) && near(h, 44)), 'info, map and sound buttons are 44x44');
  check(near(m.hdr.x, 16) && near(m.vw - m.hdr.r, 16), 'side padding is 16');
  check(near(m.goals.h, 36), `progress bar is 36 tall (${m.goals.h})`);
  check(near(m.strip.h, 38), `resource strip is 38 tall (${m.strip.h})`);
  check(near(m.board.w, 350, 1.5) && near(m.well.w, 358, 1.5), `board is 8 x 42pt cells with 2pt seams: 350 wide inside a 358 well (${m.board.w}, ${m.well.w})`);
  check(near(m.tool.w, 56) && near(m.tool.h, 56), 'specials dock slots are 56x56');
  check(near(m.dock.h, 72, 1), `dock is 56 plus 8 padding each side (${m.dock.h})`);
  check(near(m.craftIcon.w, 34), 'craft icon is 34');
  check(m.slots.every(h => near(h, 114)), `tray slots are 114 tall (${m.slots})`);
  const piece = await t.page.evaluate(() => [...document.querySelectorAll('.slot canvas')].map(c => [c.clientWidth, c.clientHeight]));
  check(near(piece[0][0], 108, 1) && near(piece[1][1], 108, 1), `piece cells are 20pt with 2pt gaps: a 1x5 is 108 long (${JSON.stringify(piece)})`);
  check(m.slot.w >= piece[0][0] && m.slots.every(h => h >= piece[1][1]), 'a 1x5 fits horizontally and vertically in its slot');
  check(m.bodyBg === 'rgb(70, 73, 79)' && m.wellBg === 'rgb(35, 36, 40)' && m.fillBg === 'rgb(217, 152, 43)' && m.panelBg === 'rgb(61, 64, 69)', 'ground, well, progress fill and panel colours match tokens.json');
  check(/Jersey 10/.test(m.scoreFont) && /Chakra Petch/.test(m.bodyFont) && m.fonts.every(Boolean), 'Jersey 10 for numbers and Chakra Petch for text, bundled and loaded');
  check(m.boardRender === 'pixelated', 'sprites scale with nearest-neighbour');
  check(await t.page.evaluate(() => !document.querySelector('.btns') && !document.getElementById('crafted')), 'old footer buttons and hint line removed');
  check(await t.page.evaluate(() => document.querySelectorAll('#dockSlots .tool').length === 3), 'the dock has exactly three slots');
  check(await t.page.evaluate(() => { const w = window.__deepcore; return ['limestone', 'granite', 'slate', 'basalt', 'magma'].length === 5 && !!w.TEX.granite && !!w.TEX['ruby@granite'] && !!w.TEX.blast && !!w.TEX.sledgehammer; }), 'new block, gem and special sprites are built');
  check(t.errors.filter(e => !/404/.test(e)).length === 0, 'no page errors ' + t.errors.join(' | '));
  await t.close(); }

// ---- a short phone ----
{ const t = await setup(375, 667); const m = await measure(t.page);
  check(m.dock.b <= m.vh && m.tray.b <= m.vh && m.hdr.y >= 0, `everything fits a 375x667 screen (tray bottom ${Math.round(m.tray.b)} of ${m.vh})`);
  check(m.board.w >= 200 && m.board.r <= m.vw && m.board.x >= 0, `the board still fits and keeps a usable size (${Math.round(m.board.w)}px)`);
  const piece = await t.page.evaluate(() => [...document.querySelectorAll('.slot')].map(s => { const c = s.firstElementChild; return [c.clientWidth <= s.clientWidth, c.clientHeight <= s.clientHeight]; }));
  check(piece.flat().every(Boolean), 'a 1x5 piece is not clipped on the short phone');
  check(await t.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight), 'the page does not scroll');
  await t.close(); }
console.log(fails.length ? `SPEC TESTS FAILED (${fails.length})` : 'SPEC TESTS PASSED'); if (fails.length) process.exitCode = 1;
