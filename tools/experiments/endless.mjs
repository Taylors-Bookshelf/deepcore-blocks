// Endless boards (F-14, v2.4.0): bots play a board with no piece limit until it caves in (or a move cap), on the real rolling dealer
// with its in-board ramp (C.rampD). Reports how long boards last and where star lines would fall, so the ramp and STAR_LINES can be set.
// Usage: node tools/experiments/endless.mjs [--runs 30] [--zones 0,1,2,3,4,5,6] [--bots mid,skilled] [--cap 250]
//   [--step .02 --grace 12]   try another ramp (C.RAMP)
//   [--mix .03,.4,.18]        star lines: 1★ at mid's p (ramping .03 in the Forest to .4 from Magmastone), 3★ at skilled's p .18
import { D, C, args, prefill, bitsOf } from '../simlib.mjs';
const RUNS = +(args.runs || 30), ZS = String(args.zones || '0,1,2,3,4,5,6').split(',').map(Number), CAP = +(args.cap || 250);
const BOTS = String(args.bots || 'mid,skilled').split(',');
if (args.step !== undefined) C.RAMP.step = +args.step; if (args.grace !== undefined) C.RAMP.grace = +args.grace; if (args.max !== undefined) C.RAMP.max = +args.max; if (args.wild !== undefined) C.RAMP.wild = +args.wild; if (args.wildmax !== undefined) C.RAMP.wildMax = +args.wildmax; if (args.awk !== undefined) C.RAMP.awk = +args.awk; for (const k of ['wild0', 'graceMul', 'mercy']) if (args[k] !== undefined) C.RAMP[k] = +args[k];
const q = (a, p) => { const b = [...a].sort((x, y) => x - y); return b.length ? b[Math.min(b.length - 1, Math.floor(p * b.length))] : 0; };
const pct = x => Math.round(100 * x) + '%';
const moves = (lo, hi, pcs) => { const out = []; pcs.forEach((sh, i) => { if (!sh) return; for (const pl of sh.pl) if (!(lo & pl.lo) && !(hi & pl.hi)) out.push({ i, sh, pl }); }); return out; };
const play = (lo, hi, sh, pl, streak) => { const [nlo, nhi, n] = C.applyMove(lo, hi, pl.lo, pl.hi); const st = n ? streak + 1 : 0, ac = n > 0 && !nlo && !nhi;
  return { lo: nlo, hi: nhi, n, ac, streak: st, pts: D.SCORE.block * sh.n + D.placePoints(0, n, st, ac).total }; };
const canFinish = (lo, hi, rest) => !rest.length || C.solveCount(lo, hi, rest, 1, 2500, false, false).count > 0;
function midMove(lo, hi, pcs, streak, rnd) {   // the typical player (board shape first, score-blind, slips 22% of the time)
  const os = moves(lo, hi, pcs); if (!os.length) return null;
  for (const o of os) { const r = play(lo, hi, o.sh, o.pl, streak); o.v = C.evalBoard(r.lo, r.hi) + r.n * 9 + (r.ac ? 30 : 0);
    if (!canFinish(r.lo, r.hi, pcs.filter((p, j) => p && j !== o.i)) && rnd() >= .2) o.v -= 400; }
  os.sort((a, b) => b.v - a.v); const top = os.slice(0, 4); return rnd() < .22 ? top[Math.floor(rnd() * top.length)] : top[0];
}
function goodMove(lo, hi, pcs, streak, rnd) {   // one move ahead, knows the scoring (points now + board health), slips 8%
  const os = moves(lo, hi, pcs); if (!os.length) return null;
  for (const o of os) { const r = play(lo, hi, o.sh, o.pl, streak); o.v = r.pts / 25 + C.evalBoard(r.lo, r.hi);
    if (!canFinish(r.lo, r.hi, pcs.filter((p, j) => p && j !== o.i))) o.v -= 400; }
  os.sort((a, b) => b.v - a.v); return rnd() < .08 && os.length > 1 ? os[1] : os[0];
}
// bad: places on purpose where it hurts most (the worst-looking legal move); random: any legal move
function badMove(lo, hi, pcs, streak, rnd) { const os = moves(lo, hi, pcs); if (!os.length) return null;
  for (const o of os) { const r = play(lo, hi, o.sh, o.pl, streak); o.v = C.evalBoard(r.lo, r.hi) - r.n * 20; } os.sort((a, b) => a.v - b.v); return os[0]; }
function randomMove(lo, hi, pcs, streak, rnd) { const os = moves(lo, hi, pcs); return os.length ? os[Math.floor(rnd() * os.length)] : null; }
function setupVal(lo, hi) { let v = 0;
  for (let r = 0; r < 8; r++) { let f = 0; for (let c = 0; c < 8; c++) f += C.getBit(lo, hi, r, c); if (f >= 6 && f < 8) v += f - 5; }
  for (let c = 0; c < 8; c++) { let f = 0; for (let r = 0; r < 8; r++) f += C.getBit(lo, hi, r, c); if (f >= 6 && f < 8) v += f - 5; }
  return v; }
