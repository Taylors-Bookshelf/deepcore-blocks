// Rules and dealer tests (no browser): piece variety and symmetry, Luck Tonic effect, recipes and economy tables.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const D = require('../src/data.js'), C = require('../src/core.js');
const { prefill, bitsOf } = await import('../tools/simlib.mjs');
let fails = 0; const check = (c, m) => { if (!c) { fails++; console.error('FAIL:', m); } else console.log('ok  :', m); };

// ---- shapes ----
const strs = C.SHAPE_STRS;
check(strs.includes('#../.#./..#') && strs.includes('..#/.#./#..'), 'both 3-block diagonals exist');
check(strs.includes('#./.#') && strs.includes('.#/#.'), 'both 2-block diagonals exist');
check(C.SHAPES.every(s => C.FAMSIZE[s.fam] >= 1), 'every shape belongs to a family');

// ---- dealing from many different boards ----
const rnd = D.rng(4242);
const boards = []; for (let i = 0; i < 40; i++) { const zi = i % 5; const def = D.boardParams(zi, i % 4, 1); const g = prefill(def, rnd); boards.push({ def, bits: bitsOf(g) }); }
const counts = {}, famCount = {}; let pieces = 0, lShare = 0; const N = 2400;
for (let k = 0; k < N; k++) { const b = boards[k % boards.length]; const set = C.chooseSet(b.bits[0], b.bits[1], b.def.d, { rnd });
  set.forEach(s => { counts[s.id] = (counts[s.id] || 0) + 1; famCount[s.fam] = (famCount[s.fam] || 0) + 1; pieces++; if (['#../#../###','..#/..#/###','###/#../#..','###/..#/..#'].includes(strs[s.id])) lShare++; }); }
// mirror/rotation variants of the same piece should appear about equally often
let worst = 0, worstName = '';
for (const fam of Object.keys(C.FAMSIZE)) { const members = C.SHAPES.filter(s => s.fam === fam); if (members.length < 2) continue;
  const cs = members.map(s => counts[s.id] || 0); const tot = cs.reduce((a, b) => a + b, 0); if (tot < 60) continue;
  const ratio = Math.max(...cs) / Math.max(1, Math.min(...cs)); if (ratio > worst) { worst = ratio; worstName = members.map(m => strs[m.id]).join(' '); } }
check(worst < 1.9, `orientation variants are balanced (worst max/min ratio ${worst.toFixed(2)} for ${worstName})`);
const diagTotal = (counts[strs.indexOf('#./.#')] || 0) + (counts[strs.indexOf('.#/#.')] || 0), diag3 = (counts[strs.indexOf('#../.#./..#')] || 0) + (counts[strs.indexOf('..#/.#./#..')] || 0);
const dr = (a, b) => Math.max(a, b) / Math.max(1, Math.min(a, b));
check(dr(counts[strs.indexOf('#./.#')] || 0, counts[strs.indexOf('.#/#.')] || 0) < 1.8, '2-block diagonals appear on both diagonals about equally');
check(dr(counts[strs.indexOf('#../.#./..#')] || 0, counts[strs.indexOf('..#/.#./#..')] || 0) < 1.8, '3-block diagonals appear on both diagonals about equally');
check(diagTotal > 0 && diag3 > 0, `diagonals are dealt (${diagTotal} two-block, ${diag3} three-block of ${pieces} pieces)`);
check(lShare / pieces < 0.1, `big 3x3 L pieces are not over-represented (${(100 * lShare / pieces).toFixed(1)}% of pieces)`);
const noDupFam = (() => { let dup = 0, sets = 0; for (let k = 0; k < 300; k++) { const b = boards[k % boards.length]; const set = C.chooseSet(b.bits[0], b.bits[1], b.def.d, { rnd }); sets++; if (new Set(set.map(s => s.fam)).size < 3) dup++; } return dup / sets; })();
check(noDupFam < 0.2, `three pieces of one set are rarely the same family (${(100 * noDupFam).toFixed(0)}% of sets repeat a family)`);

// ---- every dealt set is solvable (a cave-in is always the player's fault) ----
let unsolvable = 0; for (let k = 0; k < 200; k++) { const b = boards[k % boards.length]; const set = C.chooseSet(b.bits[0], b.bits[1], b.def.d, { rnd }); if (!C.solveCount(b.bits[0], b.bits[1], set, 1, 40000, false, false).count) unsolvable++; }
check(unsolvable === 0, `all 200 dealt sets can be placed (${unsolvable} unsolvable)`);

// ---- Luck Tonic: on a half-built board, sets lean toward clearing lines ----
const midBoards = []; for (let i = 0; i < 40; i++) { const g = Array(64).fill(null);
  for (let n = 0; n < 3; n++) { const r = Math.floor(rnd() * 8); let put = 0; for (let c = 0; c < 8 && put < 5 + (n % 2); c++) { const cc = Math.floor(rnd() * 8); if (!g[r * 8 + cc]) { g[r * 8 + cc] = 'stone'; put++; } } }
  for (let n = 0; n < 8; n++) g[Math.floor(rnd() * 64)] = 'stone';
  const [lo, hi] = bitsOf(g); if (!C.hasLockedHole(lo, hi)) midBoards.push({ def: { ...D.boardParams(4, 1, 1), d: .85 }, bits: [lo, hi] }); }
const quality = (b, set) => { const r = C.solveCount(b.bits[0], b.bits[1], set, 60, 12000, false, false); return r.maxLines + (r.allClear ? 3 : 0); };
let normal = 0, lucky = 0; const M = 240;
for (let k = 0; k < M; k++) { const b = midBoards[k % midBoards.length]; normal += quality(b, C.chooseSet(b.bits[0], b.bits[1], b.def.d, { rnd })); lucky += quality(b, C.chooseSet(b.bits[0], b.bits[1], b.def.d, { rnd, luck: 1 })); }
check(lucky >= normal * 1.1, `Luck Tonic sets offer bigger clears (average ${(lucky / M).toFixed(2)} vs ${(normal / M).toFixed(2)} without)`);

// ---- recipes and economy tables ----
const rc = Object.fromEntries(D.RECIPES.map(r => [r.m, r.cost]));
check(rc.rescue.cinnabar === 20 && rc.rescue.emerald === 1 && Object.keys(rc.rescue).length === 2, 'Rescue Potion costs 20 cinnabar + 1 emerald');
check(rc.luck && rc.luck.cinnabar === 12, 'Luck Tonic is craftable with 12 cinnabar');
check(!D.RECIPES.some(r => r.cost.lapis || r.cost.quartz) && !D.ORES.lapis && !D.ORES.quartz, 'lapis and quartz are gone');
check(D.STASH_KEYS[0] === 'wood', 'wood is a stash resource');
check(D.SPECIAL_RATE.Medium === .01 && D.SPECIAL_RATE.Hard === .02 && D.SPECIAL_RATE.Expert === .03, 'special rates are 1% / 2% / 3%');
console.log(fails ? `RULES TESTS FAILED (${fails})` : 'RULES TESTS PASSED'); if (fails) process.exitCode = 1;
