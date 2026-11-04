// Star spread under the current rules (v2.0.4: stars from a board's points against STAR_LINES): for each layer, how a bot's
// boards split over cave-in / 0 / 1 / 2 / 3 stars, and its median points. The simlib bots ignore scoring (they play for board
// shape), so they read as a typical player; for score-aware and skilled bots, and to set the lines, use
// tools/experiments/score2.mjs --even 1.
// Usage: node tools/stars.mjs [--runs 40] [--bot mid]
import { D, args, cfg, runBoard } from './simlib.mjs';
const RUNS = +(args.runs || 40); cfg.bot = args.bot || 'mid';
const q = (a, p) => { const b = [...a].sort((x, y) => x - y); return b.length ? b[Math.min(b.length - 1, Math.floor(p * b.length))] : 0; };
const pct = (n, d) => `${Math.round(100 * n / Math.max(1, d))}%`.padStart(4);
console.log(`bot ${cfg.bot}, ${RUNS} runs on 3 boards per layer`);
D.ZONES.forEach((z, zi) => { if (z.core) return;
  const js = [...new Set([0, Math.floor(z.boards / 2), z.boards - 1])], R = [];
  for (const j of js) for (let k = 0; k < RUNS; k++) R.push(runBoard(zi, j, 5000 + 1000 * zi + 100 * j + k));
  const done = R.filter(r => r.completed), n = [0, 1, 2, 3].map(s => done.filter(r => r.stars === s).length);
  console.log(`${z.name.padEnd(16)} ${D.DEALS[zi]} deals  lines ${D.STAR_LINES[zi].join('/')}  cave-in ${pct(R.length - done.length, R.length)}  0★ ${pct(n[0], R.length)}  1★ ${pct(n[1], R.length)}  2★ ${pct(n[2], R.length)}  3★ ${pct(n[3], R.length)}  median points ${q(done.map(r => r.score), .5)}`);
});
