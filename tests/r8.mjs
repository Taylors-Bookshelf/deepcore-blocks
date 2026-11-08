// v2.1.1 release tests: hint confirmation and coal flight, Guide pill, placements left, numbered board names,
// centred pause card with icon buttons and an exit confirmation.
import { phone, makeChecker } from './helpers.mjs';
const { check, fails } = makeChecker();
const shots = process.env.SHOTS;   // a folder to save screenshots in, when set
const { page, base, errors, close } = await phone();
await page.goto(base + '?debug'); await page.waitForFunction(() => window.__deepcore);
const T = (f, a) => page.evaluate(([f, a]) => window.__deepcore.test[f](a), [f, a]);
await T('setBank', { coal: 40, copper: 3 }); await T('start', 9); await page.waitForTimeout(2600);

// header: numbered name on two lines, Guide pill beside Hint
const hdr = await page.evaluate(() => ({ name: document.getElementById('zoneName').innerText, aria: document.getElementById('zoneName').getAttribute('aria-label'),
  guide: document.getElementById('infoBtn').innerText.trim(), cut: (() => { const b = document.querySelector('#zoneName b'); return b.scrollWidth > b.clientWidth + 1; })() }));
check(hdr.name === 'Limestone Caves\nBoard #2' && hdr.aria === 'Limestone Caves board #2' && !hdr.cut, `the header shows the layer over "Board #2" (${JSON.stringify(hdr.name)})`);
check(hdr.guide === 'Guide', 'the guide button reads "Guide"');
await page.click('#infoBtn'); check(await page.textContent('#infoTitle') === 'Guide', 'the guide opens titled "Guide"'); await page.click('#infoClose');

// placements made (v2.4.0, endless boards): 0 at the start, 1 after one placement
const pg = () => page.textContent('#pgoal');
check(await pg() === '0 placements', `the score shows the placements made (${await pg()})`);
const placed = await page.evaluate(() => { const t = window.__deepcore.test; const s = t.state(); for (let i = 0; i < 3; i++) if (s.pieces[i]) for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if (t.place(i, r, c)) return true; return false; });
await page.waitForTimeout(900);
check(placed && await pg() === '1 placement', `one placement counts 1 (${await pg()})`);
if (shots) await page.screenshot({ path: shots + '/board.png' });

// hint: confirm first; Cancel keeps the coal; yes flies 5 coal into the button and then shows the hint
await page.waitForFunction(() => !document.getElementById('hintBtn').disabled, null, { timeout: 4000 }).catch(() => {});
check(!await page.$eval('#hintBtn', b => b.disabled), 'Hint is ready with 5 or more coal');
await page.click('#hintBtn'); await page.waitForTimeout(250);
const q = await page.evaluate(() => ({ open: !document.getElementById('askScrim').hidden, t: document.getElementById('askTitle').textContent }));
check(q.open && /5 coal/.test(q.t), `Hint asks before spending coal ("${q.t}")`);
if (shots) await page.screenshot({ path: shots + '/hint-ask.png' });
await page.click('#askNo'); await page.waitForTimeout(150);
check((await T('state')).bank.coal === 40 && !(await T('state')).hintInfo, 'Cancel keeps the coal and shows no hint');
await page.click('#hintBtn'); await page.waitForTimeout(200); await page.click('#askYes');
await page.waitForTimeout(150);
check((await T('state')).bank.coal === 35, 'yes spends 5 coal');
check(await page.evaluate(() => window.__deepcore.test.fx().fxList) >= 3, 'the coal flies to the Hint button');
await page.waitForTimeout(1200);
check(!!(await T('state')).hintInfo, 'the hint shows once the coal has landed');

// pause: a centred card, next star line, icon buttons; exit asks first
await page.click('#pauseBtn'); await page.waitForTimeout(350);
const p = await page.evaluate(() => { const sh = document.getElementById('sheet').getBoundingClientRect(); return { cx: sh.left + sh.width / 2, cy: sh.top + sh.height / 2, w: sh.width, vw: innerWidth, vh: innerHeight,
  text: document.getElementById('sheet').innerText, btnW: document.getElementById('pauseResume').getBoundingClientRect().width }; });
check(Math.abs(p.cx - p.vw / 2) < 2 && Math.abs(p.cy - p.vh / 2) < 40 && p.w < p.vw - 20, 'pause is a centred card, not a full-width tray');
check(/Limestone Caves board #2/.test(p.text) && new RegExp(`Next star at: ${(await page.evaluate(() => window.DeepcoreData.STAR_LINES[1][0])).toLocaleString('en-US')} points`).test(p.text) && !/best here|Star lines/i.test(p.text), 'pause shows the numbered name and the next star line only');
check(p.btnW <= 70, 'the pause buttons are round icons');
if (shots) await page.screenshot({ path: shots + '/pause.png' });
check(/Placements on this board: 1/.test(p.text), 'pause shows the placements on this board');
await page.click('#pauseQuit'); await page.waitForTimeout(200);
check(/Exit to map\?/.test(await page.textContent('#askTitle')) && (await T('state')).screen === 'game', 'exit asks before leaving');
if (shots) await page.screenshot({ path: shots + '/exit-ask.png' });
await page.click('#askNo'); await page.waitForTimeout(150);
check((await T('state')).screen === 'game' && !await page.$eval('#sheetScrim', e => e.hidden), 'No stays on the pause card');
await page.click('#pauseQuit'); await page.waitForTimeout(150); await page.click('#askYes'); await page.waitForTimeout(600);
check((await T('state')).screen === 'map', 'Yes goes to the map');

check(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
await close();
if (fails.length) { console.error(`\n${fails.length} failed`); process.exit(1); } else console.log('\nall v2.1.1 checks passed');
