// How the adaptive mercy changes the number of tries on the hardest boards: plays each board until it is cleared, with the
// dealer easing up after repeated cave-ins, and reports the average tries and how often it took 4 or more.
// Usage: node tools/mercy.mjs [--runs 60] [--bot mid]
import { cfg, runBoard, D, args } from './simlib.mjs';
const RUNS = +(args.runs || 60); cfg.bot = args.bot || 'mid';
for (const adaptive of [false, true]) {
  console.log(adaptive ? '\nWith adaptive mercy:' : 'Without adaptive mercy:');
  for (const [z, j] of [[3, 3], [4, 2], [4, 3], [5, 0], [5, 2], [5, 3]]) {
    let total = 0, long = 0;
    for (let k = 0; k < RUNS; k++) { let t = 0, fails = 0; for (; t < 20; t++) { const r = runBoard(z, j, 12000 + k * 31 + t * 977 + z * 101, undefined, adaptive ? fails : 0); if (r.win) break; fails++; } total += t + 1; if (t >= 3) long++; }
    console.log(`  ${z + 1}-${j + 1}: ${(total / RUNS).toFixed(2)} tries on average, ${(100 * long / RUNS).toFixed(0)}% needed 4 or more`);
  }
}
