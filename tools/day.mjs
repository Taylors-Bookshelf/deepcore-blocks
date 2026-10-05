// Plays whole days (all 20 boards, retrying failures, losing the haul of failed boards) to see how often the
// torch/lantern gate needs a strip-mine board, and how the stash grows and drains.
// Usage: node tools/day.mjs [--days 30] [--bot mid] [--policy saver|crafter|smart]
import { D, C, args, cfg, runBoard } from './simlib.mjs';
const DAYS = +(args.days || 30), POLICY = args.policy || 'smart';
const TORCH = { coal: 10, wood: 5 }, LANTERN = { coal: 20, copper: 10 };
const KEYS = D.STASH_KEYS;
const afford = (bank, cost, n = 1) => Object.entries(cost).every(([k, v]) => (bank[k] || 0) >= v * n);
const pay = (bank, cost, n = 1) => Object.entries(cost).forEach(([k, v]) => bank[k] = (bank[k] || 0) - v * n);
const stat = { strip: Array(5).fill(0), days: 0, attempts: Array(5).fill(0), boards: Array(5).fill(0), left: {}, crafted: {}, ownedDays: 0 };
const lumpAt = [];
for (let day = 0; day < DAYS; day++) {
  const bank = {}, owned = {}; stat.days++;
  const play = (zi, j) => { for (let t = 0; t < 14; t++) { const r = runBoard(zi, j, 50000 + day * 100 + zi * 10 + j + t * 1000); stat.attempts[zi]++; if (r.win) { stat.boards[zi]++; Object.entries(r.got).forEach(([k, v]) => { if (KEYS.includes(k)) bank[k] = (bank[k] || 0) + v; }); return; } } };
  for (let zi = 0; zi < 5; zi++) {
    for (let j = 0; j < 3; j++) play(zi, j);
    const cost = zi === 0 ? TORCH : LANTERN;
    // spending before the gate
    if (POLICY !== 'saver') for (const rc of D.RECIPES) {
      if (owned[rc.m] || !afford(bank, rc.cost)) continue;
      if (POLICY === 'smart') { const after = { ...bank }; pay(after, rc.cost); if (!afford(after, cost, 2)) continue; }
      pay(bank, rc.cost); owned[rc.m] = 1; stat.crafted[rc.m] = (stat.crafted[rc.m] || 0) + 1;
    }
    if (!afford(bank, cost, 2)) { stat.strip[zi]++; Object.entries(cost).forEach(([k, v]) => { bank[k] = Math.max(bank[k] || 0, v * 2); }); }  // the strip mine delivers the deficit
    pay(bank, cost, 2);
    play(zi, 3);
  }
  Object.entries(bank).forEach(([k, v]) => stat.left[k] = (stat.left[k] || 0) + v);
}
const pct = (a, n) => a.map(x => Math.round(100 * x / n) + '%').join('  ');
console.log(`policy=${POLICY} bot=${cfg.bot} days=${DAYS}`);
console.log('strip mine needed at gate, zones 1-5:', pct(stat.strip, DAYS), '  (overall', Math.round(100 * stat.strip.reduce((a, b) => a + b, 0) / (5 * DAYS)) + '%)');
console.log('avg attempts per board by zone:', stat.attempts.map((a, i) => (a / Math.max(1, stat.boards[i])).toFixed(2)).join('  '));
console.log('avg leftover stash at day end:', JSON.stringify(Object.fromEntries(Object.entries(stat.left).map(([k, v]) => [k, +(v / DAYS).toFixed(1)]))));
console.log('crafts per day:', JSON.stringify(Object.fromEntries(Object.entries(stat.crafted).map(([k, v]) => [k, +(v / DAYS).toFixed(2)]))));
