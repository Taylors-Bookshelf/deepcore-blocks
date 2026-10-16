// Balance test: bots play the real dealer. "mid" is calibrated to a typical player (under the v0.3.0 dealer it needed
// 5-10 tries on the deepest boards, matching a tester report). Slow (a few minutes): run with `npm run test:balance`.
// Whole-descent pacing (days, hours per layer, Crust breaks) is in tools/run.mjs.
import { runBoard, cfg, D } from '../tools/simlib.mjs';
let fails = 0; const check = (c, m) => { if (!c) { fails++; console.error('FAIL:', m); } else console.log('ok  :', m); };
cfg.bot = 'mid'; const RUNS = 24; let forestWood = 0;
const layers = D.ZONES.map((z, i) => i).filter(i => !D.ZONES[i].core);
const picks = zi => { const n = D.ZONES[zi].boards; return [...new Set([0, Math.floor(n / 3), Math.floor(2 * n / 3), n - 1])]; };
const attempts = zi => { let wins = 0, total = 0; for (const j of picks(zi)) for (let k = 0; k < RUNS; k++) { total++; if (runBoard(zi, j, 777 + zi * 1000 + j * 100 + k).win) wins++; } return total / Math.max(1, wins); };
const a = layers.map(attempts);
console.log('average tries per board by layer (typical player):', a.map(x => x.toFixed(2)).join('  '));
check(a[0] <= 1.1, 'Forest boards are easy (<=1.1 tries)');
check(a.every((x, i) => i === 0 || x >= a[i - 1] - 0.1), 'difficulty rises layer by layer');
check(a[D.MAGMA_Z] <= 1.8, `Magmastone, the long layer, stays fair (${a[D.MAGMA_Z].toFixed(2)} tries)`);
check(a[D.CRUST_Z] >= 1.4 && a[D.CRUST_Z] <= 3, `the Crust is hard but passable (${a[D.CRUST_Z].toFixed(2)} tries)`);
// each layer should give roughly what the next tools cost: often enough, sometimes needing the side tunnel
for (let z = 0; z < D.MAGMA_Z; z++) {
  const cost = D.TOOLS[z + 1].cost, got = {}; let runs = 0;
  for (let k = 0; k < 12; k++) { runs++; for (let j = 0; j < D.ZONES[z].boards; j++) { let r, t = 0; do { r = runBoard(z, j, 5000 + z * 777 + k * 31 + j + t * 997); t++; } while (!r.win && t < 8); Object.entries(r.got).forEach(([m, v]) => got[m] = (got[m] || 0) + v); } }
  // wood only grows in the Forest: later tools are paid from the wood you carried down, checked below
  const ratio = Math.min(...Object.entries(cost).filter(([m]) => m !== 'wood' || z === 0).map(([m, v]) => (got[m] || 0) / runs / v));
  if (z === 0) forestWood = (got.wood || 0) / runs;
  console.log(`${D.ZONES[z].name}: haul vs ${D.TOOLS[z + 1].name} = ${ratio.toFixed(2)}x  (${Object.entries(cost).map(([m, v]) => `${m} ${((got[m] || 0) / runs).toFixed(1)}/${v}`).join(', ')})`);
  check(ratio >= .55 && ratio <= 2.6, `${D.ZONES[z].name} gives about what ${D.TOOLS[z + 1].name} cost (${ratio.toFixed(2)}x)`);
}
{ const need = D.TOOLS.reduce((a, t) => a + (t.cost.wood || 0), 0); check(forestWood >= need * 1.3, `the Forest gives enough wood for every tool handle (${forestWood.toFixed(0)} for ${need})`); }
console.log(fails ? `BALANCE TESTS FAILED (${fails})` : 'BALANCE TESTS PASSED'); if (fails) process.exitCode = 1;
