// Runs every test suite, a few at a time (I-38), and prints each one's time. Usage: node tests/run.mjs [--jobs 4] [suite ...]
// A suite's own output is shown only when it fails. Exit code 1 if any suite fails.
import { spawn } from 'node:child_process';
import { cpus } from 'node:os';
// slowest first, so the long ones overlap the short ones
const SUITES = ['rules', 'r6', 'r1', 'r4', 'soak', 'r5', 'r3', 'dock', 'smoke', 'gates', 'flow', 'spec', 'touch', 'playtest2', 'r7', 'r8', 'r9', 'r10', 'maps'];
const argv = process.argv.slice(2); const ji = argv.indexOf('--jobs');
const JOBS = ji >= 0 ? +argv[ji + 1] : Math.max(2, Math.min(6, cpus().length - 2));
const pick = argv.filter((a, i) => !a.startsWith('--') && argv[i - 1] !== '--jobs');
const list = pick.length ? pick : SUITES;
const t0 = Date.now(), results = []; let next = 0;
const run = name => new Promise(res => { const s = Date.now(); let out = '';
  const p = spawn(process.execPath, [`tests/${name}.mjs`], { env: process.env });
  p.stdout.on('data', d => out += d); p.stderr.on('data', d => out += d);
  p.on('close', code => { const r = { name, code, secs: (Date.now() - s) / 1000, out }; results.push(r);
    console.log(`${code === 0 ? 'pass' : 'FAIL'}  ${name.padEnd(10)} ${r.secs.toFixed(1).padStart(5)}s`); res(); }); });
const worker = async () => { while (next < list.length) await run(list[next++]); };
await Promise.all(Array.from({ length: Math.min(JOBS, list.length) }, worker));
const failed = results.filter(r => r.code !== 0);
for (const f of failed) { console.log(`\n----- ${f.name} output -----`); console.log(f.out.split('\n').filter(l => !l.startsWith('ok  :')).join('\n')); }
console.log(`\n${results.length - failed.length}/${results.length} suites passed in ${((Date.now() - t0) / 1000).toFixed(0)}s (${JOBS} at a time)`);
process.exit(failed.length ? 1 : 0);
