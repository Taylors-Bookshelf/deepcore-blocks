// F-10 (v2.2.0): when in a descent can a player afford the brewing table and the second slots?
// Plays whole descents with tool purchases only (no specials: the thrifty player), records the stash after every cleared board,
// and reports, for each candidate cost, the share of play time at which it is first affordable on top of the next tool's cost.
// Usage: node tools/experiments/workshop.mjs [--runs 8] [--bot mid] [--try '{"name":{cost},...}'] (extra candidates) [--noreserve 1] (ignore the next tool's cost)
import { D, args, cfg, runBoard } from '../simlib.mjs';
const RUNS = +(args.runs || 8); cfg.bot = args.bot || 'mid';
const NZ = D.ZONES.length;
const afford = (bank, cost) => Object.entries(cost).every(([k, v]) => (bank[k] || 0) >= v);
const pay = (bank, cost) => Object.entries(cost).forEach(([k, v]) => bank[k] = (bank[k] || 0) - v);
const add = (bank, got) => Object.entries(got).forEach(([k, v]) => { if (D.STASH_KEYS.includes(k)) bank[k] = (bank[k] || 0) + v; });
const CANDIDATES = {
  table:    D.WORKSHOP ? D.WORKSHOP.table.cost : { ruby: 12, emerald: 1, bone: 6, iron: 6, wood: 8 },
  equip2:   D.WORKSHOP ? D.WORKSHOP.equip2.cost : { gold: 12, diamond: 3, iron: 20, coal: 60 },
  potion2:  D.WORKSHOP ? D.WORKSHOP.potion2.cost : { prismore: 6, emerald: 4, ruby: 20, bone: 6 },
};
if (args.try) Object.assign(CANDIDATES, JSON.parse(args.try));
const firstAt = Object.fromEntries(Object.keys(CANDIDATES).map(k => [k, []]));
const curves = [];
let seed = 1;
for (let run = 0; run < RUNS; run++) {
  const bank = {}; let minutes = 0; const log = [];   // [minutes, zone, bank snapshot, reserved next-tool cost]
  const nextCost = z => z + 1 < D.TOOLS.length && z < D.MAGMA_Z ? D.TOOLS[z + 1].cost : null;
  const play = (z, j) => { for (let t = 0; t < 25; t++) { const r = runBoard(z, j, 70000 + seed++ * 37, t); minutes += r.moves * 5 / 60;
    if (r.win && r.stars) { add(bank, r.got); log.push([minutes, z, { ...bank }, nextCost(z)]); return; } } };
  for (let z = 0; z < NZ - 1; z++) {
    const n = D.ZONES[z].boards;
    for (let j = 0; j < n; j++) play(z, j);
    const cost = nextCost(z);
    if (cost) { for (let k = 0; k < 40 && !afford(bank, cost); k++) play(z, Math.floor(Math.random() * n)); Object.entries(cost).forEach(([k, v]) => { bank[k] = Math.max(bank[k] || 0, v); }); pay(bank, cost); }
  }
  const total = minutes;
  for (const [name, cost] of Object.entries(CANDIDATES)) {
    const hit = log.find(([, , b, res]) => { const left = { ...b }; if (res && !args.noreserve) pay(left, res); return afford(left, cost); });
    firstAt[name].push(hit ? hit[0] / total : 1.5);
  }
  curves.push({ total, end: log[log.length - 1][2] });
}
const med = a => { const b = [...a].sort((x, y) => x - y); return b[Math.floor(b.length / 2)]; };
console.log(`bot ${cfg.bot}, ${RUNS} descents, tools only (no specials)`);
for (const [name, cost] of Object.entries(CANDIDATES))
  console.log(`${name.padEnd(8)} ${JSON.stringify(cost).padEnd(60)} first affordable at ${Math.round(100 * med(firstAt[name]))}% of play time (range ${Math.round(100 * Math.min(...firstAt[name]))}-${Math.round(100 * Math.max(...firstAt[name]))}%)`);
const end = {}; curves.forEach(c => Object.entries(c.end).forEach(([k, v]) => end[k] = (end[k] || 0) + v / RUNS));
console.log('stash at the Core (no specials):', JSON.stringify(Object.fromEntries(Object.entries(end).map(([k, v]) => [k, Math.round(v)]))));
