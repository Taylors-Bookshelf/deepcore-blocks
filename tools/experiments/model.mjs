// Scratch model of proposed star rules (count-based stars + A + B + D). No game code is touched.
// A: clearing ore pays a multiplier: lines + streak (+0.5 per clear in the combo after the first, max +1.5), capped at x5;
//    gems gain at most +1 each; an All Clear pays +3 of the layer's common ore.
// B: a board is a fixed shift of SETS[zone] sets; the score target is only the pass mark.
// D: random specials pay the stash but not the stars; star lines come from bot distributions (printed).
// Usage: node model.mjs --zones 0,1,3,5,6 --runs 50 [--rules old]
import { D, C, args, prefill, bitsOf } from '../simlib.mjs';
const RUNS = +(args.runs || 50), ZS = String(args.zones || '0,1,3,5,6').split(',').map(Number), OLD = args.rules === 'old';
const SETS = (args.sets || '5,6,7,7,8,8,8').split(',').map(Number), CAP = +(args.cap || 5), GRACE = +(args.grace ?? 1), PASS = +(args.pass || .75), STEP = +(args.step || .5), SMAX = +(args.smax || 1.5);
const q = (a, p) => { const b = [...a].sort((x, y) => x - y); return b.length ? b[Math.min(b.length - 1, Math.floor(p * b.length))] : 0; };
const isOre = m => !!D.YIELD_W[m];
const mult = (n, combo) => Math.min(CAP, n + Math.min(SMAX, STEP * Math.max(0, combo - 1)));
function lines(mats) { const kill = new Set(); let n = 0;
  for (let r = 0; r < 8; r++) { let f = true; for (let c = 0; c < 8; c++) if (!mats[r * 8 + c]) { f = false; break; } if (f) { n++; for (let c = 0; c < 8; c++) kill.add(r * 8 + c); } }
  for (let c = 0; c < 8; c++) { let f = true; for (let r = 0; r < 8; r++) if (!mats[r * 8 + c]) { f = false; break; } if (f) { n++; for (let r = 0; r < 8; r++) kill.add(r * 8 + c); } }
  return { n, kill }; }
const oreAt = m => isOre(m) ? 1 : 0;
function standing(mats) { let v = 0; for (let k = 0; k < 64; k++) { if (!oreAt(mats[k])) continue; const r = k >> 3, c = k & 7;
  let rf = 0, cf = 0; for (let x = 0; x < 8; x++) { if (mats[r * 8 + x]) rf++; if (mats[x * 8 + c]) cf++; } v += Math.max(rf, cf) / 8; } return v; }
function place(mats, p, pl) { const m = mats.slice(); p.cells.forEach(([r, c], k) => { m[(pl.r0 + r) * 8 + pl.c0 + c] = p.mats[k]; }); const { n, kill } = lines(m);
  let ore = 0; kill.forEach(k => { ore += oreAt(m[k]); }); kill.forEach(k => { m[k] = null; }); return { m, n, ore, empty: n > 0 && m.every(x => !x) }; }
function opts(mats, pcs) { const [lo, hi] = bitsOf(mats), out = [];
  pcs.forEach((p, i) => { if (!p) return; for (const pl of C.SHAPES[p.sid].pl) { if ((lo & pl.lo) || (hi & pl.hi)) continue; out.push({ i, pl }); } }); return out; }
