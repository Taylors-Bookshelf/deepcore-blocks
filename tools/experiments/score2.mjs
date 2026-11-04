// Model of the proposed I-15 scoring (2026-11-03): points come from play, not resources.
//   placement: 10 per block, + shape bonus by tier (L1 +10, L2 +20, L3 +30)
//   clears: 100 per line; multi-line combo bonus 2:+50 3:+100 4:+250 (5+: +400); All Clear +250
//   streak: a clearing placement right after a clearing placement: 2nd in a row +100, then +100 x n (3rd +300 ... 10th +1000)
//   a board is a fixed number of deals; placing every piece completes it, a cave-in fails it
//   stars: bonus points (score minus the 10/block base) against 300 / 600 / 900 x the layer's star scale
// Usage: node tools/experiments/score2.mjs [--runs 40] [--zones 0,1,3,5,6] [--deals 6] [--bots mid,good,skilled]
import { D, C, args, prefill, bitsOf } from '../simlib.mjs';
const RUNS = +(args.runs || 40), ZS = String(args.zones || '0,1,2,3,4,5,6').split(',').map(Number);
const BOTS = String(args.bots || 'mid,good,skilled').split(',');
const DEALS = args.deals ? String(args.deals).split(',').map(Number) : null;   // one value, or one per zone
const LINE = 100, AC = +(args.ac ?? 250);
const COMBO = args.combo ? String(args.combo).split(',').map(Number).concat(Array(9).fill(0)) : [0, 0, 50, 100, 250, 400, 400, 400, 400];   // --combo 0,0,150,400,800,1200
for (let i = 5; i < COMBO.length; i++) COMBO[i] = COMBO[i] || COMBO[i - 1];
// streak: the proposal (2nd +100, then 100 x n, max 1000), or --streak flat:50:500 (+50 per clear after the first, max 500)
const SK = String(args.streak || 'proposal').split(':');
const streakBonus = n => n < 2 ? 0 : SK[0] === 'flat' ? Math.min(+SK[2], +SK[1] * (n - 1)) : n === 2 ? 100 : Math.min(1000, 100 * n);
// shape tiers (the user's list): L1 2x3 L and stairs and the 2-block diagonal; L2 the big 3x3 L and the 3-block diagonal; L3 the 3x3 square
const TIER = {}; const tierOf = str => TIER[str] || 0;
['#./#./##', '.#/.#/##', '##/#./#.', '##/.#/.#', '###/#..', '###/..#', '#../###', '..#/###', '##./.##', '.##/##.', '#./##/.#', '.#/##/#.', '#./.#', '.#/#.'].forEach(s => TIER[s] = 1);
['#../#../###', '..#/..#/###', '###/#../#..', '###/..#/..#', '#../.#./..#', '..#/.#./#..'].forEach(s => TIER[s] = 2);
['###/###/###'].forEach(s => TIER[s] = 3);
const SHB = args.shapes !== undefined ? [0, 1, 2, 3].map(t => t * +args.shapes) : [0, 10, 20, 30], shapeBonus = sh => SHB[tierOf(C.SHAPE_STRS[sh.id])];
const q = (a, p) => { const b = [...a].sort((x, y) => x - y); return b.length ? b[Math.min(b.length - 1, Math.floor(p * b.length))] : 0; };
const pct = (n, d) => Math.round(100 * n / Math.max(1, d)) + '%';

// one placement: new board, lines, points earned (bonus only, the 10/block base is tracked apart), new streak
function play(lo, hi, sh, pl, streak) {
  const [nlo, nhi, n] = C.applyMove(lo, hi, pl.lo, pl.hi); const st = n ? streak + 1 : 0;
  const parts = [shapeBonus(sh), n ? LINE * n : 0, n ? COMBO[Math.min(n, 8)] : 0, n ? streakBonus(st) : 0, n && !nlo && !nhi ? AC : 0];
  return { lo: nlo, hi: nhi, n, pts: parts.reduce((a, b) => a + b, 0), parts, streak: st, ac: n > 0 && !nlo && !nhi };
}
const moves = (lo, hi, pcs) => { const out = []; pcs.forEach((sh, i) => { if (!sh) return; for (const pl of sh.pl) if (!(lo & pl.lo) && !(hi & pl.hi)) out.push({ i, sh, pl }); }); return out; };
const canFinish = (lo, hi, rest) => !rest.length || C.solveCount(lo, hi, rest, 1, 2500, false, false).count > 0;

