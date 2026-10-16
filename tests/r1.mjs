// Release 1 tests: six zones, ruby, no difficulty modes, practice runs, idle battery, adaptive mercy, multi-line bonus, all-clear hunting, save migration.
import { createRequire } from 'node:module';
import { phone, makeChecker } from './helpers.mjs';
const require = createRequire(import.meta.url);
const D = require('../src/data.js'), C = require('../src/core.js');
const { check, fails } = makeChecker();

// ---- data ----
check(D.ZONES.map(z => z.name).join() === 'The Forest,Limestone Caves,Slate Caverns,Granite Halls,Basalt Depths,Magmastone,The Crust,Ancient Core', 'the descent: seven layers and the Core, in the agreed order');
check(D.BOARD_COUNT === 62 && D.STRIP_BASE === 62 && D.ZONES.map(z => z.boards).join() === '4,6,6,6,6,30,3,1', '62 boards (4, 6, 6, 6, 6, 30, 3 and the Core); side tunnels are numbered after them');
check(D.ZONES[2].rock === 'deep' && D.ZONES[3].rock === 'granite' && D.BASE_MATS.includes('granite') && D.BASE_MATS.includes('crust'), 'slate comes before granite; the crust is a real block');
{ const Z = D.ZONES.filter(z => !z.core); check(Z.every((z, i) => i === 0 || z.d[0] > Z[i - 1].d[0]) && Z.every((z, i) => i === 0 || z.target >= Z[i - 1].target), 'difficulty and targets rise layer by layer'); }
check(!D.MODES && !D.ORES.cinnabar && D.ORES.ruby && D.DROPS.ruby[0] === 'Ruby' && !D.RECIPES.some(r => r.cost.cinnabar), 'no difficulty modes; cinnabar is now ruby');
check(D.STASH_KEYS.includes('ruby') && D.GEM_KEYS.join() === 'ruby,emerald,diamond', 'ruby sits with the gems');
check(D.lineScore(1, 1) === 10 && D.lineScore(2, 1) > 2 * D.lineScore(1, 1) + 25 && D.lineScore(3, 1) > D.lineScore(2, 1) * 2 && D.lineName(2) === 'Double!' && D.lineName(3) === 'Triple!' && D.lineName(4) === 'Quad!', 'doubles, triples and quads pay extra and are named');
for (const z of D.ZONES) check(Object.keys(z.mixes[0]).every(k => D.BASE_MATS.includes(k)), `${z.name}: every block in its mix exists`);

// ---- dealer: all-clear hunting and mercy tilt ----
const { prefill, bitsOf } = await import('../tools/simlib.mjs');
const rnd = D.rng(99);
// a lone row with a two-cell gap: one '##' (or two singles) would wipe the board
const empties = []; for (let i = 0; i < 40; i++) { const g = Array(64).fill(null); const r = Math.floor(rnd() * 8), gap = Math.floor(rnd() * 7); for (let c = 0; c < 8; c++) if (c !== gap && c !== gap + 1) g[r * 8 + c] = 'stone'; const [lo, hi] = bitsOf(g); empties.push({ lo, hi }); }
const wipes = (pull) => { C.TUNE.acPull = pull; let n = 0; for (let k = 0; k < 160; k++) { const b = empties[k % empties.length]; const set = C.chooseSet(b.lo, b.hi, .6, { rnd }); if (C.solveCount(b.lo, b.hi, set, 30, 12000, false, false).allClear) n++; } return n; };
const base = C.TUNE.acPull, hunt = wipes(base), none = wipes(0); C.TUNE.acPull = base;
check(hunt > none, `a nearly empty board is dealt a set that can wipe it more often (${hunt}/160 vs ${none}/160)`);
{ // tilt makes sets easier
  const b = prefill(D.boardParams(5, 2), rnd); for (let n = 0; n < 24; n++) b[Math.floor(rnd() * 64)] = 'stone'; const [lo, hi] = bitsOf(b); let plain = 0, tilted = 0;
  const ways = (set) => C.solveCount(lo, hi, set, 400, 20000, false, false).count;
  for (let k = 0; k < 60; k++) { plain += ways(C.chooseSet(lo, hi, .95, { rnd })); tilted += ways(C.chooseSet(lo, hi, .95, { rnd, tilt: .75 })); }
  check(tilted > plain, `after repeated cave-ins the dealt sets have more ways to be placed (${(tilted / 60).toFixed(0)} vs ${(plain / 60).toFixed(0)})`); }

// ---- the game in a phone browser ----
const { page, base: url, errors, close, ctx } = await phone();
await page.goto(url + '?debug'); await page.waitForTimeout(500);
const T = (fn, arg) => page.evaluate(fn, arg);
const tt = (f, ...a) => page.evaluate(([f, a]) => window.__deepcore.test[f](...a), [f, a]);
const st = () => T(() => { const s = window.__deepcore.test.state(); return { bank: s.bank, hand: s.hand, score: s.score, day: s.dayState, over: s.over }; });

// settings: no difficulty slider
await page.tap('#settingsBtn'); await page.waitForTimeout(150);
check(await T(() => !document.getElementById('modeRange') && !document.querySelector('.stops')), 'settings has no difficulty slider any more');
await page.tap('#settingsBack');

