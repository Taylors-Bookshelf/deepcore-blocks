// Calibrates the star thresholds: plays boards past the clear with the typical-player bot and reports ore yield at the clear and afterwards.
// Usage: node tools/stars.mjs [--runs 60] [--bot mid]   (prints per-zone yield at clear, and how often each candidate threshold is reached before a cave-in)
import { D, args, runBoard } from './simlib.mjs';
const RUNS = +(args.runs || 60);
const q = (a, p) => { const b = [...a].sort((x, y) => x - y); return b[Math.min(b.length - 1, Math.floor(p * b.length))]; };
for (let zi = 0; zi < D.ZONES.length; zi++) { if (D.ZONES[zi].core) continue;
  const y0 = [], extra = [];
  for (let bj = 0; bj < Math.min(4, D.ZONES[zi].boards); bj++) for (let k = 0; k < RUNS; k++) {
    const r = runBoard(zi, bj, 5000 + 1000 * zi + 100 * bj + k, null, 0, { cap: 160 }); if (!r.atClear) continue; const sc = D.boardParams(zi, bj).target / D.ZONES[zi].target; y0.push(r.atClear.y / sc);
    extra.push({ y0: r.atClear.y / sc, tr: r.trace.map(([m, y]) => [m, y / sc]), died: r.died, m0: r.atClear.moves }); }
  const mean = y0.reduce((a, b) => a + b, 0) / y0.length;
  console.log(`${D.ZONES[zi].name} (scaled to its first board): yield at clear mean ${mean.toFixed(1)}  p10 ${q(y0, .1)} p50 ${q(y0, .5)} p90 ${q(y0, .9)}   (${y0.length} clears)`);
  // for candidate thresholds as multiples of the median: share of runs that reach it (at clear or by playing on) and average extra moves needed
  const med = q(y0, .5);
  for (const f of [1.0, 1.25, 1.5, 1.75, 2, 2.5]) { const T = Math.round(med * f); let hit = 0, atc = 0, mv = 0;
    extra.forEach(e => { if (e.y0 >= T) { hit++; atc++; } else { const h = e.tr.find(t => t[1] >= T); if (h) { hit++; mv += h[0] - e.m0; } } });
    console.log(`   threshold ${String(T).padStart(3)} (${f}x median): reached ${(100 * hit / extra.length).toFixed(0)}%  (${(100 * atc / extra.length).toFixed(0)}% already at the clear), ${(mv / Math.max(1, hit - atc)).toFixed(1)} extra moves when playing on`); }
}
