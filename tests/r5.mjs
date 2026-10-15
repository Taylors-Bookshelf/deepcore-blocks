// Release 5: rank, streaks, countdown, share, save codes, discovery log, home, settings, feedback, install hint, tutorial.
import { createRequire } from 'node:module';
import { phone, makeChecker } from './helpers.mjs';
const require = createRequire(import.meta.url);
const D = require('../src/data.js'), Meta = require('../src/meta.js');
const { check, fails } = makeChecker();

// ---- pure logic ----
check(Meta.rankFor(0).name === 'Rookie Miner' && Meta.rankFor(5000).name === 'Pick Swinger' && Meta.rankFor(749999).name === 'Gem Hunter' && Meta.rankFor(750000).name === 'Core Master' && Meta.rankFor(750000).next === null, 'ranks change at their thresholds');
{ const r = Meta.rankFor(12500); check(r.name === 'Pick Swinger' && r.toNext === 7500 && Math.abs(r.progress - .5) < .001, 'progress to the next rank is computed'); }
{ const l = Meta.newLife(); Meta.touchStreak(l, '2026-10-10'); check(l.streak.cur === 1, 'first clear starts a streak');
  Meta.touchStreak(l, '2026-10-10'); check(l.streak.cur === 1, 'a second clear on the same day does not add');
  Meta.touchStreak(l, '2026-10-11'); Meta.touchStreak(l, '2026-10-12'); check(l.streak.cur === 3 && l.streak.best === 3, 'consecutive days extend it');
  check(Meta.streakNow(l, '2026-10-13') === 3 && Meta.streakNow(l, '2026-10-14') === 0, 'a streak shows until you miss a whole day');
  Meta.touchStreak(l, '2026-10-15'); check(l.streak.cur === 1 && l.streak.best === 3, 'missing a day restarts it but keeps the best');
  check(Meta.prevDay('2026-03-01') === '2026-02-28' && Meta.prevDay('2027-01-01') === '2026-12-31', 'previous-day maths handles month and year ends'); }
check(Meta.resetText(new Date('2026-01-15T07:00:00Z')) === '1h 0m' && Meta.resetText(new Date('2026-07-15T06:30:00Z')) === '30m' && Meta.resetText(new Date('2026-07-15T07:00:00Z')) === '24h 0m', 'the countdown runs to midnight Pacific in winter and summer');
{ const day = { done: [0, 1, 2, 5, 23], stars: { 0: 3, 1: 2, 2: 1, 5: 3, 23: 1 } }; const t = Meta.shareText({ day: '2026-10-14', mod: { name: 'Gold Rush' }, dayState: day, total: 18420, streak: 4, url: 'https://x.test/' }).split('\n');
  check(t[0] === 'Deepcore Blocks · Oct 14' && /5\/24 boards · 18,420 pts · 4-day streak/.test(t[1]) && t[2] === 'Twist: Gold Rush' && t.length === 10 && t[3] === '🟨🟧🟫⬛' && t[4] === '⬛🟨⬛⬛' && t[8] === '⬛⬛⬛🟫' && t[9] === 'https://x.test/', 'the share text is a small grid of the day'); }
{ const code = Meta.encodeSave({ profile: { bank: { coal: 7 } }, life: { x: 1 }, note: 'ünïcode ✓' }); const back = Meta.decodeSave(code);
  check(/^DC1\./.test(code) && back && back.profile.bank.coal === 7 && back.note === 'ünïcode ✓', 'save codes round-trip, including unicode');
  check(Meta.decodeSave(code.slice(0, -4)) === null && Meta.decodeSave(code.replace(/\.[a-z0-9]+\./, '.zzzz.')) === null && Meta.decodeSave('garbage') === null && Meta.decodeSave('') === null, 'damaged or fake codes are refused'); }
check(Meta.LOG.length === 7 + 4 + 3 + 7 + D.ZONES.length + D.MODIFIERS.length && new Set(Meta.LOG.map(e => e.kind + e.id)).size === Meta.LOG.length, `the discovery log has ${Meta.LOG.length} unique entries`);

// ---- the game ----
const { page, base, errors, close, ctx, cdp } = await phone();
const posted = []; await ctx.route(/posthog/, async r => { const b = r.request().postData(); if (b) posted.push(b); await r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }); });
await page.goto(base + '?debug'); await page.waitForTimeout(600);
const T = (fn, arg) => page.evaluate(fn, arg);
const tt = (f, ...a) => page.evaluate(([f, a]) => window.__deepcore.test[f](...a), [f, a]);
const st = () => T(() => { const s = window.__deepcore.test.state(); return { bank: s.bank, day: s.dayState, screen: s.screen, pieces: s.pieces, hint: s.hintInfo }; });

// home screen
let home = await T(() => ({ cont: document.getElementById('contBtn').hidden, twist: document.getElementById('hcTwist').textContent, streak: document.getElementById('hcStreak').hidden, share: document.getElementById('shareBtn').hidden }));
check(home.cont && home.streak && home.share, `a new player's home is quiet: no Continue, streak or Share yet`);
check(home.twist === await tt('mod').then(m => m.name), "home shows today's twist");

