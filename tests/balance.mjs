// Balance test: bots play the real dealer. "mid" is calibrated to a typical player (under the v0.3.0 dealer it needed
// 5-10 tries on the deepest boards, matching a tester report). Run with `npm run test:balance`: both difficulties, every layer
// played side by side in its own process (tests/balance-part.mjs; I-38), so it takes about as long as the slowest layer.
// DIFF=casual or DIFF=challenging checks one. Whole-descent pacing (days, hours per layer) is in tools/run.mjs.
import { spawn } from 'node:child_process';
import { cpus } from 'node:os';
import { D } from '../tools/simlib.mjs';
const DIFFS = process.env.DIFF ? [process.env.DIFF] : ['casual', 'challenging'];
const layers = D.ZONES.map((z, i) => i).filter(i => !D.ZONES[i].core);
const jobs = DIFFS.flatMap(diff => [...layers.map(zi => ({ diff, what: 'tries', zi })), ...layers.filter(z => z < D.MAGMA_Z).map(zi => ({ diff, what: 'haul', zi }))]);
const run = j => new Promise((res, rej) => { let out = '', err = '';
  const p = spawn(process.execPath, ['tests/balance-part.mjs', j.what, String(j.zi)], { env: { ...process.env, DIFF: j.diff } });
  p.stdout.on('data', d => out += d); p.stderr.on('data', d => err += d);
  p.on('close', code => code === 0 ? res({ ...j, ...JSON.parse(out.trim().split('\n').pop()) }) : rej(new Error(`${j.diff} ${j.what} ${j.zi}: ${err}`))); });
// the slow deep layers first; as many at a time as there are cores to spare
const queue = [...jobs].sort((a, b) => b.zi - a.zi), results = []; const N = Math.max(2, cpus().length - 1);
await Promise.all(Array.from({ length: Math.min(N, queue.length) }, async () => { while (queue.length) results.push(await run(queue.shift())); }));

let fails = 0;
for (const diff of DIFFS) {
  const check = (c, m) => { if (!c) { fails++; console.error(`FAIL [${diff}]:`, m); } else console.log(`ok  [${diff}]:`, m); };
  const a = layers.map(zi => results.find(r => r.diff === diff && r.what === 'tries' && r.zi === zi).tries);
  console.log(`\n${diff}: average tries per board by layer (typical player):`, a.map(x => x.toFixed(2)).join('  '));
  check(a[0] <= 1.1, 'Forest boards are easy (<=1.1 tries)');
  check(a.every((x, i) => i === 0 || x >= a[i - 1] - 0.1), 'difficulty rises layer by layer');
  check(a[D.MAGMA_Z] <= 1.8, `Magmastone, the long layer, stays fair (${a[D.MAGMA_Z].toFixed(2)} tries)`);
  check(a[D.CRUST_Z] >= 1.4 && a[D.CRUST_Z] <= 3, `the Crust is hard but passable (${a[D.CRUST_Z].toFixed(2)} tries)`);
  // each layer gives part of what the next tools cost on its own boards; replays make up the rest
  let forestWood = 0;
  for (let z = 0; z < D.MAGMA_Z; z++) {
    const { got, runs } = results.find(r => r.diff === diff && r.what === 'haul' && r.zi === z), cost = D.TOOLS[z + 1].cost;
    // wood only grows in the Forest: later tools are paid from the wood you carried down, checked below
    const ratio = Math.min(...Object.entries(cost).filter(([m]) => m !== 'wood' || z === 0).map(([m, v]) => (got[m] || 0) / runs / v));
    if (z === 0) forestWood = (got.wood || 0) / runs;
    console.log(`${D.ZONES[z].name}: haul vs ${D.TOOLS[z + 1].name} = ${ratio.toFixed(2)}x  (${Object.entries(cost).map(([m, v]) => `${m} ${((got[m] || 0) / runs).toFixed(1)}/${v}`).join(', ')})`);
    // since v2.1.0 a layer's 8 boards cover roughly half to most of the next tools: a few replays make up the rest
    check(ratio >= .45 && ratio <= 1.2, `${D.ZONES[z].name}'s 8 boards give part of what ${D.TOOLS[z + 1].name} cost, the rest from replays (${ratio.toFixed(2)}x)`);
  }
  { const need = D.TOOLS.reduce((a, t) => a + (t.cost.wood || 0), 0); check(forestWood >= need * 1.3, `the Forest gives enough wood for every tool handle (${forestWood.toFixed(0)} for ${need})`); }
}
console.log(fails ? `\nBALANCE TESTS FAILED (${fails})` : '\nBALANCE TESTS PASSED'); if (fails) process.exitCode = 1;