// idle battery: nothing is redrawn while sitting on the map
await page.tap('#mapBtn'); await page.waitForTimeout(500);
const clears = await T(() => new Promise(res => { let n = 0; const o = CanvasRenderingContext2D.prototype.clearRect; CanvasRenderingContext2D.prototype.clearRect = function (...a) { n++; return o.apply(this, a); }; setTimeout(() => { CanvasRenderingContext2D.prototype.clearRect = o; res(n); }, 1000); }));
check(clears <= 4, `no drawing loop while idle on the map (${clears} canvas clears in a second)`);
await tt('markDone', [0]); await tt('start', 0); await page.waitForTimeout(2600);
const live = await T(() => new Promise(res => { let n = 0; const o = CanvasRenderingContext2D.prototype.clearRect; CanvasRenderingContext2D.prototype.clearRect = function (...a) { n++; return o.apply(this, a); }; setTimeout(() => { CanvasRenderingContext2D.prototype.clearRect = o; res(n); }, 500); }));
check(live > 20, `the board still animates (${live} clears in half a second)`);

// replaying a cleared board gives ore again (the stash lasts the whole descent)
check(!(await tt('practice')), 'replaying a cleared board is not a practice run any more');
await tt('setBank', { coal: 3 });
await T(() => { const t = window.__deepcore.test; for (let c = 0; c < 8; c++) t.setCell(7, c, null); ['coal', 'coal', 'copper', 'log', 'log', 'copper'].forEach((m, c) => t.setCell(7, c, m)); t.setPieces([{ cells: [[0, 0], [0, 1]], h: 1, w: 2, mats: ['stone', 'stone'], sid: 1 }, null, null]); t.place(0, 7, 6); });
await page.waitForTimeout(2300); let s = await st();
check(s.hand.coal >= 2 && s.hand.copper >= 2, `a replay collects ore (hand ${JSON.stringify(s.hand)})`);

// mercy: cave-ins are counted per board and ease the dealer
await tt('start', 2); await page.waitForTimeout(2200);
check((await tt('tilt')) === 0, 'no mercy on a first attempt');
for (let k = 0; k < 3; k++) { await tt('gameOver'); await page.waitForTimeout(300); await tt('start', 2); await page.waitForTimeout(2200); }
s = await st(); check(s.day.fails[2] === 3 && (await tt('tilt')) > .6, `three cave-ins are counted and the dealer eases up (tilt ${await tt('tilt')})`);

// multi-line bonus shows its name
await tt('start', 4); await page.waitForTimeout(2200);
await T(() => { const t = window.__deepcore.test; for (let r = 6; r < 8; r++) for (let c = 0; c < 8; c++) t.setCell(r, c, c < 2 && r === 7 ? null : (c === 0 && r === 6 ? null : 'stone')); t.setCell(6, 0, null); t.setCell(6, 1, null); t.setCell(7, 0, null); t.setCell(7, 1, null);
  t.setPieces([{ cells: [[0, 0], [0, 1], [1, 0], [1, 1]], h: 2, w: 2, mats: ['stone', 'stone', 'stone', 'stone'], sid: 9 }, null, null]); t.place(0, 6, 0); });
await page.waitForTimeout(600);
check(/Double/.test(await T(() => document.getElementById('combo').textContent)), 'a two-line clear announces "Double!"');
await page.waitForTimeout(2500);

// ruby: the new gem exists on every rock and in the stash
check(await T(() => ['stone', 'granite', 'deep', 'ember', 'obsidian'].every(r => !!window.__deepcore.TEX['ruby@' + r]) && !!window.__deepcore.ITEM.ruby), 'ruby is drawn on every rock and as a stash icon');

// save migration from the old format
await ctx.addInitScript(() => { localStorage.clear(); localStorage.setItem('deepcore-profile', JSON.stringify({ bank: { cinnabar: 7, coal: 3 }, crafted: { jackhammer: 1 }, prospector: 1 })); localStorage.setItem('deepcore-day', JSON.stringify({ day: '2099-01-01', done: [0, 1, 2], scores: {}, prospector: false })); localStorage.setItem('deepcore-mode', '2'); });
await page.reload(); await page.waitForTimeout(700);
s = await st(); const mig = await T(() => ({ schema: localStorage.getItem('deepcore-schema'), mode: localStorage.getItem('deepcore-mode'), specials: window.__deepcore.test.state().specials }));
check(Object.keys(s.bank).length === 0 && !s.bank.cinnabar, `an old save starts a fresh descent: empty stash (${JSON.stringify(s.bank)})`);
check(mig.specials.length === 0 && mig.schema === '4' && mig.mode === null && s.day.done.length === 0 && s.day.tool === 0, 'specials cleared, schema 4 stamped, the run starts on the grass with branch tools');
check(s.day.done.length === 0, "today's map restarts because the boards were renumbered");
check(errors.length === 0, 'no page errors ' + errors.join(' | '));
await close();
console.log(fails.length ? `R1 TESTS FAILED (${fails.length})` : 'R1 TESTS PASSED'); if (fails.length) process.exitCode = 1;
