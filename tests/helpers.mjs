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
        rs.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream' }); rs.end(await readFile(file)); }
      catch { rs.writeHead(404); rs.end(); } }).listen(0, () => res({ server, base: `http://localhost:${server.address().port}/` }));
  });
}
export async function phone(opts = {}) {
  const { server, base } = await serve();
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, ...opts });
  const page = await ctx.newPage(); const errors = [];
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
export const makeChecker = () => { const fails = []; const check = (cond, msg) => { if (!cond) { fails.push(msg); console.error('FAIL:', msg); } else console.log('ok  :', msg); }; return { check, fails }; };
