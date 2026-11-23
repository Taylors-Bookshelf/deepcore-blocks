// v2.9.0 release tests: forging only once the next layer is reached, with a full-screen moment (I-40); the craft confirm without the
// cost (I-41); the empty-belt nudge before a board (I-42); the star cart's exit arrow and first-star cue (I-43); "Map" on home (I-44);
// and every picked sound plays without errors (I-39). Daily boosts (I-45) are checked in r4.
import { phone, makeChecker } from './helpers.mjs';
const { check, fails } = makeChecker();
const { page, base, errors, close } = await phone();
await page.goto(base + '?debug'); await page.waitForFunction(() => window.__deepcore);
const T = (f, a) => page.evaluate(([f, a]) => window.__deepcore.test[f](a), [f, a]);
const rich = { bone: 90, wood: 90, coal: 300, copper: 200, iron: 200, ruby: 90, gold: 60, emerald: 9, diamond: 9, meteorite: 40, prismore: 20 };
const ask = () => page.evaluate(() => ({ open: !document.getElementById('askScrim').hidden, title: document.getElementById('askTitle').textContent, text: document.getElementById('askText').textContent }));

// ---- forging: not before the next layer is reached ----
await T('give', rich); await T('openMap'); await page.waitForTimeout(400);
await T('openCraft'); await page.waitForTimeout(300);
const info = await page.textContent('#craftBody .toolinfo');
check(/needed for Limestone Caves/.test(info), `before the Forest is cleared, the next tools say what they're needed for ("${info.trim().slice(0, 60)}")`);
await page.click('#craftBody .tt.next'); await page.waitForTimeout(200);
let q = await ask(); check(q.open && /Needed for Limestone Caves/.test(q.text) && (await T('run')).tool === 0, `tapping them explains instead of forging ("${q.text}")`);
await page.click('#askYes'); await page.waitForTimeout(150);
await T('markDone', [0, 1, 2, 3, 4, 5, 6, 7]); await T('openMap'); await page.waitForTimeout(300); await T('openCraft'); await page.waitForTimeout(300);
await page.click('#craftBody .tt.next'); await page.waitForTimeout(200);
q = await ask(); check(q.open && /Forge/.test(q.title) && !/\d/.test(q.text), `once the Forest is cleared they forge (asks first, no cost in the question: "${q.text}")`);
await page.click('#askYes'); await page.waitForTimeout(500);
const fm = await page.evaluate(() => ({ shown: !document.getElementById('forgeMoment').hidden, title: document.getElementById('fmTitle').textContent, sub: document.getElementById('fmSub').textContent, craft: !document.getElementById('craftPanel').hidden }));
check(fm.shown && fm.title === 'Bone tools forged!' && /Limestone Caves is open/.test(fm.sub) && !fm.craft, `forging takes over the screen: "${fm.title}" / "${fm.sub}", Craft closed`);
check((await T('run')).tool === 1, 'the tools are forged');
await page.waitForTimeout(400); await page.click('#fmGo'); await page.waitForTimeout(500);
check(await page.evaluate(() => document.getElementById('forgeMoment').hidden && !document.getElementById('map').hidden), 'Dig down returns to the map');

// ---- craft confirm: no cost; the warning names what the next tools need, without counts ----
await T('setBank', { ...rich, iron: 40, coal: 100 }); await T('openCraft'); await page.waitForTimeout(300);
await page.click('#craftBody [data-id="drill"]'); await page.waitForTimeout(200);
q = await ask(); check(q.open && !/Uses|coal \d|\d+ coal/.test(q.text), `crafting asks without listing the cost ("${q.text}")`);
await page.click('#askNo'); await page.waitForTimeout(150);
await T('setBank', { ...rich, copper: 52, coal: 60, iron: 10, ruby: 30, gold: 10 });
await page.click('#craftBody [data-id="sledgehammer"]'); await page.waitForTimeout(200);
q = await ask(); check(q.open && /Heads up: Copper tools need copper too/.test(q.text) && !/\d/.test(q.text), `eating into the next tools warns in words only ("${q.text}")`);
await page.click('#askNo'); await page.waitForTimeout(150); await page.click('#craftClose').catch(() => {}); await page.waitForTimeout(200);

// ---- empty-belt nudge before a Limestone board ----
await T('setBank', rich); await T('setRun', { wk: {} });
await T('openMap'); await page.waitForTimeout(400);
await page.evaluate(() => { const b = [...document.querySelectorAll('.node.open')].find(n => /Board L-1/.test(n.getAttribute('aria-label'))); b.click(); }); await page.waitForTimeout(300);
q = await ask(); check(q.open && q.title === 'Your belt is empty' && /Craft a special first/.test(q.text), 'starting a Limestone board with an empty belt and plenty to craft with asks first');
await page.click('#askNo'); await page.waitForTimeout(2600);
check((await T('state')).screen === 'game', 'Play anyway starts the board');

// ---- the star cart: exit arrow and the first-star cue ----
const at = (await T('def')).starAt;
check(await page.evaluate(() => !!document.querySelector('#cartBar .exit svg')), 'the exit door has an arrow');
await T('setScore', at[0] + 10); await T('bar'); await page.waitForTimeout(100);
check(await page.evaluate(() => document.getElementById('cartBar').classList.contains('cue')), 'the first star gives the cart bar a short cue');
await page.waitForTimeout(4600);
check(await page.evaluate(() => !document.getElementById('cartBar').classList.contains('cue')), 'and the cue ends by itself');

// ---- "Map" on the home screen while a board is in progress ----
await T('setMoves', 3); await T('saveBoardNow'); await T('showHome'); await page.waitForTimeout(300);
check((await page.textContent('#mapBtn')).trim() === 'Map', `the home button reads "Map" while a board is in progress (${(await page.textContent('#mapBtn')).trim()})`);
// the nudge comes once a day: the same day, no question
await page.evaluate(() => window.__deepcore.test.openMap()); await page.waitForTimeout(300);

// ---- every picked sound plays without errors ----
const keys = await T('sndKeys');
check(keys.length >= 28, `${keys.length} new sounds are defined (the line clear, ore landing and Blast Charge fuse keep their old sounds)`);
const bad = await page.evaluate(ks => ks.filter(k => { try { window.__deepcore.test.snd(k); return false; } catch (e) { return true; } }), keys);
check(!bad.length, `every sound plays without errors (${bad.join(', ')})`);

check(errors.filter(e => !/404/.test(e)).length === 0, `no page errors (${errors.join(' | ')})`);
await close();
if (fails.length) { console.error(`\n${fails.length} check(s) failed`); process.exit(1); }
console.log('\nall v2.9.0 checks passed');