const shapeVal = m => { const [lo, hi] = bitsOf(m); return C.evalBoard(lo, hi); };
const dead = (m, rest) => { const left = rest.filter(Boolean); if (!left.length) return false; const [lo, hi] = bitsOf(m); return C.solveCount(lo, hi, left.map(p => C.SHAPES[p.sid]), 1, 2500, false, false).count === 0; };
// skilled: knows the rules in play, two placements deep, values ore by what it pays now plus ore lined up to clear
function skilledMove(mats, pcs, combo) {
  const os = opts(mats, pcs); if (!os.length) return null; let best = null;
  const pay = (r, c) => r.n ? r.ore * (OLD ? 1 + (D.BONUS_LINES[Math.min(r.n, 5)] || 0) : mult(r.n, c + 1)) + (r.empty ? 6 : 0) : 0;
  const val = (r, c) => shapeVal(r.m) + r.n * 9 + pay(r, c) * 14 + standing(r.m) * 2 + (r.n ? 0 : (c > 0 ? -3 : 0));
  for (const o of os) { const r = place(mats, pcs[o.i], o.pl); const rest = pcs.map((p, j) => j === o.i ? null : p); let v = val(r, combo);
    if (dead(r.m, rest)) v -= 400;
    else if (rest.some(Boolean)) { const c1 = r.n ? combo + 1 : combo; let b2 = -1e9; for (const o2 of opts(r.m, rest)) { const v2 = val(place(r.m, rest[o2.i], o2.pl), c1); if (v2 > b2) b2 = v2; } v = v * .5 + b2 * .5 + pay(r, combo) * 7; }
    if (!best || v > best.v) best = { ...o, v }; }
  return best; }
function baseMove(mats, pcs, rnd, bot) { const os = opts(mats, pcs); if (!os.length) return null; const scored = [];
  for (const o of os) { const r = place(mats, pcs[o.i], o.pl); let v = shapeVal(r.m) + r.n * 9 + (r.m.every(x => !x) ? 30 : 0);
    if (dead(r.m, pcs.map((p, j) => j === o.i ? null : p)) && !(bot === 'mid' && rnd() < .2)) v -= 400; scored.push({ ...o, v }); }
  scored.sort((a, b) => b.v - a.v); if (bot === 'mid') { const top = scored.slice(0, 4); return rnd() < .22 ? top[Math.floor(rnd() * top.length)] : top[0]; } return scored[0]; }

function run(zi, j, seed, bot) {
  const def = { ...D.boardParams(zi, j) }, rnd = D.rng(seed * 7919 + 13), VAL = D.VAL; const mats = prefill(def, rnd);
  const common = def.ores.filter(k => D.ORES[k].p >= .1)[0] || def.ores[0];
  let streak = 0, miss = 0, score = 0, combo = 0, since = 0, moves = 0, bigNext = false, sets = 0, y = 0, raw = 0, spY = 0, multSum = 0, clears = 0, ac = 0; const dealt = {};
  const end = (caved) => ({ caved, pass: !caved && score >= def.target * (OLD ? 1 : PASS), y, raw, spY, moves, score, target: def.target, multAvg: clears ? multSum / clears : 0, ac });
  while (true) { const [lo, hi] = bitsOf(mats);
    if (!OLD && sets >= SETS[zi]) return end(false);
    let set; if (bigNext && lo === 0 && hi === 0) { set = C.BIG_IDS.map(ids => C.SHAPES[ids[Math.floor(rnd() * ids.length)]]); bigNext = false; } else set = C.chooseSet(lo, hi, def.d, { rnd });
    sets++; const out = []; set.forEach(s => out.push(C.dressPiece(s, def, { rnd, dealt, specialBlocked: out.some(p => p.mats.some(m => D.SPECIAL_MIX[m])) }))); const pcs = out.slice();
    while (pcs.some(Boolean)) { const mv = bot === 'skilled' ? skilledMove(mats, pcs, streak) : baseMove(mats, pcs, rnd, bot);
      if (!mv) return end(true);
      const p = pcs[mv.i]; pcs[mv.i] = null; moves++; score += p.cells.length; p.cells.forEach(([r, c], k) => { mats[(mv.pl.r0 + r) * 8 + mv.pl.c0 + c] = p.mats[k]; });
      const { n, kill } = lines(mats); let oreN = 0, gemN = 0;
      if (n) { combo++; since = 0; streak++; miss = 0;
        kill.forEach(k => { const m = mats[k]; if (m && D.SPECIAL_MIX[m]) { const sp = D.specialHaul(m, zi, rnd); spY += sp.n; if (OLD) y += sp.n * (D.YIELD_W[sp.k] || 0); score += sp.pts; mats[k] = null; return; }
          if (m) { if (isOre(m)) { if (m === 'emerald' || m === 'diamond') gemN++; else oreN++; raw += OLD ? D.YIELD_W[m] : 1; } score += VAL[m] || 0; mats[k] = null; } });
        score += D.lineScore(n, combo); } else { since++; if (since >= 3) combo = 0; if (++miss > GRACE) streak = 0; }
      const [a, b] = bitsOf(mats), acNow = n > 0 && a === 0 && b === 0; if (acNow) { score += Math.max(10, Math.round(def.target * .15 / 10) * 10); bigNext = true; ac++; }
      if (n) { clears++;
        if (OLD) { const g = {}; kill.forEach(() => 0); }
        const m = OLD ? 1 + Math.min(1.5, (D.BONUS_LINES[Math.min(n, 5)] || 0) + (combo >= 5 ? .25 : combo >= 3 ? .1 : 0) + (acNow ? 1 : 0))   : mult(n, streak); multSum += m;
        y += Math.round(oreN * m) + gemN * Math.min(2, Math.round(m)) + (!OLD && acNow ? 3 : 0); }
      if (OLD && score >= def.target) return end(false);
      const [lo2, hi2] = bitsOf(mats); if (pcs.some(Boolean) && pcs.every(q => !q || !C.SHAPES[q.sid].pl.some(pl => !(lo2 & pl.lo) && !(hi2 & pl.hi)))) return end(true); } } }

