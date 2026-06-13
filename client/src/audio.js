// Audio manager: looping music + one-shot SFX from /assets.
// Browsers block audio until a user gesture, so everything routes through
// unlock(): the first pointer/key event starts whatever music was requested.

const SFX = ['draw', 'attack', 'block', 'power', 'commit', 'pick', 'relic', 'heal', 'hit', 'shuffle', 'victory', 'defeat'];

const MUSIC_VOL = 0.30;
const SFX_VOL = 0.55;

let unlocked = false;
let muted = localStorage.getItem('bs_muted') === '1';
let currentTrack = null;   // 'lobby' | 'battle' | null
let musicEl = null;
let pendingTrack = null;
const sfxCache = {};
const listeners = new Set();

for (const name of SFX) {
  const a = new Audio(`/assets/sfx/${name}.ogg`);
  a.preload = 'auto';
  sfxCache[name] = a;
}

function unlock() {
  if (unlocked) return;
  unlocked = true;
  if (pendingTrack) { const t = pendingTrack; pendingTrack = null; music(t); }
}
window.addEventListener('pointerdown', unlock, { once: false });
window.addEventListener('keydown', unlock, { once: false });

export function sfx(name) {
  if (muted || !unlocked || !sfxCache[name]) return;
  const a = sfxCache[name].cloneNode();
  a.volume = SFX_VOL;
  a.play().catch(() => {});
}

export function music(track) {
  if (track === currentTrack) return;
  if (!unlocked) { pendingTrack = track; return; }
  if (musicEl) { musicEl.pause(); musicEl = null; }
  currentTrack = track;
  if (!track || muted) return;
  musicEl = new Audio(`/assets/music/${track}.ogg`);
  musicEl.loop = true;
  musicEl.volume = MUSIC_VOL;
  musicEl.play().catch(() => {});
}

export function isMuted() { return muted; }

export function setMuted(m) {
  muted = m;
  localStorage.setItem('bs_muted', m ? '1' : '0');
  if (m && musicEl) { musicEl.pause(); musicEl = null; }
  if (!m && currentTrack) { const t = currentTrack; currentTrack = null; music(t); }
  for (const fn of listeners) fn(m);
}

export function onMuteChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