function skilledPlan(lo, hi, pcs, streak, next) {   // plans the tray and the next piece (which can't go first), sets up combos
  if (next) pcs = [...pcs, next]; const late = next ? pcs.length - 1 : -1; let best = null;
  const leaf = s => s.pts / 25 + 1.6 * C.evalBoard(s.lo, s.hi) + 6 * setupVal(s.lo, s.hi) / 4 + (s.streak ? 2 : 0);
  const rec = (s, left, first, depth) => {
    const os = moves(s.lo, s.hi, left).filter(o => depth > 0 || o.i !== late);
    if (!left.some(Boolean)) { const v = leaf(s); if (!best || v > best.v) best = { ...first, v }; return; }
    if (!os.length) { const v = leaf(s) - 400; if (!best || v > best.v) best = { ...first, v }; return; }
    const kids = os.map(o => { const r = play(s.lo, s.hi, o.sh, o.pl, s.streak); return { o, st: { lo: r.lo, hi: r.hi, pts: s.pts + r.pts, streak: r.streak } }; });
    kids.forEach(k => k.h = k.st.pts / 25 + C.evalBoard(k.st.lo, k.st.hi) + 6 * setupVal(k.st.lo, k.st.hi) / 4); kids.sort((a, b) => b.h - a.h);
    for (const k of kids.slice(0, depth === 0 ? 14 : depth === 1 ? 6 : 1)) rec(k.st, left.map((p, j) => j === k.o.i ? null : p), first || k.o, depth + 1);
  };
  rec({ lo, hi, pts: 0, streak }, pcs, null, 0); return best;
}
// one endless board: returns the score after every placement (trace) and whether it caved in
export function runEndless(zi, j, seed, bot) {
  const def = D.boardParams(zi, j, null, args.diff || 'casual'), rnd = D.rng(seed * 7919 + 13); let [lo, hi] = bitsOf(prefill(def, rnd));
  let score = 0, streak = 0, n = 0, big = 0; const trace = [];
  const opt = () => ({ rnd, big: big > 0, wild: C.wildOf(n, def.grace, def.ramp), mercy: def.ramp.mercy }), dd = () => C.rampD(def.d, n, def.grace, def.ramp);
  let pcs = C.chooseTray(lo, hi, 3, dd(), opt()), next = C.chooseNext(lo, hi, pcs, dd(), opt());
  while (n < CAP) {
    const mv = bot === 'skilled' ? skilledPlan(lo, hi, pcs, streak, next) : bot === 'good' ? goodMove(lo, hi, pcs, streak, rnd) : bot === 'bad' ? badMove(lo, hi, pcs, streak, rnd) : bot === 'random' ? randomMove(lo, hi, pcs, streak, rnd) : midMove(lo, hi, pcs, streak, rnd);
    if (!mv || !mv.pl || mv.i >= 3 || (lo & mv.pl.lo) || (hi & mv.pl.hi)) return { trace, caved: true };
    const r = play(lo, hi, mv.sh, mv.pl, streak); lo = r.lo; hi = r.hi; streak = r.streak; score += r.pts; n++; trace.push(score); if (r.ac) big = 3;
    pcs = pcs.map((p, k) => k === mv.i ? next : p); next = C.chooseNext(lo, hi, pcs.filter(Boolean), dd(), opt()); if (big > 0) big--;
    if (pcs.every(p => !p || !p.pl.some(pl => !(lo & pl.lo) && !(hi & pl.hi)))) return { trace, caved: true };
  }
  return { trace, caved: false };
}
if (process.argv[1] && process.argv[1].endsWith('endless.mjs')) {
  const [p1a, p1b, p3] = String(args.mix || '.03,.4,.18').split(',').map(Number), P3BOT = args.p3bot || 'skilled', r50 = x => Math.round(x / 50) * 50;
  console.log(`ramp: wild ${C.RAMP.wild}/placement up to ${C.RAMP.wildMax}, step ${C.RAMP.step} per placement after the board's grace (${D.DEALS.slice(0, 7).map(x => x * 3).join('/')} placements by layer), max d ${C.RAMP.max}`);
  for (const zi of ZS) { const z = D.ZONES[zi]; if (z.core) continue; const js = [...new Set([0, Math.floor(z.boards / 2), z.boards - 1])], R = {};
    for (const bot of BOTS) { R[bot] = []; for (const j of js) for (let k = 0; k < RUNS; k++) R[bot].push(runEndless(zi, j, 7000 + 1000 * zi + 100 * j + k, bot)); }
    const top = b => R[b].map(r => r.trace.at(-1) || 0), len = b => R[b].map(r => r.trace.length);
    const f = Math.min(1, zi / D.MAGMA_Z), l1 = r50(q(top('mid'), p1a + (p1b - p1a) * f)), l3 = Math.max(l1 + 300, r50(q(top(P3BOT), p3))), lines = [l1, r50((l1 + l3) / 2), l3];
    const reach = (b, v) => R[b].filter(r => (r.trace.at(-1) || 0) >= v).length / R[b].length;
    const at = (b, v) => { const m = R[b].map(r => r.trace.findIndex(s => s >= v)).filter(x => x >= 0).map(x => x + 1); return m.length ? q(m, .5) : '-'; };
    console.log(`${z.name.padEnd(16)} lines ${lines.join('/')}`);
    for (const b of BOTS) console.log(`   ${b.padEnd(8)} lasts p25/50/75 ${q(len(b), .25)}/${q(len(b), .5)}/${q(len(b), .75)}${R[b].some(r => !r.caved) ? ` (cap ${pct(R[b].filter(r => !r.caved).length / R[b].length)})` : ''}  reaches ${lines.map(v => pct(reach(b, v))).join('/')}  placements to each star ${lines.map(v => at(b, v)).join('/')}  top score p50 ${q(top(b), .5)}`);
  }
}
