// Plays whole descents (Forest to the Ancient Core) with a bot to check the pacing and the economy of a run:
// tries per board, how often the side tunnel is needed for the next tool, days to reach each layer, time spent per layer,
// and how often the Galaxy Alloy tools break in the Crust.
// Usage: node tools/run.mjs [--runs 6] [--bot mid] [--perday 8] [--secs 5]
//   perday: boards a player attempts per day (about 30 minutes); secs: seconds per move, to turn moves into play time
import { D, args, cfg, runBoard } from './simlib.mjs';
const RUNS = +(args.runs || 6), PERDAY = +(args.perday || 8), SECS = +(args.secs || 5);
const NZ = D.ZONES.length;
const afford = (bank, cost) => Object.entries(cost).every(([k, v]) => (bank[k] || 0) >= v);
const pay = (bank, cost) => Object.entries(cost).forEach(([k, v]) => bank[k] = (bank[k] || 0) - v);
const add = (bank, got) => Object.entries(got).forEach(([k, v]) => { if (D.STASH_KEYS.includes(k)) bank[k] = (bank[k] || 0) + v; });
const S = { tries: Array(NZ).fill(0), boards: Array(NZ).fill(0), moves: Array(NZ).fill(0), strip: Array(NZ).fill(0), short: Array(NZ).fill(0),
  dayAt: Array(NZ).fill(0), crustTries: 0, breaks: 0, crafted: {}, left: {} };
let seed = 1;
for (let run = 0; run < RUNS; run++) {
  const bank = {}; let tool = 0, dur = D.DUR_MAX, attemptsToday = 0, day = 1; const owned = {}; const stripDay = {}; const seen = {};
  const tick = () => { if (++attemptsToday >= PERDAY) { attemptsToday = 0; day++; } };
  const nextCost = z => z + 1 < D.TOOLS.length ? D.TOOLS[z + 1].cost : null;
  // one board, retried until cleared; in the Crust the tools can break, which sends the run back to the start of Magmastone
  const play = (z, j) => {
    for (let t = 0; t < 25; t++) {
      tick(); S.tries[z]++;
      let mended = 0, broke = false;
      const onMine = z >= D.MAGMA_Z && tool >= 5 ? (ms => { for (const m of ms) { if (m === 'prismore') { dur = z === D.CRUST_Z ? Math.min(D.DUR_MAX, dur + D.PRISM_MEND) : D.DUR_MAX; mended++; } else if (D.WEAR[m]) dur -= D.WEAR[m]; }
        if (dur <= 0) { broke = true; return 'break'; } }) : null;
      const r = runBoard(z, j, 90000 + seed++ * 31, null, t, null, onMine);
      S.moves[z] += r.moves;
      if (z === D.CRUST_Z) S.crustTries++;
      if (broke) return 'broke';
      if (r.win) { S.boards[z]++; add(bank, r.got); return 'ok'; }
      // a cave-in loses that board's haul (no Rescue Potion in the sim)
    }
    return 'ok';
  };
  for (let z = 0; z < NZ - 1; z++) {
    if (!seen[z]) { seen[z] = 1; S.dayAt[z] += day; }
    const n = D.ZONES[z].boards; let restart = false;
    for (let j = 0; j < n; j++) {
      if (z === D.CRUST_Z) {   // mend with stash prism ore before each Crust board
        while (dur < D.DUR_MAX - D.STASH_MEND / 2 && (bank.prismore || 0) > 0) { bank.prismore--; dur = Math.min(D.DUR_MAX, dur + D.STASH_MEND); }
      }
      const res = play(z, j);
      if (res === 'broke') { S.breaks++; dur = D.DUR_AFTER_BREAK; restart = true; break; }   // back to the start of Magmastone
      // after the 3rd board, if short for the next tool, take the side tunnel once a day
      const cost = nextCost(z);
      if (cost && j >= 2 && !afford(bank, cost) && stripDay[z] !== day) { stripDay[z] = day; S.strip[z]++; tick(); Object.entries(cost).forEach(([k, v]) => { bank[k] = Math.max(bank[k] || 0, v); }); }
      // specials, only with what is left after the next tool
      for (const rc of D.RECIPES) { if (owned[rc.m] || !afford(bank, rc.cost)) continue; const after = { ...bank }; pay(after, rc.cost); if (cost && !afford(after, cost)) continue; pay(bank, rc.cost); owned[rc.m] = 1; S.crafted[rc.m] = (S.crafted[rc.m] || 0) + 1; }
      Object.keys(owned).forEach(k => { if (Math.random() < .3) delete owned[k]; });   // specials get used now and then
    }
    if (restart) { z = D.MAGMA_Z - 1; continue; }
    const cost = nextCost(z);
    if (cost && z < D.MAGMA_Z) { if (!afford(bank, cost)) { S.short[z]++; Object.entries(cost).forEach(([k, v]) => { bank[k] = Math.max(bank[k] || 0, v); }); } pay(bank, cost); tool = z + 1; }
  }
  S.dayAt[NZ - 1] += day; if (S.breaks > 50 * RUNS) break;
  Object.entries(bank).forEach(([k, v]) => S.left[k] = (S.left[k] || 0) + v);
}
const f = (a, d = 2) => a.map(x => x.toFixed(d)).join('  ');
console.log(`bot=${cfg.bot} runs=${RUNS} boards/day=${PERDAY}`);
console.log('layers:            ', D.ZONES.map(z => z.name.replace('The ', '').slice(0, 9).padEnd(9)).join(' '));
console.log('tries per board:   ', D.ZONES.map((z, i) => (S.tries[i] / Math.max(1, S.boards[i])).toFixed(2).padEnd(9)).join(' '));
console.log('minutes per layer: ', D.ZONES.map((z, i) => (S.moves[i] * SECS / 60 / RUNS).toFixed(0).padEnd(9)).join(' '));
console.log('side tunnel needed:', D.ZONES.map((z, i) => (S.strip[i] / RUNS).toFixed(2).padEnd(9)).join(' '), '(per run)');
console.log('still short after: ', D.ZONES.map((z, i) => (S.short[i] / RUNS).toFixed(2).padEnd(9)).join(' '), '(per run, needs replays)');
console.log('day you reach it:  ', D.ZONES.map((z, i) => (S.dayAt[i] / RUNS).toFixed(1).padEnd(9)).join(' '));
console.log(`Crust: ${(S.crustTries / RUNS).toFixed(1)} board tries per run, tools broke ${(S.breaks / RUNS).toFixed(2)} times per run`);
console.log('specials crafted per run:', JSON.stringify(Object.fromEntries(Object.entries(S.crafted).map(([k, v]) => [k, +(v / RUNS).toFixed(1)]))));
console.log('stash at the Core:', JSON.stringify(Object.fromEntries(Object.entries(S.left).map(([k, v]) => [k, Math.round(v / RUNS)]))));
