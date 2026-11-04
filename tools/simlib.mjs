// Simulator library: bot players that play boards through the real dealer and rules (used by sim.mjs and day.mjs).
// Simulator library: bot players that play boards through the real dealer and rules (used by sim.mjs and day.mjs).
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
export const D = require('../src/data.js'), C = require('../src/core.js');
export const args = Object.fromEntries(process.argv.slice(2).reduce((a, x, i, arr) => x.startsWith('--') ? [...a, [x.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]] : a, []));
export const cfg = { bot: args.bot || 'greedy', luck: +(args.luck || 0), fails: +(args.fails || 0) };
const N = 8;
// try different zone tuning without editing data.js: --zd "1:.28,.46;2:.5,.68"
if (args.zd) args.zd.split(';').forEach(x => { const [i, v] = x.split(':'); D.ZONES[+i].d = v.split(',').map(Number); });
if (args.old) Object.assign(C.TUNE, { waysFloor: 1, waysExp: 1, assistExp: 1.8 });   // the dealer as shipped in v0.3.0
for (const k of ['waysFloor', 'waysExp', 'assistExp', 'mercy', 'mercyStart']) if (args[k] !== undefined) C.TUNE[k] = +args[k];

const evalBoard = C.evalBoard;
function makeRun(seed) {
  const rnd = D.rng(seed * 7919 + 13);
  return rnd;
}
export function prefill(def, rnd) {
  const grid = Array(64).fill(null); if (!def.pre) return grid;
  for (let attempt = 0; attempt < 80; attempt++) {
    const g = Array(64).fill(null); let count = def.pre + Math.round(rnd() * 2 - 1); const rowN = Array(8).fill(0), colN = Array(8).fill(0); let guard = 0;
    const ok = (r, c) => r >= 0 && c >= 0 && r < 8 && c < 8 && !g[r * 8 + c] && rowN[r] < 4 && colN[c] < 4;
    while (count > 0 && guard++ < 200) { let r = Math.floor(rnd() * 8), c = Math.floor(rnd() * 8); const clump = 1 + Math.floor(rnd() * 3);
      for (let k = 0; k < clump && count > 0; k++) { if (!ok(r, c)) break; g[r * 8 + c] = C.pickBase(def, rnd);   // plain rock, as in the game: ore comes from the board's budget
        rowN[r]++; colN[c]++; count--; if (rnd() < .5) r += rnd() < .5 ? 1 : -1; else c += rnd() < .5 ? 1 : -1; } }
    let lo = 0, hi = 0; for (let k = 0; k < 64; k++) if (g[k]) { const [a, b] = C.bitOf(k >> 3, k & 7); lo |= a; hi |= b; }
    if (C.hasLockedHole(lo >>> 0, hi >>> 0)) continue;
    let bad = false; const seen = new Uint8Array(64);
    for (let r = 0; r < 8 && !bad; r++) for (let c = 0; c < 8 && !bad; c++) { if (g[r * 8 + c] || seen[r * 8 + c]) continue; let size = 0; const st = [[r, c]]; seen[r * 8 + c] = 1;
      while (st.length) { const [a, b] = st.pop(); size++; [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dr, dc]) => { const A = a + dr, B = b + dc; if (A < 0 || B < 0 || A > 7 || B > 7 || seen[A * 8 + B] || g[A * 8 + B]) return; seen[A * 8 + B] = 1; st.push([A, B]); }); }
      if (size <= 2) bad = true; }
    if (!bad) return g;
  }
  return Array(64).fill(null);
}
export const bitsOf = g => { let lo = 0, hi = 0; for (let k = 0; k < 64; k++) if (g[k]) { const [a, b] = C.bitOf(k >> 3, k & 7); lo |= a; hi |= b; } return [lo >>> 0, hi >>> 0]; };

// choose (piece index, placement) for the bot; returns null if nothing fits
function botMove(lo, hi, pcs, rnd) {
  const opts = [];
  pcs.forEach((p, i) => { if (!p) return; const sh = C.SHAPES[p.sid]; const rest = pcs.filter((q, j) => q && j !== i).map(q => C.SHAPES[q.sid]);
    for (const pl of sh.pl) { if ((lo & pl.lo) || (hi & pl.hi)) continue; const nb = C.applyMove(lo, hi, pl.lo, pl.hi);
      opts.push({ i, pl, nb, v: 0, rest }); } });
  if (!opts.length) return null;
  for (const o of opts) {
    o.v = evalBoard(o.nb[0], o.nb[1]) + o.nb[2] * 9 + (o.nb[0] === 0 && o.nb[1] === 0 ? 30 : 0);
    if (cfg.bot !== 'random' && o.rest.length) { const ok = C.solveCount(o.nb[0], o.nb[1], o.rest, 1, 2500, false, false).count > 0; if (!ok) o.v -= ((cfg.bot === 'casual' && rnd() < .5) || (cfg.bot === 'mid' && rnd() < .2)) ? 0 : 400; }
  }
  if (cfg.bot === 'random') return opts[Math.floor(rnd() * opts.length)];
  opts.sort((a, b) => b.v - a.v);
  if (cfg.bot === 'casual') { const top = opts.slice(0, 6); return rnd() < .45 ? top[Math.floor(rnd() * top.length)] : top[0]; }
  if (cfg.bot === 'mid') { const top = opts.slice(0, 4); return rnd() < .22 ? top[Math.floor(rnd() * top.length)] : top[0]; }
  if (cfg.bot === 'greedy') return rnd() < .12 && opts.length > 1 ? opts[1] : opts[0];
  return opts[0];   // planner: same one-step search, no slips
}

