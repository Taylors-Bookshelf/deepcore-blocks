// Anonymous play analytics. No accounts, names or emails: just a random id kept on the device.
// Events are batched and sent to PostHog (see config.js). With no key configured nothing leaves the device.
// Players can switch it off in Settings; Do Not Track / Global Privacy Control are honoured too.
(function(){
const CFG = self.DEEPCORE_CONFIG || {};
const K_AID = 'deepcore-aid', K_OPT = 'deepcore-analytics', K_FIRST = 'deepcore-first', K_SESS = 'deepcore-sessions';
const SESSION_GAP = 30 * 60 * 1000;               // away longer than this = a new session
const get = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const set = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'x' + Math.random().toString(36).slice(2) + Date.now().toString(36));

const dnt = navigator.doNotTrack === '1' || navigator.globalPrivacyControl === true;
const state = { queue: [], buffer: [], sid: null, sessionStart: 0, active: 0, visibleSince: 0, hiddenAt: 0, screen: 'home', timer: 0, board: null };
let aid = get(K_AID); if (!aid) { aid = uuid(); set(K_AID, aid); }
const enabled = () => !!CFG.posthogKey && !dnt && get(K_OPT) !== 'off';

// Pacific calendar day, matching the game's daily reset
const pacificDay = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(d);

function activeMs() { return state.active + (state.visibleSince ? performance.now() - state.visibleSince : 0); }
function track(event, props = {}) {
  const now = new Date();
  const ev = { event, distinct_id: aid, timestamp: now.toISOString(), properties: Object.assign({
    $process_person_profile: false, sid: state.sid, screen: state.screen, app_version: self.APP_VERSION,
    session_ms: Math.round(performance.now() - state.sessionStart), session_active_ms: Math.round(activeMs()),
  }, props) };
  state.buffer.push(ev); if (state.buffer.length > 500) state.buffer.shift();   // test/debug window
  if (!enabled()) return;
  state.queue.push(ev);
  if (state.queue.length >= 20) flush(); else if (!state.timer) state.timer = setTimeout(flush, 8000);
}
function flush(unloading) {
  clearTimeout(state.timer); state.timer = 0;
  if (!state.queue.length || !enabled()) { state.queue = []; return; }
  const body = JSON.stringify({ api_key: CFG.posthogKey, batch: state.queue }); state.queue = [];
  const url = (CFG.posthogHost || 'https://us.i.posthog.com').replace(/\/$/, '') + '/batch/';
  try {
    if (unloading && navigator.sendBeacon && navigator.sendBeacon(url, new Blob([body], { type: 'text/plain' }))) return;
    fetch(url, { method: 'POST', body, keepalive: true, headers: { 'content-type': 'text/plain' } }).catch(() => {});
  } catch (e) {}
}

// ---- sessions: one per visit, a new one after 30 minutes away ----
function startSession(reason) {
  state.sid = uuid(); state.sessionStart = performance.now(); state.active = 0; state.visibleSince = performance.now();
  const today = pacificDay(), first = get(K_FIRST);
  if (!first) set(K_FIRST, today);
  let log = {}; try { log = JSON.parse(get(K_SESS) || '{}'); } catch (e) {}
  log[today] = (log[today] || 0) + 1;
  Object.keys(log).sort().slice(0, -14).forEach(k => delete log[k]);
  set(K_SESS, JSON.stringify(log));
  const now = new Date();
  track('session_start', {
    reason, first_ever: !first, first_seen_day: first || today, sessions_today: log[today],
    local_hour: now.getHours(), local_dow: now.getDay(), pacific_day: today, tz_offset_min: -now.getTimezoneOffset(),
    standalone: matchMedia('(display-mode: standalone)').matches || navigator.standalone === true,
    touch: navigator.maxTouchPoints > 0, vw: innerWidth, vh: innerHeight, dpr: devicePixelRatio, lang: navigator.language,
    referrer_host: document.referrer ? new URL(document.referrer).hostname : '', online: navigator.onLine,
  });
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    state.active += performance.now() - state.visibleSince; state.visibleSince = 0; state.hiddenAt = Date.now();
    track('app_background', { board: state.board }); flush(true);
  } else {
    const away = Date.now() - state.hiddenAt; state.visibleSince = performance.now();
    if (state.hiddenAt && away > SESSION_GAP) startSession('resumed_after_gap'); else track('app_foreground', { away_ms: away });
  }
});
addEventListener('pagehide', () => { flush(true); });
addEventListener('error', e => track('js_error', { message: String(e.message).slice(0, 200), src: String(e.filename || '').split('/').pop(), line: e.lineno }));
addEventListener('unhandledrejection', e => track('js_error', { message: 'promise: ' + String(e.reason && e.reason.message || e.reason).slice(0, 200) }));
addEventListener('appinstalled', () => track('pwa_installed'));

// ---- repeated attempts: the same action tried again soon after, which usually means it didn't work as expected ----
const recent = {};
function attempt(kind, key, props = {}, windowMs = 6000) {
  const id = kind + '|' + key, now = performance.now(), r = recent[id];
  if (r && now - r.t < windowMs) { r.n++; const gap = Math.round(now - r.t); r.t = now;
    track('repeat_attempt', Object.assign({ kind, key, count: r.n, gap_ms: gap }, props)); }
  else recent[id] = { t: now, n: 1 };
}

self.DCA = {
  track, attempt, flush,
  setScreen(s) { state.screen = s; },
  setBoard(b) { state.board = b; },
  isOn: () => enabled(), canConfigure: () => !!CFG.posthogKey && !dnt,
  setOptOut(off) { set(K_OPT, off ? 'off' : 'on'); if (off) state.queue = []; },
  pacificDay, buffer: state.buffer,
};
startSession('open');
})();
