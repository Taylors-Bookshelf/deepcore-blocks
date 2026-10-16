// Release 6 hardening: offline play, storage failures, damaged saves, the midnight rollover, colour contrast, touch targets,
// accessible names, every daily twist, and that effects drain and frames stay smooth.
import { createRequire } from 'node:module';
import { phone, makeChecker } from './helpers.mjs';
const require = createRequire(import.meta.url);
const D = require('../src/data.js');
const { check, fails } = makeChecker();

// ---- colour contrast (WCAG): text colours from the design tokens against the surfaces they sit on ----
const lum = h => { const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4)); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + .05) / (y + .05); };
const pairs = [['white on ground', '#ffffff', '#46494f', 4.5], ['muted on ground', '#d6d8dd', '#46494f', 4.5], ['white on panel', '#ffffff', '#3d4045', 4.5], ['muted on panel', '#d6d8dd', '#3d4045', 4.5], ['lamp on panel', '#ffcf5c', '#3d4045', 4.5],
  ['lamp on slot (CRAFT)', '#ffcf5c', '#35383d', 4.5], ['dark text on lamp button', '#2b1505', '#ffcf5c', 4.5], ['dark text on hard chip', '#2b1505', '#ffa766', 4.5], ['dark text on easy chip', '#2b1505', '#9ad38c', 4.5],
  ['dark text on expert chip', '#2b1505', '#ff8a7a', 4.5], ['white on danger button', '#ffffff', '#b8392a', 4.5], ['danger text on panel', '#ff8a7a', '#3d4045', 4.5], ['white on inset', '#ffffff', '#2f3136', 4.5], ['green plus on panel', '#8bf0a0', '#3d4045', 4.5]];
for (const [n, a, b, min] of pairs) check(ratio(a, b) >= min, `${n}: contrast ${ratio(a, b).toFixed(1)}:1 (needs ${min})`);

// ---- every daily twist on a real board, effects drain, smooth frames ----
const modDays = D.MODIFIERS.map(m => { for (let i = 0; i < 400; i++) { const d = `2027-${String(1 + Math.floor(i / 28) % 12).padStart(2, '0')}-${String(1 + i % 28).padStart(2, '0')}`; if (D.modifierFor(d).id === m.id) return [m.id, d]; } });
const play = async (page, n) => { for (let k = 0; k < n * 3; k++) { const r = await page.evaluate(() => { const T = window.__deepcore.test, s = T.state(); if (s.screen !== 'game') return 'map'; if (s.busy || document.getElementById('sheetScrim').hidden === false) return 'busy'; if (s.over) return 'over';
    for (let i = 0; i < 3; i++) { const pc = s.pieces && s.pieces[i]; if (!pc) continue; const o = []; for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if (T.fits(pc, r, c)) o.push([r, c]); if (o.length) { const q = o[Math.floor(Math.random() * o.length)]; T.place(i, q[0], q[1]); return 'ok'; } } return 'stuck'; });
  if (r === 'busy') { await page.waitForTimeout(150); continue; } if (r !== 'ok') return r; await page.waitForTimeout(25); } return 'done'; };
{ const t = await phone(); await t.page.goto(t.base + '?debug'); await t.page.waitForTimeout(600);
  await t.page.evaluate(() => { const T = window.__deepcore.test; T.markDone(Array.from({ length: 24 }, (_, i) => i)); });
  for (const [id, day] of modDays) { await t.page.evaluate(d => window.__deepcore.test.previewDay(d), day); await t.page.evaluate(() => window.__deepcore.test.start(15)); await t.page.waitForTimeout(2400); await play(t.page, 12); await t.page.waitForTimeout(1500); }
  check(t.errors.filter(e => !/404/.test(e)).length === 0, `all ${modDays.length} daily twists play through a deep board without errors ${t.errors.join(' | ')}`);
  // effects drain after a long burst of play
  await t.page.evaluate(() => { const T = window.__deepcore.test; T.start(8); }); await t.page.waitForTimeout(2400); await play(t.page, 70); await t.page.waitForTimeout(4000);
  const fx = await t.page.evaluate(() => window.__deepcore.test.fx());
  check(fx.fxList < 5 && fx.fxParts < 80 && fx.particles < 80, `effects drain after heavy play (${JSON.stringify(fx)})`);
  // frame time with a crowded board of ore and gems
  await t.page.evaluate(() => { const T = window.__deepcore.test; T.start(20); }); await t.page.waitForTimeout(2400);
  await t.page.evaluate(() => { const T = window.__deepcore.test; const m = ['coal', 'iron', 'copper', 'gold', 'ruby', 'emerald', 'diamond', 'granite']; for (let r = 0; r < 7; r++) for (let c = 0; c < 8; c++) T.setCell(r, c, m[(r + c) % 8]); });
  const fps = await t.page.evaluate(() => new Promise(res => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 1500) requestAnimationFrame(f); else res(n / ((performance.now() - t0) / 1000)); }; requestAnimationFrame(f); }));
  check(fps > 20, `a board full of ore and gems still animates smoothly in a slow headless browser (${fps.toFixed(0)} fps)`);
  // touch targets and accessible names on the play screen
  const ui = await t.page.evaluate(() => { const bad = [], noName = []; document.querySelectorAll('button').forEach(b => { const r = b.getBoundingClientRect(); if (!r.width || !r.height || b.closest('[hidden]')) return; const vis = getComputedStyle(b).visibility !== 'hidden';
      if (vis && Math.min(r.width, r.height) < 36) bad.push((b.id || b.textContent.trim().slice(0, 14)) + ':' + Math.round(Math.min(r.width, r.height)));
      const name = (b.getAttribute('aria-label') || b.textContent || b.title || '').trim(); if (vis && !name) noName.push(b.id || b.className); }); return { bad, noName }; });
  check(ui.bad.length === 0, `every visible button is at least 36px (${ui.bad})`); check(ui.noName.length === 0, `every visible button has an accessible name (${ui.noName})`);
  const dlg = await t.page.evaluate(() => [...document.querySelectorAll('[role="dialog"]')].every(d => d.getAttribute('aria-label') || d.getAttribute('aria-labelledby')));
  check(dlg, 'every dialog has a label');
  await t.close(); }

