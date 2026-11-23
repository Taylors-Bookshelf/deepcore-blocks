// v2.9.2 release tests: core fragments survive a reload (B-10), the Core counts in records (B-11), hints climb 5/10/20 coal and stop
// at three a board (I-47), map boards carry F-1 style tags (I-48), the map says what a missed day would cost (I-49), the cart ignores
// taps while rolling and a lower replay says the map keeps the earlier stars (B-12), the Tutorial button is on home (I-52).
import { phone, makeChecker, skipTour } from './helpers.mjs';
const { check, fails } = makeChecker();
const { page, base, errors, close } = await phone();
await page.goto(base + '?debug'); await page.waitForFunction(() => window.__deepcore);
const T = (f, a) => page.evaluate(([f, a]) => window.__deepcore.test[f](a), [f, a]);

// B-10: fragments are kept through a reload
await T('fragments', 2); await page.reload(); await page.waitForFunction(() => window.__deepcore);
check(await T('fragments') === 2, 'core fragments are still there after a reload');
check(await page.evaluate(() => !document.getElementById('tutorBtn').closest('[hidden]') && !!document.querySelector('#home #tutorBtn')), 'the Tutorial button is on the home screen');

// I-47: hints cost 5, 10, 20 coal on one board, then none are left
await T('start', 9); await page.waitForTimeout(2000); await T('give', { coal: 100 });
const coal = async () => (await T('state')).bank.coal;
const hint = async () => { await page.tap('#hintBtn'); await page.waitForTimeout(200); const txt = await page.evaluate(() => document.getElementById('askTitle').textContent); await page.click('#askYes'); await page.waitForTimeout(2600); return txt; };
const c0 = await coal(); const t1 = await hint(); const c1 = await coal(); const t2 = await hint(); const c2 = await coal(); const t3 = await hint(); const c3 = await coal();
check(c0 - c1 === 5 && c1 - c2 === 10 && c2 - c3 === 20, `hints on one board cost 5, 10, then 20 coal (${c0 - c1}, ${c1 - c2}, ${c2 - c3})`);
check(/5 coal/.test(t1) && /10 coal/.test(t2) && /20 coal/.test(t3), 'each hint asks with its own price');
check(await page.evaluate(() => document.getElementById('hintBtn').disabled), 'after three hints the Hint button is off for this board');
await T('start', 9); await page.waitForTimeout(2000);
check(await page.evaluate(() => !document.getElementById('hintBtn').disabled), 'a new board starts with three hints again');

// B-12: while the cart rolls to a new score it ignores taps
await T('setScore', (await T('def')).starAt[0] + 400); await page.waitForTimeout(40);
await T('cart'); await page.waitForTimeout(100);
check(await page.evaluate(() => document.getElementById('askScrim').hidden), 'a tap on the cart while it is still rolling does nothing');
await page.waitForTimeout(4000); await T('cart'); await page.waitForTimeout(150);
check(await page.evaluate(() => document.getElementById('askTitle').textContent === 'Done here?'), 'once it stops, the tap asks "Done here?"');
await page.click('#askNo');
// a lower replay says the map keeps the earlier stars
await T('setRun', { stars: { 9: 3 } }); await T('setScore', (await T('def')).starAt[0] + 10); await page.waitForTimeout(4000);
await T('cart'); await page.waitForTimeout(150); await page.click('#askYes'); await page.waitForTimeout(1500);
check(await page.evaluate(() => /earlier in this run\. The map keeps 3★/.test(document.getElementById('sheet').textContent)), 'a 1-star replay of a 3-star board says the map keeps 3 stars');
await page.click('#resGo'); await page.waitForTimeout(2000);

// I-48 and I-49: board tags on the map, and the line under the belt
await T('openMap'); await skipTour(page); await page.waitForTimeout(400);
check(await page.evaluate(() => [...document.querySelectorAll('.node .tag')].some(t => t.textContent === 'L-2')), 'map boards carry their tag (L-2) instead of a check');
check(await page.evaluate(() => { const e = document.getElementById('mapToday'); return !e.hidden && /Played today/.test(e.textContent); }), 'after a clear today the map says your place is safe');
await T('setRun', { lastClear: '2000-01-01', done: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] }); await T('openMap'); await page.waitForTimeout(300);
check(await page.evaluate(() => { const e = document.getElementById('mapToday'); return !e.hidden && e.classList.contains('warn') && /drop back to L-2/.test(e.textContent); }), 'without a clear today it says where a missed day would send you (L-2)');

// B-11: reaching the Core counts as the deepest layer and in the discovery log
await T('openCore'); await page.waitForTimeout(300);
check(await page.evaluate(() => { const l = window.__deepcore.test.life(); return l.records.deepest === 7 && l.zones[7]; }), 'reaching the Ancient Core records it as the deepest layer and a zone reached');
check(errors.filter(e => !/404/.test(e)).length === 0, 'no page errors ' + errors.join(' | '));
await close();
if (fails.length) { console.error(`R11 TESTS FAILED (${fails.length})`); process.exit(1); }
console.log('R11 TESTS PASSED');