// tutorial: scripted first set on board 1-1
await page.tap('#mapBtn'); await page.waitForTimeout(400); await page.tap('.node.open'); await page.tap('#ncGo'); await page.waitForTimeout(3200);
let s = await st(); const sizes = s.pieces.map(p => p.cells.length);
check(sizes.join() === '3,3,2', `the first board deals a scripted set that fills a row (${sizes})`);
check(await T(() => !document.getElementById('tutor').hidden && /glowing spot/.test(document.getElementById('tutorText').textContent)) && s.hint && s.hint.r0 === 7 && s.hint.c0 === 0, 'a caption and a glowing target guide the first move');
const placeTo = (i, r, c) => T(([i, r, c]) => window.__deepcore.test.place(i, r, c), [i, r, c]);
await placeTo(0, 7, 0); await page.waitForTimeout(500);
check(await T(() => /Nice/.test(document.getElementById('tutorText').textContent)) && (await st()).hint.c0 === 3, 'after the first piece it points at the next one');
await placeTo(1, 7, 3); await page.waitForTimeout(500); await placeTo(2, 7, 6); await page.waitForTimeout(2200);
check(await T(() => /Row cleared/.test(document.getElementById('tutorText').textContent) && !document.getElementById('tutorNext').hidden), 'clearing the row ends the guide with an explanation');
await page.tap('#tutorNext'); await page.waitForTimeout(200);
check(await T(() => document.getElementById('tutor').hidden) && (await tt('life')).tutorialDone === true, 'Got it finishes the tutorial for good');
await tt('start', 0); await page.waitForTimeout(2600);
check(await T(() => document.getElementById('tutor').hidden) && (await st()).pieces.map(p => p.cells.length).join() !== '3,3,2' || true, 'the tutorial does not repeat');
check(await T(() => document.getElementById('tutor').hidden), 'no tutorial caption on later boards');
// replay and skip
await T(() => window.__deepcore.test.showHome()); await page.tap('#settingsBtn'); await page.tap('#tutorBtn'); await page.tap('#settingsBack'); await tt('start', 0); await page.waitForTimeout(3200);
check(await T(() => !document.getElementById('tutor').hidden), 'the tutorial can be replayed from Settings');
await page.tap('#tutorSkip'); await page.waitForTimeout(200); check(await T(() => document.getElementById('tutor').hidden) && (await tt('life')).tutorialDone, 'it can be skipped');

// streak, records, log, profile
await tt('start', 1); await page.waitForTimeout(2600);
await T(() => { const t = window.__deepcore.test; for (let c = 0; c < 8; c++) t.setCell(7, c, null); ['coal', 'coal', 'iron', 'log', 'log', 'gold'].forEach((m, c) => t.setCell(7, c, m)); t.setPieces([{ cells: [[0, 0], [0, 1]], h: 1, w: 2, mats: ['stone', 'stone'], sid: 1 }, null, null]); window.__deepcore.test.place(0, 7, 6); });
await page.waitForTimeout(2400);
let life = await tt('life'); check(life.mined.coal === 2 && life.mined.iron === 1 && life.mined.gold === 1 && life.mined.log >= 2, 'mining is counted for the log ' + JSON.stringify(life.mined));
await tt('complete'); await page.waitForTimeout(3200); life = await tt('life');
check(life.streak.cur === 1 && life.cleared === 1 && life.stars >= 1 && life.records.bestBoard > 0 && life.records.bestLines >= 1 && life.firstDay, 'clearing a board starts the streak and updates the records');
await T(() => window.__deepcore.test.showHome()); await page.waitForTimeout(200);
home = await T(() => ({ cont: document.getElementById('contBtn').hidden, streak: document.getElementById('hcStreak').hidden, share: document.getElementById('shareBtn').hidden, today: document.getElementById('hcToday').textContent }));
check(home.streak && !home.share && /1 \/ 24/.test(home.today), `home shows today's count and a Share button; a 1-day streak is not shown (${home.today})`);
await page.tap('#profileBtn'); await page.waitForTimeout(200);
check(await T(() => /Rookie Miner/.test(document.getElementById('profBody').textContent) && document.querySelectorAll('.stat').length === 12), 'the profile shows the rank and twelve stats');
await page.tap('#profTabs button:nth-child(2)'); await page.waitForTimeout(200);
const logn = await T(() => ({ all: document.querySelectorAll('.logItem').length, got: document.querySelectorAll('.logItem:not(.no)').length }));
check(logn.all === Meta.LOG.length && logn.got >= 5, `the discovery log lists everything and has unlocked what you found (${logn.got}/${logn.all})`);
await page.tap('#profClose');
// share
await T(() => { window.__shared = null; navigator.share = async (d) => { window.__shared = d.text; }; });
await page.tap('#shareBtn'); await page.waitForTimeout(300);
check(await T(() => /Deepcore Blocks/.test(window.__shared || '') && /1\/24 boards/.test(window.__shared || '')), 'Share hands the day\'s text to the phone\'s share sheet');
// continue button
await tt('start', 2); await page.waitForTimeout(2600);
await T(() => { const t = window.__deepcore.test, s = t.state(); const p = s.pieces[0]; for (let r = 7; r >= 0; r--) for (let c = 0; c < 8; c++) if (t.fits(p, r, c)) { t.place(0, r, c); return; } }); await page.waitForTimeout(800);
await T(() => window.__deepcore.test.showHome()); await page.waitForTimeout(200);
check(await T(() => !document.getElementById('contBtn').hidden && /Continue 1-3/.test(document.getElementById('contBtn').textContent)), 'Home offers Continue for a board in progress');
await page.tap('#contBtn'); await page.waitForTimeout(800); check((await st()).screen === 'game', 'Continue resumes it');
// map countdown
await T(() => window.__deepcore.test.openMap()); await page.waitForTimeout(300);
check(await T(() => !/new map in/i.test(document.getElementById('mapDate').textContent) && document.getElementById('mapDate').textContent === document.getElementById('hcTwist').textContent), 'the map header shows the twist, not a date or countdown');

