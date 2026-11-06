// Average resources per cleared board, by layer, for the typical player (mid bot) under the current rules: the basis for tool costs.
import { D, cfg, runBoard } from '../simlib.mjs';
cfg.bot = 'mid';
D.ZONES.forEach((z, zi) => { if (z.core) return; const tot = {}; let n = 0;
  for (let j = 0; j < z.boards; j++) for (let k = 0; k < 12; k++) { const r = runBoard(zi, j, 7700 + 1000 * zi + 50 * j + k); if (!r.win) continue; n++; Object.entries(r.got).forEach(([m, v]) => tot[m] = (tot[m] || 0) + v); }
  const per = Object.fromEntries(Object.entries(tot).filter(([m]) => D.STAR_ORES.includes(m) || m === 'wood').map(([m, v]) => [m, +(v / n).toFixed(2)]));
  console.log(z.name.padEnd(16), JSON.stringify(per)); });