for (const zi of ZS) { const z = D.ZONES[zi]; const js = [0, Math.floor(z.boards / 2), z.boards - 1].filter((v, i, a) => a.indexOf(v) === i && !D.boardParams(zi, v).starWood);
  const res = {}; for (const bot of ['mid', 'planner', 'skilled']) { const R = []; for (const j of js) for (let k = 0; k < RUNS; k++) R.push(run(zi, j, 5000 + 1000 * zi + 100 * j + k, bot)); res[bot] = R; }
  const ok = R => R.filter(r => r.pass);
  const L = [q(ok(res.mid).map(r => r.y), .1), q(ok(res.mid).map(r => r.y), .6), q(ok(res.skilled).map(r => r.y), .6)].map((v, i) => Math.max(i + 1, v));
  console.log(`${z.name}  ${OLD ? 'old rules' : `new rules, ${SETS[zi]} sets`}   lines (mid p10 / mid p50 / skilled p60): ${L.join('/')}`);
  for (const bot of ['mid', 'planner', 'skilled']) { const R = res[bot], P = ok(R), st = [0, 0, 0, 0]; P.forEach(r => st[D.starsFromYield(r.y, L)]++); const pc = x => Math.round(100 * x / R.length) + '%';
    console.log(`  ${bot.padEnd(8)} pass ${pc(P.length)} cave-in ${pc(R.filter(r => r.caved).length)}  yield p10/50/90 ${q(P.map(r => r.y), .1)}/${q(P.map(r => r.y), .5)}/${q(P.map(r => r.y), .9)}  ` +
      `raw ore ${q(P.map(r => r.raw), .5)}  avg mult ${(P.reduce((t, r) => t + r.multAvg, 0) / Math.max(1, P.length)).toFixed(2)}  placements ${q(R.map(r => r.moves), .5)}  score/target ${(q(R.map(r => r.score / r.target), .5)).toFixed(2)}  ` +
      `stars of all runs 0-3: ${[R.length - P.length + st[0], st[1], st[2], st[3]].map(pc).join(' ')}  specials to stash/run ${(R.reduce((t, r) => t + r.spY, 0) / R.length).toFixed(1)}`); } }