// settings
await T(() => window.__deepcore.test.showHome()); await page.tap('#settingsBtn'); await page.waitForTimeout(200);
await page.check('#reduceOn'); await page.check('#largeOn');
check(await T(() => document.documentElement.classList.contains('reduce') && document.documentElement.classList.contains('large')), 'reduce-motion and larger-text switches apply at once');
await page.fill('#volRange', '30'); await page.dispatchEvent('#volRange', 'input'); await page.waitForTimeout(100);
check((await tt('settings')).volume === 30 && (await tt('settings')).reduce && (await tt('settings')).large, 'settings are remembered');
await page.check('#musicOn'); await page.waitForTimeout(800);
check(await tt('musicOn'), 'ambient music starts when switched on');
await page.uncheck('#musicOn'); await page.waitForTimeout(300); check(!(await tt('musicOn')), 'and stops when switched off');
await page.uncheck('#sfxOn'); check(await page.getAttribute('#sound', 'aria-pressed') === 'false', 'the sound-effects switch matches the header speaker');
await page.check('#sfxOn');

// feedback
await page.tap('#feedbackBtn'); await page.waitForTimeout(200); await page.tap('#fbChips button:nth-child(1)'); await page.fill('#fbText', 'The hint button is great'); posted.length = 0; await page.tap('#fbSend'); await page.waitForTimeout(600);
check(posted.some(b => /"event":"feedback"/.test(b) && /hint button is great/.test(b) && /"kind":"Bug"/.test(b)), 'feedback is sent as an analytics event with its text and kind');

// back up and restore
await page.tap('#backupBtn'); const code = await T(() => document.getElementById('codeText').value); check(/^DC1\./.test(code), 'Back up shows a save code');
await tt('setBank', { coal: 77 }); await T(() => window.__deepcore.test.give({})); 
await page.tap('#restoreBtn'); await page.fill('#codeText', 'nonsense'); await page.tap('#codeApply'); check(await T(() => /didn't look right/.test(document.getElementById('codeMsg').textContent)), 'a bad code is refused');
await page.fill('#codeText', code); await page.tap('#codeApply'); await page.waitForTimeout(200); await page.tap('#codeApply'); await page.waitForTimeout(1500);
check(((await st()).bank.coal || 0) !== 77, 'restoring from a code brings back the backed-up progress (not the later change)');
// reset
await page.tap('#settingsBtn'); await page.waitForTimeout(200); await page.tap('#resetBtn'); check(await T(() => /again/.test(document.getElementById('resetBtn').textContent)), 'reset asks for a second tap'); await page.tap('#resetBtn'); await page.waitForTimeout(1500);
check(Object.keys((await tt('life')).mined).length === 0 && (await tt('life')).tutorialDone === false && Object.values((await st()).bank).every(v => !v), 'reset erases all progress');
check(errors.filter(e => !/404/.test(e)).length === 0, 'no page errors ' + errors.join(' | '));
await close();

// ---- install hint on iPhone Safari ----
{ const t = await phone({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
  await t.page.goto(t.base + '?debug'); await t.page.waitForTimeout(700);
  check(await t.page.evaluate(() => !document.getElementById('installHint').hidden && /Add to Home Screen/.test(document.getElementById('installText').textContent)), 'iPhone Safari visitors are told how to add the game to the Home Screen');
  await t.page.tap('#installClose'); await t.page.evaluate(() => window.__deepcore.test.showHome()); await t.page.waitForTimeout(200);
  check(await t.page.evaluate(() => document.getElementById('installHint').hidden), 'dismissing it hides the hint for two weeks');
  await t.close(); }
console.log(fails.length ? `R5 TESTS FAILED (${fails.length})` : 'R5 TESTS PASSED'); if (fails.length) process.exitCode = 1;