// mid: the repo's typical player (board shape first, ore- and score-blind, slips 22% of the time)
function midMove(lo, hi, pcs, streak, rnd) {
  const os = moves(lo, hi, pcs); if (!os.length) return null;
  for (const o of os) { const r = play(lo, hi, o.sh, o.pl, streak); o.v = C.evalBoard(r.lo, r.hi) + r.n * 9 + (r.ac ? 30 : 0);
    if (!canFinish(r.lo, r.hi, pcs.filter((p, j) => p && j !== o.i)) && rnd() >= .2) o.v -= 400; }
  os.sort((a, b) => b.v - a.v); const top = os.slice(0, 4); return rnd() < .22 ? top[Math.floor(rnd() * top.length)] : top[0];
}
// good: one move ahead, knows the scoring (points now + board health)
function goodMove(lo, hi, pcs, streak, rnd) {
  const os = moves(lo, hi, pcs); if (!os.length) return null;
  for (const o of os) { const r = play(lo, hi, o.sh, o.pl, streak); o.v = r.pts / 25 + C.evalBoard(r.lo, r.hi);
    if (!canFinish(r.lo, r.hi, pcs.filter((p, j) => p && j !== o.i))) o.v -= 400; }
  os.sort((a, b) => b.v - a.v); return rnd() < .08 && os.length > 1 ? os[1] : os[0];
}
// skilled: plans the whole tray (every order, beam search), sets up multi-line clears and keeps streaks going
const HEALTH = +(args.health ?? 1.6), SETUP = +(args.setup ?? 6), PW = +(args.pw ?? 25);
function setupVal(lo, hi) { let v = 0;   // lines one or two blocks from full are combo material
  for (let r = 0; r < 8; r++) { let f = 0; for (let c = 0; c < 8; c++) f += C.getBit(lo, hi, r, c); if (f >= 6 && f < 8) v += f - 5; }
  for (let c = 0; c < 8; c++) { let f = 0; for (let r = 0; r < 8; r++) f += C.getBit(lo, hi, r, c); if (f >= 6 && f < 8) v += f - 5; }
  return v; }
function skilledPlan(lo, hi, pcs, streak) {
  let best = null;
  const leaf = (s) => s.pts / PW + HEALTH * C.evalBoard(s.lo, s.hi) + SETUP * setupVal(s.lo, s.hi) / 4 + (s.streak ? 2 : 0);
  const rec = (s, left, first, depth) => {
    const os = moves(s.lo, s.hi, left);
    if (!left.some(Boolean)) { const v = leaf(s); if (!best || v > best.v) best = { ...first, v }; return; }
    if (!os.length) { const v = leaf(s) - 400; if (!best || v > best.v) best = { ...first, v }; return; }
    const kids = os.map(o => { const r = play(s.lo, s.hi, o.sh, o.pl, s.streak); return { o, st: { lo: r.lo, hi: r.hi, pts: s.pts + r.pts, streak: r.streak } }; });
    kids.forEach(k => k.h = k.st.pts / PW + C.evalBoard(k.st.lo, k.st.hi) + SETUP * setupVal(k.st.lo, k.st.hi) / 4);
    kids.sort((a, b) => b.h - a.h);
    const beam = depth === 0 ? 14 : depth === 1 ? 6 : 1;
    for (const k of kids.slice(0, beam)) rec(k.st, left.map((p, j) => j === k.o.i ? null : p), first || k.o, depth + 1);
  };
  rec({ lo, hi, pts: 0, streak }, pcs, null, 0);
  return best;
}

