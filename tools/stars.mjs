// Calibrates the star lines (v2.0.2: stars measure ore efficiency). A board ends when its score target is reached; its
// "maximum haul" is the 95th percentile of the ore value an expert bot (--bot planner) has mined by then, combo bonus ore and
// specials included. Values are scaled to each layer's first board (later boards scale with their target, as in boardParams).
// Usage: node tools/stars.mjs [--runs 40] [--bot planner] [--check mid]
//   prints HAUL_MAX (paste into src/data.js); with --check <bot> it also prints how that bot's runs spread over 0-3 stars.
import { D, args, cfg, runBoard } from './simlib.mjs';
const RUNS = +(args.runs || 40);
const q = (a, p) => { const b = [...a].sort((x, y) => x - y); return b[Math.min(b.length - 1, Math.floor(p * b.length))]; };
const groups = [];   // [zone, boards, label]
for (let zi = 0; zi < D.ZONES.length; zi++) { const z = D.ZONES[zi]; if (z.core) continue;
  const js = Array.from({ length: z.boards }, (_, j) => j).filter(j => !D.boardParams(zi, j).starWood);
  const pick = js.length <= 4 ? js : [0, 1, 2, 3].map(k => js[Math.round(k * (js.length - 1) / 3)]);
  const wood = Array.from({ length: z.boards }, (_, j) => j).filter(j => D.boardParams(zi, j).starWood);
  if (wood.length) groups.push([zi, wood, z.name + ' (wood)']);   // an ore-free board counts wood instead
  groups.push([zi, pick, z.name]); }
const measure = (zi, js, bot, runs) => { const keep = cfg.bot; cfg.bot = bot; const ys = [];
  for (const j of js) for (let k = 0; k < runs; k++) { const r = runBoard(zi, j, 5000 + 1000 * zi + 100 * j + k); if (!r.win) continue;
    const p = D.boardParams(zi, j); ys.push(D.yieldOf(r.got, p.starWood) / (p.target / D.ZONES[zi].target)); }
  cfg.bot = keep; return ys; };
const out = [];
for (const [zi, js, label] of groups) {
  const ys = measure(zi, js, args.bot || 'planner', RUNS), max = q(ys, .95);
  out.push([label, Math.round(max)]);
  console.log(`${label.padEnd(18)} expert haul at the clear: p50 ${q(ys, .5).toFixed(0)}  p95 ${max.toFixed(0)}   (${ys.length} clears)`);
  if (args.check) { const lines = D.boardParams(zi, js[0]).starAt.map(v => v / (D.boardParams(zi, js[0]).target / D.ZONES[zi].target));
    const cs = measure(zi, js, args.check, RUNS), n = [0, 0, 0, 0]; cs.forEach(y => n[D.starsFromYield(y, lines)]++);
    console.log(`   ${args.check} bot, current lines ${lines.map(v => v.toFixed(0)).join('/')}: ` + n.map((c, s) => `${s}★ ${(100 * c / Math.max(1, cs.length)).toFixed(0)}%`).join('  ')); }
}
const wood = out.filter(o => o[0].endsWith('(wood)')), ore = out.filter(o => !o[0].endsWith('(wood)'));
console.log('\nHAUL_MAX =', JSON.stringify(ore.map(o => o[1]).concat([0])), wood.length ? '  WOOD_MAX = ' + wood[0][1] : '  (no ore-free boards: WOOD_MAX unused)');