// ---- display settings must not break the layout ----
{ const t = await phone(); await t.page.goto(t.base + '?debug'); await t.page.waitForTimeout(500);
  await t.page.evaluate(() => { const T = window.__deepcore.test; T.start(4); }); await t.page.waitForTimeout(2400);
  const w0 = await t.page.evaluate(() => document.getElementById('board').getBoundingClientRect().width);
  await t.page.evaluate(() => { document.documentElement.classList.add('large', 'reduce'); }); await t.page.waitForTimeout(300);
  const w1 = await t.page.evaluate(() => [document.getElementById('board').getBoundingClientRect().width, document.documentElement.scrollWidth <= innerWidth]);
  check(w0 === w1[0] && w1[1], 'larger text and reduced motion leave the board layout alone');
  await t.close(); }

// ---- damaged and unavailable storage ----
{ const t = await phone(); await t.ctx.addInitScript(() => { localStorage.clear(); localStorage.setItem('deepcore-profile', '{bad'); localStorage.setItem('deepcore-day', '{"day":5,"done":"x"}'); localStorage.setItem('deepcore-board', '{"grid":[[1]],"pieces":"nope","idx":3,"day":"x"}'); localStorage.setItem('deepcore-life', 'null'); localStorage.setItem('deepcore-settings', '[]'); localStorage.setItem('deepcore-schema', '3'); });
  await t.page.goto(t.base + '?debug'); await t.page.waitForTimeout(800);
  check(await t.page.evaluate(() => !document.getElementById('home').hidden), 'the game starts normally with every save damaged');
  await t.page.tap('#mapBtn'); await t.page.waitForTimeout(400); await t.page.tap('.node.open'); await t.page.tap('#ncGo'); await t.page.waitForTimeout(2500);
  const r = await play(t.page, 8); check(t.errors.filter(e => !/404/.test(e)).length === 0 && r !== 'map', `and a board can be played (${t.errors.join(' | ')})`);
  await t.close(); }
{ const t = await phone(); await t.page.addInitScript(() => { Storage.prototype.setItem = () => { throw new Error('QuotaExceededError'); }; });
  await t.page.goto(t.base + '?debug'); await t.page.waitForTimeout(800); await t.page.tap('#mapBtn'); await t.page.waitForTimeout(400); await t.page.tap('.node.open'); await t.page.tap('#ncGo'); await t.page.waitForTimeout(2500);
  const r = await play(t.page, 8); check(t.errors.filter(e => !/404|Quota/.test(e)).length === 0, `the game plays even when the browser refuses to save (${t.errors.join(' | ')})`);
  await t.close(); }
{ const t = await phone(); await t.ctx.addInitScript(() => { if (!localStorage.getItem('seeded')) { localStorage.setItem('seeded', '1'); localStorage.setItem('deepcore-day', JSON.stringify({ day: '2099-01-01', done: [0], scores: {}, prospector: false })); localStorage.setItem('deepcore-board', JSON.stringify({ day: '2099-01-01', idx: 2, grid: Array.from({ length: 7 }, () => Array(7).fill(null)), pieces: [null, null, null], score: 5, moves: 3 })); } });
  await t.page.goto(t.base + '?debug'); await t.page.waitForTimeout(700);
  check(await t.page.evaluate(() => document.getElementById('contBtn').hidden), 'a saved board with the wrong shape is dropped instead of offered');
  await t.close(); }