function runBoard(zi, j, seed, bot, deals) {
  const def = D.boardParams(zi, j), rnd = D.rng(seed * 7919 + 13); let [lo, hi] = bitsOf(prefill(def, rnd));
  let parts = [0, 0, 0, 0, 0], base = 0, bonus = 0, streak = 0, lines = 0, clears = 0, multi = 0, acs = 0, best = 0, tiers = [0, 0, 0, 0], bigNext = false;
  for (let s = 0; s < deals; s++) {
    let set; if (bigNext && !lo && !hi) { set = C.BIG_IDS.map(ids => C.SHAPES[ids[Math.floor(rnd() * ids.length)]]); bigNext = false; } else set = C.chooseSet(lo, hi, def.d, { rnd });
    set.forEach(sh => tiers[tierOf(C.SHAPE_STRS[sh.id])]++);
    let pcs = set.slice();
    while (pcs.some(Boolean)) {
      const mv = bot === 'skilled' ? skilledPlan(lo, hi, pcs, streak) : bot === 'good' ? goodMove(lo, hi, pcs, streak, rnd) : midMove(lo, hi, pcs, streak, rnd);
      if (!mv || !mv.pl || (lo & mv.pl.lo) || (hi & mv.pl.hi)) return { caved: true, parts, bonus, base, lines, clears, multi, acs, best, tiers };
      const r = play(lo, hi, mv.sh, mv.pl, streak); lo = r.lo; hi = r.hi; streak = r.streak; base += 10 * mv.sh.n; bonus += r.pts; r.parts.forEach((v, i) => parts[i] += v);
      if (r.n) { lines += r.n; clears++; if (r.n > 1) multi++; best = Math.max(best, streak); } if (r.ac) { acs++; bigNext = true; }
      pcs = pcs.map((p, k) => k === mv.i ? null : p);
    }
  }
  return { caved: false, parts, bonus, base, lines, clears, multi, acs, best, tiers };
}

const dealsFor = zi => DEALS ? (DEALS.length > 1 ? DEALS[zi] : DEALS[0]) : 6;
for (const zi of ZS) { const z = D.ZONES[zi]; if (z.core) continue; const js = [...new Set([0, Math.floor(z.boards / 2), z.boards - 1])];
  console.log(`\n${z.name} (d ${D.boardParams(zi, js[0]).d.toFixed(2)}-${D.boardParams(zi, js.at(-1)).d.toFixed(2)}), ${dealsFor(zi)} deals`);
  for (const bot of BOTS) { const R = []; for (const j of js) for (let k = 0; k < RUNS; k++) R.push(runBoard(zi, j, 4000 + 1000 * zi + 100 * j + k, bot, dealsFor(zi)));
    const ok = R.filter(r => !r.caved), b = ok.map(r => r.bonus), L = ok.map(r => r.lines), t = R.reduce((a, r) => a.map((x, i) => x + r.tiers[i]), [0, 0, 0, 0]), tt = t.reduce((a, x) => a + x, 0);
    const clears = ok.reduce((a, r) => a + r.clears, 0), multi = ok.reduce((a, r) => a + r.multi, 0);
    console.log(`  ${bot.padEnd(8)} complete ${pct(ok.length, R.length)}  lines p10/50/90 ${q(L, .1)}/${q(L, .5)}/${q(L, .9)}  bonus pts p10/50/90 ${q(b, .1)}/${q(b, .5)}/${q(b, .9)}  multi-line share ${pct(multi, clears)}  best streak p50 ${q(ok.map(r => r.best), .5)}  AC/run ${(ok.reduce((a, r) => a + r.acs, 0) / Math.max(1, ok.length)).toFixed(2)}  shapes L0-3 ${t.map(x => pct(x, tt)).join(' ')}`);
    { const P = ok.reduce((a, r) => a.map((x, i) => x + r.parts[i]), [0, 0, 0, 0, 0]).map(x => Math.round(x / Math.max(1, ok.length))); console.log(`           avg bonus: shapes ${P[0]}  lines ${P[1]}  combos ${P[2]}  streaks ${P[3]}  all clears ${P[4]}   base ${Math.round(ok.reduce((a, r) => a + r.base, 0) / Math.max(1, ok.length))}`); }
    if (args.stars) { const sc = String(args.stars).split(',').map(Number); const st = R.map(r => r.caved ? 0 : sc.reduce((n, v) => n + (r.bonus >= v ? 1 : 0), 0)); const ge = k => pct(st.filter(s => s >= k).length, R.length);
      console.log(`           stars at ${sc.join('/')}: 1★+ ${ge(1)}  2★+ ${ge(2)}  3★ ${ge(3)}`); } } }