// One board under the v2.0.4 rules: a fixed number of deals, a fixed ore budget, points from play (D.placePoints), stars from points.
// win = every deal placed and at least 1 star. fails: earlier cave-ins on this board (the dealer's mercy tilt). onMine(mats) may
// return 'break' to stop the board (tools/run.mjs: the Galaxy Alloy tools breaking in the Crust).
export function runBoard(zi, bj, seed, fails = 0, _unused = null, onMine = null) {
  const def = { ...D.boardParams(zi, bj) }, rnd = makeRun(seed);
  const mats = prefill(def, rnd); let [lo, hi] = bitsOf(mats);
  let score = 0, streak = 0, moves = 0, bigNext = false, deals = 0, allClears = 0, multi = 0, clearMoves = 0; const dealt = {}, got = {}, left = C.rollBudget(def.budget, rnd);
  const tilt = Math.min(.75, Math.max(0, fails - 1) * .35);
  const end = died => { const stars = died ? 0 : D.starsFromScore(score, def.starAt); return { win: !died && stars > 0, completed: !died, stars, score, moves, deals, got, target: def.target, allClears, multi, clearMoves, died }; };
  while (deals < def.deals) {
    deals++; let set;
    if (bigNext && lo === 0 && hi === 0) { set = C.BIG_IDS.map(ids => C.SHAPES[ids[Math.floor(rnd() * ids.length)]]); bigNext = false; }
    else set = C.chooseSet(lo, hi, def.d, { rnd, luck: cfg.luck, tilt });
    const out = []; set.forEach(s => out.push(C.dressPiece(s, def, { rnd, dealt, budgeted: true, specialBlocked: out.some(p => p.mats.some(m => D.SPECIAL_MIX[m])) })));
    C.spreadOre(out, left, Math.max(1, def.deals - deals), rnd);   // used up one deal early, as in the game
    let pcs = out.slice();
    while (pcs.some(Boolean)) {
      const mv = botMove(lo, hi, pcs, rnd);
      if (!mv) return end(true);
      const p = pcs[mv.i]; pcs[mv.i] = null; moves++; score += D.SCORE.block * p.cells.length;
      p.cells.forEach(([r, c], k) => { mats[(mv.pl.r0 + r) * 8 + mv.pl.c0 + c] = p.mats[k]; });
      const kill = new Set(); let n = 0;
      for (let r = 0; r < 8; r++) { let f = true; for (let c = 0; c < 8; c++) if (!mats[r * 8 + c]) f = false; if (f) { n++; for (let c = 0; c < 8; c++) kill.add(r * 8 + c); } }
      for (let c = 0; c < 8; c++) { let f = true; for (let r = 0; r < 8; r++) if (!mats[r * 8 + c]) f = false; if (f) { n++; for (let r = 0; r < 8; r++) kill.add(r * 8 + c); } }
      if (n && onMine && onMine([...kill].map(k => mats[k]).filter(Boolean)) === 'break') return { ...end(true), broke: true };
      if (n) { streak++; clearMoves++; if (n > 1) multi++;
        kill.forEach(k => { const m = mats[k]; if (!m) return; if (D.SPECIAL_MIX[m]) { const sp = D.specialHaul(m, zi, rnd); got[sp.k] = (got[sp.k] || 0) + sp.n; }
          else { const res = m === 'log' ? 'wood' : (m === 'grass' ? 'dirt' : m); got[res] = (got[res] || 0) + 1; } mats[k] = null; }); }
      else streak = 0;
      [lo, hi] = bitsOf(mats);
      const ac = n > 0 && lo === 0 && hi === 0; score += D.placePoints(0, n, streak, ac).total; if (ac) { allClears++; bigNext = true; }
      if (pcs.every(q => !q)) break;
      if (pcs.every(q => !q || !C.SHAPES[q.sid].pl.some(pl => !(lo & pl.lo) && !(hi & pl.hi)))) return end(true);
    }
  }
  return end(false);
}

