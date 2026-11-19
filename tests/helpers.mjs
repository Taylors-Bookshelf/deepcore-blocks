// Shared test helpers: a static server for the project folder, and a phone-like browser context with real touch input.
import { chromium } from 'playwright';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const types = { '.html':'text/html', '.js':'text/javascript', '.mjs':'text/javascript', '.css':'text/css', '.png':'image/png', '.webmanifest':'application/manifest+json', '.woff2':'font/woff2' };
export function serve() {
  return new Promise(res => {
    const server = http.createServer(async (req, rs) => {
      try { let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
        const file = normalize(join(root, p)); if (!file.startsWith(root)) throw 0;
        const body = await readFile(file); rs.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream' }); rs.end(body); }
      catch { rs.writeHead(404); rs.end(); } }).listen(0, () => res({ server, base: `http://localhost:${server.address().port}/` }));
  });
}
export const SPEED = 4;
export async function phone(opts = {}) {
  const { tips, realtime, ...ctxOpts } = opts;
  const { server, base } = await serve();
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, ...ctxOpts });
  // tests must never send analytics to the real PostHog project
  await ctx.route(/posthog/, r => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  // first-time tips (v2.1.0) would cover the screen in every test; they are marked as seen unless a test asks for them ({ tips: true })
  if (!tips) await ctx.addInitScript(() => { try { if (!localStorage.getItem('deepcore-life')) localStorage.setItem('deepcore-life', JSON.stringify({ v: 1, tips: { map: 1, gate: 1, haul: 1, anvil: 1, tour: 1, cart: 1, craft: 1, drillEdge: 1 } })); } catch (e) {} });
  // Fast clock (I-38): the page's timers, animation frames, performance.now and CSS animations run SPEED times faster, and so do the
  // tests' page.waitForTimeout pauses, so every animation the tests wait out takes a quarter of the time. REALTIME=1 turns it off.
  const speed = opts.realtime || process.env.REALTIME ? 1 : SPEED;
  if (speed !== 1) await ctx.addInitScript(k => {
    const pn = performance.now.bind(performance), t0 = pn(), warp = t => t0 + (t - t0) * k;
    performance.now = () => warp(pn());
    const st = window.setTimeout, si = window.setInterval, raf = window.requestAnimationFrame;
    window.setTimeout = (f, d, ...a) => st(f, (d || 0) / k, ...a);
    window.setInterval = (f, d, ...a) => si(f, (d || 0) / k, ...a);
    window.requestAnimationFrame = f => raf(t => f(warp(t)));
    const fast = () => { try { for (const an of document.getAnimations()) if (an.playbackRate !== k) an.playbackRate = k; } catch (e) {} raf(fast); };
    raf(fast);
  }, speed);
  const page = await ctx.newPage(); const errors = [];
  if (speed !== 1) { const wait = page.waitForTimeout.bind(page); page.waitForTimeout = ms => wait(ms / speed); }
  page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  const cdp = await ctx.newCDPSession(page);
  const close = async () => { await browser.close(); server.close(); };
  return { server, base, browser, ctx, page, cdp, errors, close };
}
// A finger drag through Chrome's touch input, so the game sees real touch pointer events.
export async function touchDrag(page, cdp, from, to, steps = 12) {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: from[0], y: from[1], id: 1 }] });
  for (let i = 1; i <= steps; i++) { const t = i / steps;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: from[0] + (to[0] - from[0]) * t, y: from[1] + (to[1] - from[1]) * t, id: 1 }] }); await page.waitForTimeout(16); }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}
// A fresh save gets the guided tour on its first map visit; tests that only need a board skip it (as a player would: Skip, then yes).
export async function skipTour(page) { await page.waitForTimeout(300);
  if (await page.evaluate(() => !document.getElementById('coach').hidden)) { await page.tap('#coachSkip'); await page.waitForTimeout(150); await page.tap('#askYes'); await page.waitForTimeout(250); } }
export const makeChecker = () => { const fails = []; const check = (cond, msg) => { if (!cond) { fails.push(msg); console.error('FAIL:', msg); } else console.log('ok  :', msg); }; return { check, fails }; };
