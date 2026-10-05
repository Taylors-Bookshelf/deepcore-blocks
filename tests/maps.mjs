// Daily map tests: the generator is deterministic, every day is different, always playable; and the renderer works for many days.
import { createRequire } from 'node:module';
import { phone, makeChecker } from './helpers.mjs';
const require = createRequire(import.meta.url);
const Maps = require('../src/maps.js');
const { check, fails } = makeChecker();

const days = Array.from({ length: 60 }, (_, i) => `2026-${String(1 + Math.floor(i / 28)).padStart(2, '0')}-${String(1 + i % 28).padStart(2, '0')}`);
const maps = days.map(d => Maps.genMap(d));
check(JSON.stringify(Maps.genMap(days[3])) === JSON.stringify(maps[3]), 'the same day always gives the same map');
check(maps.every(m => m.nodes.length === 20 && m.strip.length === 5), 'every map has 20 boards and 5 strip-mine branches');
check(maps.every(m => m.nodes.every(n => n.x >= 1.4 && n.x <= 8.6)), 'all boards sit inside the map width');
check(maps.every(m => m.nodes.every((n, i) => i === 0 || (n.y > m.nodes[i - 1].y && Math.hypot(n.x - m.nodes[i - 1].x, n.y - m.nodes[i - 1].y) >= 1.5))), 'boards descend and are never crowded together');
check(maps.every(m => m.strip.every(s => s.x >= 1 && s.x <= 9 && m.nodes.every((n, i) => Math.hypot(n.x - s.x, n.y - s.y) >= 1.5 || i === s.from))), 'strip-mine nodes keep clear of other boards');
check(maps.every(m => !m.lake || Math.abs(m.nodes[0].x - (m.lake.x0 + m.lake.x1) / 2) > 1.6), 'a lake never covers the first board');
const uniq = k => new Set(maps.map(m => typeof k === 'function' ? k(m) : m[k])).size;
check(uniq('weather') >= 6, `weather varies (${uniq('weather')} kinds in 60 days)`);
check(uniq('scenery') >= 3, `scenery varies (${uniq('scenery')} kinds)`);
check(uniq('trees') >= 4, `tree types vary (${uniq('trees')} kinds)`);
check(uniq(m => m.tunnelW.join()) >= 20, 'tunnel widths vary by zone and day');
check(uniq(m => m.nodes.map(n => Math.round(n.x)).join()) >= 55, 'the shaft winds differently almost every day');
check(uniq(m => m.segs.map(s => s.pts.length).join()) >= 20, 'tunnel shapes (straight, elbow, wiggle) vary');
check(maps.filter(m => m.lake).length >= 8 && maps.filter(m => !m.lake).length >= 8, 'some days have water nearby, some do not');

// render several different days in a real browser and check nothing breaks
const { page, base, errors, close } = await phone();
await page.goto(base + '?debug'); await page.waitForTimeout(500);
await page.tap('#mapBtn'); await page.waitForTimeout(400);
let drawn = 0;
for (let i = 0; i < 14; i++) { await page.evaluate(([d, full]) => { const t = window.__deepcore.test; t.markDone(full ? Array.from({ length: 20 }, (_, k) => k) : [0, 1, 2]); t.previewDay(d); }, [days[i * 4], i % 2 === 0]); drawn++; }
check(drawn === 14 && errors.length === 0, `14 different days draw without errors (${errors.join(' | ')})`);
await close();
console.log(fails.length ? `MAP TESTS FAILED (${fails.length})` : 'MAP TESTS PASSED'); if (fails.length) process.exitCode = 1;
