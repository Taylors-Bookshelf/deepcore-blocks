// mid-bot yield percentiles at the clear, per layer (count-based stars), to place the 1-star line
import { D, cfg, runBoard } from '../simlib.mjs';
cfg.bot = 'mid'; const q = (a, p) => { const b = [...a].sort((x, y) => x - y); return b[Math.min(b.length - 1, Math.floor(p * b.length))]; };
for (const zi of [4, 5, 6]) { const z = D.ZONES[zi], ys = [];
  for (const j of [0, Math.floor(z.boards / 2), z.boards - 1]) for (let k = 0; k < 40; k++) { const r = runBoard(zi, j, 9000 + 1000 * zi + 100 * j + k); if (r.win) ys.push(D.yieldOf(r.got, false)); }
  console.log(z.name, 'n', ys.length, 'p5/p10/p20/p50', [.05, .1, .2, .5].map(p => q(ys, p)).join('/'), ' zero-ore runs', Math.round(100 * ys.filter(y => !y).length / ys.length) + '%'); }