// ---- the day can end while the app is open ----
{ const t = await phone(); await t.page.goto(t.base + '?debug'); await t.page.waitForTimeout(600);
  await t.page.tap('#mapBtn'); await t.page.waitForTimeout(400);
  // cleared a board yesterday: the new day keeps the progress
  const today = await t.page.evaluate(() => window.__deepcore.test.state().dayState.day);
  const [y, m, d] = today.split('-').map(Number), yest = new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);
  await t.page.evaluate((yest) => { const T = window.__deepcore.test; T.markDone([0, 1]); T.setRun({ day: yest, lastClear: yest }); T.tickDay(); }, yest); await t.page.waitForTimeout(500);
  let s = await t.page.evaluate(() => { const st = window.__deepcore.test.state().dayState; return [st.day, st.done.length, document.querySelectorAll('#mapNodes .node').length]; });
  check(s[0] === today && s[1] === 2 && s[2] === 3, `after midnight the map moves to the new day and keeps your depth (${s})`);
  // missed a whole day: the Forest boards cave back in
  await t.page.evaluate(() => { const T = window.__deepcore.test; T.setRun({ day: '2000-01-02', lastClear: '2000-01-01' }); T.tickDay(); }); await t.page.waitForTimeout(800);
  s = await t.page.evaluate(() => { const st = window.__deepcore.test.state().dayState; return [st.day, st.done.length, !document.getElementById('prospector').hidden && /missed a day/.test(document.getElementById('pText').textContent)]; });
  check(s[1] === 0 && s[2], `a missed day drops you back to the start of the layer, with a message (${s})`);
  await t.close(); }

// ---- offline ----
{ const t = await phone(); await t.page.goto(t.base); await t.page.waitForTimeout(800);
  await t.page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await t.page.waitForTimeout(1500);
  const cached = await t.page.evaluate(async () => { const keys = await caches.keys(); const c = await caches.open(keys[0]); return (await c.keys()).length; });
  check(cached >= 20, `the service worker has cached the whole game (${cached} files)`);
  await t.ctx.setOffline(true); await t.page.reload(); await t.page.waitForTimeout(1200);
  const off = await t.page.evaluate(() => ({ home: !document.getElementById('home').hidden, fonts: document.fonts.check('20px "Jersey 10"'), canv: !!document.getElementById('homeStrip') }));
  check(off.home && off.fonts && off.canv, 'with no network the game still loads, with its fonts');
  await t.page.tap('#mapBtn'); await t.page.waitForTimeout(500); await t.page.tap('.node.open'); await t.page.tap('#ncGo'); await t.page.waitForTimeout(2800);
  check(await t.page.evaluate(() => document.querySelectorAll('#tray .slot canvas:not([hidden])').length) === 3, 'and a board can be started offline');
  await t.close(); }
console.log(fails.length ? `R6 TESTS FAILED (${fails.length})` : 'R6 TESTS PASSED'); if (fails.length) process.exitCode = 1;
