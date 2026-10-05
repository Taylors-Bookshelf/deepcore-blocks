// Balance test: bots of different skill play the real dealer. "mid" is calibrated to a typical player (under the v0.3.0
// dealer it needed 5-10 tries on boards 4-x and 5-x, matching a tester report). Slow (about a minute): run with `npm run test:balance`.
import { createRequire } from 'node:module';
import { runBoard, cfg, D } from '../tools/simlib.mjs';
let fails = 0; const check = (c, m) => { if (!c) { fails++; console.error('FAIL:', m); } else console.log('ok  :', m); };
cfg.bot = 'mid'; const RUNS = 40;
const attempts = zi => { let wins = 0, total = 0; for (let j = 0; j < 4; j++) for (let k = 0; k < RUNS; k++) { total++; if (runBoard(zi, j, 777 + zi * 1000 + j * 100 + k).win) wins++; } return total / Math.max(1, wins); };
const a = [0, 1, 2, 3, 4].map(attempts);
console.log('average tries per board by zone (typical player):', a.map(x => x.toFixed(2)).join('  '));
check(a[0] <= 1.1, 'forest boards are easy (<=1.1 tries)');
check(a[3] <= 2.0 && a[4] <= 2.4, 'zones 4 and 5 are winnable without 5-10 retries');
check((a[3] + a[4]) / 2 >= 1.25 && (a[3] + a[4]) / 2 <= 2.0, `zones 4-5 average ${((a[3] + a[4]) / 2).toFixed(2)} tries (target about 1.5)`);
check(a[0] <= a[1] + 0.05 && a[1] <= a[2] + 0.1 && a[2] <= a[3] + 0.1, 'difficulty rises zone by zone');
// resource supply: coal and copper over zone 2's first three boards (what a lantern gate asks for)
let coal = 0, copper = 0, n = 0; for (let k = 0; k < 40; k++) { let c = 0, cu = 0, ok = true; for (let j = 0; j < 3; j++) { let r; let t = 0; do { r = runBoard(1, j, 9000 + k * 10 + j + t * 500); t++; } while (!r.win && t < 8); c += r.got.coal || 0; cu += r.got.copper || 0; } coal += c; copper += cu; n++; }
console.log(`zone 2, boards 1-3: average coal ${(coal / n).toFixed(1)}, copper ${(copper / n).toFixed(1)} (two lanterns cost 40 coal + 20 copper)`);
check(coal / n > 20 && coal / n < 55 && copper / n > 12 && copper / n < 40, 'a lantern gate is reachable some of the time but usually needs a strip mine');
console.log(fails ? `BALANCE TESTS FAILED (${fails})` : 'BALANCE TESTS PASSED'); if (fails) process.exitCode = 1;
