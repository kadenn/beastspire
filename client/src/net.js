// WebSocket wrapper: auto-reconnects with the saved seat token so a refresh
// or dropped connection rejoins the same seat (server holds it for 30s).

const listeners = new Set();
let ws = null;
let wantReconnect = true;
let retryMs = 800;

// sessionStorage, not localStorage: the token is per-tab identity, so two tabs
// in one browser are two distinct players. Survives refresh and network drops.
export function getToken() { return sessionStorage.getItem('bs_token'); }
export function setToken(t) { t ? sessionStorage.setItem('bs_token', t) : sessionStorage.removeItem('bs_token'); }

export function onMessage(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function send(obj) {
  if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj));
}

export function connect() {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  ws = new WebSocket(`${proto}://${location.host}/ws`);
  ws.onopen = () => {
    retryMs = 800;
    for (const fn of listeners) fn({ type: '_open' });
    const token = getToken();
    if (token) send({ type: 'reconnect', token });
  };
  ws.onmessage = (e) => {
    let msg;
    try { msg = JSON.parse(e.data); } catch { return; }
    for (const fn of listeners) fn(msg);
  };
  ws.onclose = () => {
    for (const fn of listeners) fn({ type: '_closed' });
    if (wantReconnect) {
      setTimeout(connect, retryMs);
      retryMs = Math.min(retryMs * 1.6, 8000);
    }
  };
  ws.onerror = () => ws.close();
}
