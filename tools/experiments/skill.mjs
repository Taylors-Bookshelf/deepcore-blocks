// Scratch analysis: how much of a board's star result is skill vs luck?
// Bots: 'planner' (repo's expert: one-step, ore-blind), 'skilled' (ore-aware, looks two placements ahead, aims for multi-line).
// Usage: node skill.mjs --zones 0,1,3,5 --runs 60 [--nospecials]
import { D, C, args, prefill, bitsOf } from '../simlib.mjs';
const RUNS = +(args.runs || 60), ZS = String(args.zones || '0,1,3,5').split(',').map(Number);
if (args.nospecials) for (const k in D.SPECIAL_RATE) D.SPECIAL_RATE[k] = 0;
const q = (a, p) => { const b = [...a].sort((x, y) => x - y); return b.length ? b[Math.min(b.length - 1, Math.floor(p * b.length))] : 0; };

function lines(mats) { const kill = new Set(); let n = 0;
  for (let r = 0; r < 8; r++) { let f = true; for (let c = 0; c < 8; c++) if (!mats[r * 8 + c]) { f = false; break; } if (f) { n++; for (let c = 0; c < 8; c++) kill.add(r * 8 + c); } }
  for (let c = 0; c < 8; c++) { let f = true; for (let r = 0; r < 8; r++) if (!mats[r * 8 + c]) { f = false; break; } if (f) { n++; for (let r = 0; r < 8; r++) kill.add(r * 8 + c); } }
  return { n, kill }; }
const oreW = m => (D.YIELD_W[m] || 0) + (D.SPECIAL_MIX[m] ? 8 : 0);
// value of the ore still sitting on the board, and how close its lines are to clearing
function standing(mats) { let v = 0; for (let k = 0; k < 64; k++) { const w = oreW(mats[k]); if (!w) continue; const r = k >> 3, c = k & 7;
  let rf = 0, cf = 0; for (let x = 0; x < 8; x++) { if (mats[r * 8 + x]) rf++; if (mats[x * 8 + c]) cf++; } v += w * Math.max(rf, cf) / 8; } return v; }
function place(mats, p, pl) { const m = mats.slice(); p.cells.forEach(([r, c], k) => { m[(pl.r0 + r) * 8 + pl.c0 + c] = p.mats[k]; }); const { n, kill } = lines(m);
  let ore = 0; kill.forEach(k => { ore += oreW(m[k]); }); kill.forEach(k => { m[k] = null; }); return { m, n, ore }; }
function opts(mats, pcs) { const [lo, hi] = bitsOf(mats), out = [];
  pcs.forEach((p, i) => { if (!p) return; for (const pl of C.SHAPES[p.sid].pl) { if ((lo & pl.lo) || (hi & pl.hi)) continue; out.push({ i, pl }); } }); return out; }
const shapeVal = m => { const [lo, hi] = bitsOf(m); return C.evalBoard(lo, hi); };
function stepVal(r) { return shapeVal(r.m) + r.n * 9 + (r.n >= 2 ? 6 * r.n : 0) + r.ore * 14 + standing(r.m) * 2; }
function skilledMove(mats, pcs) {
  const os = opts(mats, pcs); if (!os.length) return null; let best = null;
  for (const o of os) { const r = place(mats, pcs[o.i], o.pl); const rest = pcs.map((p, j) => j === o.i ? null : p);
    let v = stepVal(r);
    const left = rest.filter(Boolean);
    if (left.length) { const [lo, hi] = bitsOf(r.m);
      if (C.solveCount(lo, hi, left.map(p => C.SHAPES[p.sid]), 1, 2500, false, false).count === 0) v -= 400;
      else { let b2 = -1e9; for (const o2 of opts(r.m, rest)) { const r2 = place(r.m, rest[o2.i], o2.pl); const v2 = stepVal(r2) + (r.n && r2.n ? 8 : 0); if (v2 > b2) b2 = v2; } v = v * .5 + b2 * .5 + r.ore * 7; } }
    if (!best || v > best.v) best = { ...o, v }; }
  return best; }
function plannerMove(mats, pcs) { const os = opts(mats, pcs); if (!os.length) return null; let best = null;
  for (const o of os) { const r = place(mats, pcs[o.i], o.pl); let v = shapeVal(r.m) + r.n * 9 + (r.m.every(x => !x) ? 30 : 0);
    const left = pcs.filter((p, j) => p && j !== o.i); if (left.length) { const [lo, hi] = bitsOf(r.m); if (C.solveCount(lo, hi, left.map(p => C.SHAPES[p.sid]), 1, 2500, false, false).count === 0) v -= 400; }
    if (!best || v > best.v) best = { ...o, v }; } return best; }