// --calibrate: per layer, place the star lines so the skilled bot hits a target ramp (1/2/3 stars: 100/95/85% in the Forest
// down to 85/65/50% from Magmastone on), then report what the typical (mid) and good bots get, and the typical tries per board
if (args.calibrate) { const n = ZS.length; console.log('\nCALIBRATION (skilled targets ramp to 85/65/50% at Magmastone and the Crust)');
  for (const zi of ZS) { const z = D.ZONES[zi]; if (z.core) continue; const js = [...new Set([0, Math.floor(z.boards / 2), z.boards - 1])], f = Math.min(1, zi / D.MAGMA_Z);
    const T1 = +(args.t1 ?? .85), tgt = [1 - (1 - T1) * f, .95 - .30 * f, .85 - .35 * f], R = {};
    for (const bot of BOTS) { R[bot] = []; for (const j of js) for (let k = 0; k < RUNS; k++) R[bot].push(runBoard(zi, j, 7000 + 1000 * zi + 100 * j + k, bot, dealsFor(zi))); }
    const sk = R.skilled.map(r => r.caved ? -1 : r.bonus), lines = tgt.map(t => Math.max(100, Math.round(q(sk, 1 - t) / 50) * 50));
    const rate = (bot, k) => R[bot].filter(r => !r.caved && r.bonus >= lines[k]).length / R[bot].length;
    const row = bot => [0, 1, 2].map(k => pct(rate(bot, k) * 100, 100)).join('/');
    console.log(`${z.name.padEnd(16)} ${dealsFor(zi)} deals  lines ${lines.join('/')} (${lines.map(v => (v / 100).toFixed(1)).join('/')} line-eq)  skilled ${row('skilled')}  mid ${row('mid')}  mid tries/board ${(1 / Math.max(.01, rate('mid', 0))).toFixed(2)}`); } }
// --even: 1★ at the skilled bot's 3rd percentile (a pass mark), 3★ at its percentile ramp (p10 in the Forest to p50 from Magmastone),
// 2★ halfway between. Lines are printed as bonus points and as total points (bonus + the layer's average 10/block base).
if (args.even) { console.log('\nEVEN SPACING');
  for (const zi of ZS) { const z = D.ZONES[zi]; if (z.core) continue; const js = [...new Set([0, Math.floor(z.boards / 2), z.boards - 1])], f = Math.min(1, zi / D.MAGMA_Z), R = {};
    for (const bot of BOTS) { R[bot] = []; for (const j of js) for (let k = 0; k < RUNS; k++) R[bot].push(runBoard(zi, j, 7000 + 1000 * zi + 100 * j + k, bot, dealsFor(zi))); }
    const sk = R.skilled.map(r => r.caved ? -1 : r.bonus), r50 = x => Math.round(x / 50) * 50;
    const l1 = r50(q(sk.filter(x => x >= 0), .03)), l3 = r50(q(sk, .1 + .4 * f)), lines = [l1, r50((l1 + l3) / 2), l3];
    const base = r50(R.skilled.filter(r => !r.caved).reduce((a, r) => a + r.base, 0) / Math.max(1, R.skilled.filter(r => !r.caved).length));
    const rate = (bot, k) => R[bot].filter(r => !r.caved && r.bonus >= lines[k]).length / R[bot].length;
    const row = bot => [0, 1, 2].map(k => pct(rate(bot, k) * 100, 100)).join('/');
    console.log(`${z.name.padEnd(16)} ${dealsFor(zi)} deals  bonus lines ${lines.join('/')}  base ~${base}  total lines ${lines.map(v => v + base).join('/')}  skilled ${row('skilled')}  mid ${row('mid')}  mid tries ${(1 / Math.max(.01, rate('mid', 0))).toFixed(2)}`); } }
