// Usage: node tools/sim.mjs [--runs 30] [--bot greedy|mid|casual|planner|random] [--zones 0,1,2,3,4] [--boards 0,1,2,3] [--mode 1] [--luck 0] [--seed 1] [--json]
//   dealer knobs: --old (v0.3.0 dealer) --waysFloor --waysExp --assistExp --mercy --mercyStart ; zone knobs: --zd "1:.28,.46;2:.5,.68" --zt "1:900" --zg "1:.2"
import { D, C, args, cfg, runBoard } from './simlib.mjs';
const RUNS = +(args.runs || 30), BOT = cfg.bot, MODE = cfg.mode, LUCK = cfg.luck;
const ZONES = (args.zones || '0,1,2,3,4').split(',').map(Number);
const BOARDS = (args.boards || '0,1,2,3').split(',').map(Number);
const t0 = Date.now(); const rows = [];
for (const zi of ZONES) for (const bj of BOARDS) {
  let wins = 0, moves = 0, deals = 0, fscore = 0, fails = 0; const res = {};
  for (let k = 0; k < RUNS; k++) { const r = runBoard(zi, bj, 1000 * zi + 100 * bj + k + (+args.seed || 0));
    moves += r.moves; deals += r.deals; if (r.win) { wins++; Object.entries(r.got).forEach(([a, b]) => res[a] = (res[a] || 0) + b); } else { fails++; fscore += r.score / r.target; } }
  const d = D.boardParams(zi, bj, MODE);
  rows.push({ board: `${zi + 1}-${bj + 1}`, tier: D.tierOf(d.d), d: +d.d.toFixed(2), target: d.target, winRate: +(wins / RUNS).toFixed(2), attempts: wins ? +(RUNS / wins).toFixed(2) : Infinity,
    moves: Math.round(moves / RUNS), deals: +(deals / RUNS).toFixed(1), failAt: fails ? Math.round(100 * fscore / fails) + '%' : '-', res: Object.fromEntries(Object.entries(res).map(([k, v]) => [k, +(v / Math.max(1, wins)).toFixed(1)])) });
}
if (args.json) console.log(JSON.stringify(rows));
else { console.log(`bot=${BOT} mode=${MODE} luck=${LUCK} runs=${RUNS}  (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  console.log('board tier   d    target win  attempts moves deals failAt  resources per cleared board');
  rows.forEach(r => console.log(`${r.board.padEnd(5)} ${r.tier.padEnd(6)} ${String(r.d).padEnd(4)} ${String(r.target).padEnd(6)} ${String(r.winRate).padEnd(4)} ${String(r.attempts).padEnd(8)} ${String(r.moves).padEnd(5)} ${String(r.deals).padEnd(5)} ${String(r.failAt).padEnd(6)} ${JSON.stringify(r.res)}`)); }
