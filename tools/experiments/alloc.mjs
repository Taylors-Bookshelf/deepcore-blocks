// Average resources a typical player (mid bot) mines per board today, by layer: with bonus ore, and without it.
// Basis for a fixed per-board resource allocation (I-15) that keeps today's tool pacing.
import { D, cfg, runBoard } from '../simlib.mjs';
cfg.bot = 'mid'; const RUNS = 30;
const measure = () => D.ZONES.map((z, zi) => { if (z.core) return null; const tot = {}; let n = 0;
  for (const j of [0, Math.floor(z.boards / 2), z.boards - 1]) for (let k = 0; k < RUNS; k++) { const r = runBoard(zi, j, 3000 + 1000 * zi + 100 * j + k); if (!r.win) continue; n++; Object.entries(r.got).forEach(([m, v]) => tot[m] = (tot[m] || 0) + v); }
  return Object.fromEntries(Object.entries(tot).map(([m, v]) => [m, +(v / n).toFixed(1)])); });
const withB = measure(); const keep = D.BONUS_LINES.slice(); D.BONUS_LINES.fill(0); const pctFn = D.bonusPct; const noB = measure();
D.ZONES.forEach((z, zi) => { if (z.core) return; console.log(z.name.padEnd(16), 'with bonus ore', JSON.stringify(withB[zi]), '\n'.padEnd(18), 'no line bonus  ', JSON.stringify(noB[zi])); });
