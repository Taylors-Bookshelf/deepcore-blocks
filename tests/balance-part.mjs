// One slice of the balance test (tests/balance.mjs runs these side by side, I-38): prints one JSON line.
// Usage: DIFF=casual|challenging node tests/balance-part.mjs tries <layer> | haul <layer>
import { runBoard, cfg, D } from '../tools/simlib.mjs';
cfg.bot = 'mid'; const RUNS = 24;
const [what, zs] = process.argv.slice(2), zi = +zs;
const picks = zi => { const n = D.ZONES[zi].boards; return [...new Set([0, Math.floor(n / 3), Math.floor(2 * n / 3), n - 1])]; };
if (what === 'tries') {   // average tries per board for the typical player
  let wins = 0, total = 0; for (const j of picks(zi)) for (let k = 0; k < RUNS; k++) { total++; if (runBoard(zi, j, 777 + zi * 1000 + j * 100 + k).win) wins++; }
  console.log(JSON.stringify({ what, zi, tries: total / Math.max(1, wins) }));
} else {   // what a layer's 8 boards haul, each retried until won (up to 8 tries), over 12 passes
  const got = {}; let runs = 0;
  for (let k = 0; k < 12; k++) { runs++; for (let j = 0; j < D.ZONES[zi].boards; j++) { let r, t = 0; do { r = runBoard(zi, j, 5000 + zi * 777 + k * 31 + j + t * 997); t++; } while (!r.win && t < 8); Object.entries(r.got).forEach(([m, v]) => got[m] = (got[m] || 0) + v); } }
  console.log(JSON.stringify({ what, zi, got, runs }));
}
