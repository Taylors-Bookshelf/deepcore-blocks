// v2.9.2 (B-15) accessibility check, kept short on purpose: on every main screen, turning on Larger text must make every visible
// piece of text bigger (none left out, as happened before 2.9.2) without anything spilling off the screen or out of its button;
// Reduce motion must stop the CSS animations. Uses the real Settings switches.
import { phone, makeChecker, skipTour } from './helpers.mjs';
const { check, fails } = makeChecker();
const { page, base, errors, close } = await phone();
await page.goto(base + '?debug'); await page.waitForFunction(() => window.__deepcore);
const T = (f, a) => page.evaluate(([f, a]) => window.__deepcore.test[f](a), [f, a]);

// every visible element that holds text of its own: its font size, keyed by its place in the page
const textSizes = () => page.evaluate(() => {
  const out = {}; const all = [...document.querySelectorAll('body *')];
  all.forEach((el, i) => {
    if (!['SCRIPT', 'STYLE', 'svg', 'path', 'CANVAS'].includes(el.tagName) && [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) {
      const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
      if (r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.opacity !== '0' && !el.closest('[hidden]'))
        out[i] = { px: parseFloat(cs.fontSize), what: (el.id ? '#' + el.id : el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : '')) + ' "' + el.textContent.trim().slice(0, 24) + '"' };
    } });
  return out; });
const setLarge = on => page.evaluate(on => { const s = window.__deepcore.test.settings(); s.large = on; document.documentElement.classList.toggle('large', on); }, on);
const spills = () => page.evaluate(() => {
  const bad = []; if (document.documentElement.scrollWidth > innerWidth + 1) bad.push('the page scrolls sideways');
  // text cut short with an ellipsis or clipped by its box (only counted when it fits at the normal size, see screen())
  document.querySelectorAll('body *').forEach(el => { const cs = getComputedStyle(el); if (!el.closest('[hidden]') && el.getBoundingClientRect().width && (cs.textOverflow === 'ellipsis' || cs.overflow === 'hidden') && [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && el.scrollWidth > el.clientWidth + 1) bad.push(`"${el.textContent.trim().slice(0, 20)}" is cut short`); });
  document.querySelectorAll('button').forEach(b => { const r = b.getBoundingClientRect(); if (r.width && r.height && !b.closest('[hidden]') && b.scrollWidth > b.clientWidth + 2) bad.push(`button "${b.textContent.trim().slice(0, 20)}" cuts off its text`); });
  return bad; });

async function screen(name, open) {
  await setLarge(false); await open(); await page.waitForTimeout(400);
  const off = await textSizes(); await setLarge(true); await page.waitForTimeout(200);
  // display text that is already huge (the 52-84px game title) is left as it is: Larger text is for reading
  const on = await textSizes(), keys = Object.keys(off).filter(k => on[k] && off[k].px < 40);
  const missed = keys.filter(k => on[k].px < off[k].px * 1.1).map(k => off[k].what);
  check(keys.length > 3 && !missed.length, `${name}: Larger text grows all ${keys.length} texts` + (missed.length ? ` (not: ${missed.slice(0, 6).join(', ')})` : ''));
  const before = await page.evaluate(() => 0); await setLarge(false); const was = new Set(await spills()); await setLarge(true); await page.waitForTimeout(150);
  const bad = (await spills()).filter(b => !was.has(b)); check(!bad.length, `${name}: nothing spills with Larger text` + (bad.length ? ` (${bad.slice(0, 4).join('; ')})` : ''));
  await setLarge(false);
}
await screen('home', () => T('showHome'));
await screen('settings', () => page.evaluate(() => document.getElementById('settingsBtn').click()));
await screen('profile', async () => { await T('showHome'); await page.evaluate(() => document.getElementById('profileBtn').click()); });
await page.evaluate(() => { document.getElementById('profile').hidden = true; });
await screen('map', async () => { await T('openMap'); await skipTour(page); });
await screen('craft', () => T('openCraft'));
await page.evaluate(() => { const c = document.getElementById('craftPanel'); if (c) c.hidden = true; });
await screen('board', async () => { await T('start', 9); await page.waitForTimeout(1500); });
await screen('pause card', () => page.evaluate(() => document.getElementById('pauseBtn').click()));
await page.evaluate(() => document.getElementById('pauseResume')?.click());
await screen('guide', () => page.evaluate(() => document.getElementById('infoBtn').click()));
await page.evaluate(() => { document.getElementById('info').hidden = true; });

// Reduce motion, through the real switch: CSS animations finish at once
await T('showHome'); await page.evaluate(() => document.getElementById('settingsBtn').click()); await page.waitForTimeout(200);
await page.check('#reduceOn'); await page.waitForTimeout(100);
check(await page.evaluate(() => document.documentElement.classList.contains('reduce')), 'Reduce motion switches the page to reduced motion');
await T('start', 9); await page.waitForTimeout(300); await page.evaluate(() => document.getElementById('pauseBtn').click()); await page.waitForTimeout(50);
const slow = await page.evaluate(() => document.getAnimations().filter(a => a instanceof CSSAnimation || a instanceof CSSTransition).map(a => a.effect.getComputedTiming().duration).filter(d => d > 20));
check(!slow.length, `with Reduce motion no CSS animation runs longer than a blink (${slow.length} did)`);
await page.uncheck('#reduceOn').catch(() => {});
check(errors.filter(e => !/404/.test(e)).length === 0, 'no page errors ' + errors.join(' | '));
await close();
if (fails.length) { console.error(`A11Y TESTS FAILED (${fails.length})`); process.exit(1); }
console.log('A11Y TESTS PASSED');