function run(zi, j, seed, bot) {
  const def = { ...D.boardParams(zi, j) }, rnd = D.rng(seed * 7919 + 13), VAL = D.VAL; const mats = prefill(def, rnd);
  let score = 0, combo = 0, since = 0, moves = 0, bigNext = false; const dealt = {}, got = {}; let dealtY = 0, special = 0, specialY = 0, multi = 0, ac = 0;
  while (true) { let set; const [lo, hi] = bitsOf(mats);
    if (bigNext && lo === 0 && hi === 0) { set = C.BIG_IDS.map(ids => C.SHAPES[ids[Math.floor(rnd() * ids.length)]]); bigNext = false; } else set = C.chooseSet(lo, hi, def.d, { rnd });
    const out = []; set.forEach(s => out.push(C.dressPiece(s, def, { rnd, dealt, specialBlocked: out.some(p => p.mats.some(m => D.SPECIAL_MIX[m])) })));
    out.forEach(p => p.mats.forEach(m => { dealtY += D.YIELD_W[m] || 0; })); const pcs = out.slice();
    while (pcs.some(Boolean)) { const mv = bot === 'skilled' ? skilledMove(mats, pcs) : plannerMove(mats, pcs);
      if (!mv) return { win: false };
      const p = pcs[mv.i]; pcs[mv.i] = null; moves++; score += p.cells.length; p.cells.forEach(([r, c], k) => { mats[(mv.pl.r0 + r) * 8 + mv.pl.c0 + c] = p.mats[k]; });
      const { n, kill } = lines(mats); const playGot = {};
      if (n) { combo++; since = 0; if (n > 1) multi++;
        kill.forEach(k => { const m = mats[k]; if (m && D.SPECIAL_MIX[m]) { const sp = D.specialHaul(m, zi, rnd); got[sp.k] = (got[sp.k] || 0) + sp.n; special++; specialY += sp.n * (D.YIELD_W[sp.k] || 0); score += sp.pts; mats[k] = null; return; }
          if (m) { if (D.YIELD_W[m]) playGot[m] = (playGot[m] || 0) + 1; score += VAL[m] || 0; const res = m === 'log' ? 'wood' : m; got[res] = (got[res] || 0) + 1; mats[k] = null; } });
        score += D.lineScore(n, combo); } else { since++; if (since >= 3) combo = 0; }
      const [a, b] = bitsOf(mats); const acNow = n && a === 0 && b === 0; if (acNow) { score += Math.max(10, Math.round(def.target * .15 / 10) * 10); bigNext = true; ac++; }
      if (n) Object.entries(D.bonusOre(playGot, D.bonusPct(n, combo, acNow), def.starWood)).forEach(([k, v]) => { got[k] = (got[k] || 0) + v; });
      if (score >= def.target) { const left = mats.reduce((t, m) => t + (D.YIELD_W[m] || 0), 0); return { win: true, y: D.yieldOf(got, def.starWood), moves, dealtY, left, special, specialY, multi, ac, at: def.starAt }; }
      const [lo2, hi2] = bitsOf(mats); if (pcs.some(Boolean) && pcs.every(q => !q || !C.SHAPES[q.sid].pl.some(pl => !(lo2 & pl.lo) && !(hi2 & pl.hi)))) return { win: false }; } } }

for (const zi of ZS) { const z = D.ZONES[zi]; const js = [0, Math.floor(z.boards / 2), z.boards - 1].filter((v, i, a) => a.indexOf(v) === i && !D.boardParams(zi, v).starWood);
  for (const bot of ['planner', 'skilled']) { const R = []; for (const j of js) for (let k = 0; k < RUNS; k++) { const r = run(zi, j, 5000 + 1000 * zi + 100 * j + k, bot); if (r.win) R.push(r); }
    const st = [0, 0, 0, 0]; R.forEach(r => st[D.starsFromYield(r.y, r.at)]++); const pct = x => (100 * x / R.length).toFixed(0) + '%';
    const noSp = R.filter(r => !r.special), stNo = [0, 0, 0, 0]; noSp.forEach(r => stNo[D.starsFromYield(r.y, r.at)]++);
    console.log(`${z.name.padEnd(16)} ${bot.padEnd(8)} n=${R.length} lines=${R[0].at.join('/')}  yield p10/50/90 ${q(R.map(r => r.y), .1)}/${q(R.map(r => r.y), .5)}/${q(R.map(r => r.y), .9)}  stars 0-3: ${st.map(pct).join(' ')}` +
      `  | no-special runs (${noSp.length}): 3★ ${noSp.length ? Math.round(100 * stNo[3] / noSp.length) : 0}%  2★+ ${noSp.length ? Math.round(100 * (stNo[2] + stNo[3]) / noSp.length) : 0}%` +
      `  | moves ${q(R.map(r => r.moves), .5)}  ore dealt ${q(R.map(r => r.dealtY), .5)}  left on board ${q(R.map(r => r.left), .5)}  special share of yield ${Math.round(100 * R.reduce((t, r) => t + r.specialY, 0) / Math.max(1, R.reduce((t, r) => t + r.y, 0)))}%  multi/run ${(R.reduce((t, r) => t + r.multi, 0) / R.length).toFixed(1)}`); } }
