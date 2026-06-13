// Room = lobby (seat configuration) + a running match. Seats are filled by
// humans (via room code) or bots; the host configures them before starting.
// Bots act through the exact same intent handler as humans.

import {
  createGame, startRound, resolveRound, queuePlay, unqueuePlay, commit,
  draftPick, relicPick, draftAllDone, forceDraftFinish, viewFor, alivePlayers,
} from './engine.js';
import { CLASSES } from './cards.js';
import { botPlayTurn, botDraft } from './bot.js';

const ROOMS = new Map();
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const RECONNECT_GRACE_MS = 30_000;
const BOT_NAMES = ['Bramble', 'Sable', 'Thistle', 'Moss', 'Cinder', 'Fen'];

function genCode() {
  let code;
  do {
    code = Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
  } while (ROOMS.has(code));
  return code;
}

let seatCounter = 0;

export class Room {
  constructor(hostName) {
    this.code = genCode();
    this.phase = 'lobby';
    this.game = null;
    this.sockets = new Map();      // playerId -> ws
    this.disconnectTimers = new Map();
    this.roundTimer = null;
    this.botTimers = [];
    this.seats = [];
    this.hostId = this.addSeat('human', hostName).id;
    this.addSeat('bot');
    ROOMS.set(this.code, this);
  }

  addSeat(kind, name = null) {
    // the seat id doubles as the reconnect token — make it unguessable
    const id = `p${++seatCounter}-${Math.random().toString(36).slice(2, 10)}`;
    const classIds = Object.keys(CLASSES);
    const seat = {
      id, kind, // 'human' | 'bot' | 'open'
      name: name || (kind === 'bot' ? `${BOT_NAMES[this.seats.length % BOT_NAMES.length]} (bot)` : 'Open'),
      classId: classIds[this.seats.length % classIds.length],
      team: this.seats.length % 2 === 0 ? 1 : 2,
      connected: kind === 'human' && !!name,
    };
    this.seats.push(seat);
    return seat;
  }

  // ---------- lobby ops (host only, except join/class pick) ----------

  configure(playerId, msg) {
    if (this.phase !== 'lobby') return { error: 'Match already started.' };
    const isHost = playerId === this.hostId;
    switch (msg.type) {
      case 'setSeatCount': {
        if (!isHost) return { error: 'Host only.' };
        const n = Math.max(2, Math.min(4, msg.count | 0));
        while (this.seats.length > n) {
          const seat = this.seats[this.seats.length - 1];
          if (seat.kind === 'human' && seat.connected) return { error: 'Cannot remove a seated player.' };
          this.seats.pop();
        }
        while (this.seats.length < n) this.addSeat('bot');
        return { ok: true };
      }
      case 'setSeatKind': {
        if (!isHost) return { error: 'Host only.' };
        const seat = this.seats.find(s => s.id === msg.seatId);
        if (!seat) return { error: 'No such seat.' };
        if (seat.id === this.hostId) return { error: 'Cannot change the host seat.' };
        if (seat.kind === 'human' && seat.connected) return { error: 'Seat is occupied.' };
        seat.kind = msg.kind === 'bot' ? 'bot' : 'open';
        seat.name = seat.kind === 'bot'
          ? `${BOT_NAMES[this.seats.indexOf(seat) % BOT_NAMES.length]} (bot)` : 'Open';
        seat.connected = false;
        return { ok: true };
      }
      case 'setMode': {
        if (!isHost) return { error: 'Host only.' };
        if (msg.mode === 'teams' && this.seats.length < 4) {
          while (this.seats.length < 4) this.addSeat('bot');
        }
        this.mode = msg.mode === 'teams' ? 'teams' : 'ffa';
        return { ok: true };
      }
      case 'setTeam': {
        if (!isHost) return { error: 'Host only.' };
        const seat = this.seats.find(s => s.id === msg.seatId);
        if (!seat) return { error: 'No such seat.' };
        seat.team = msg.team === 2 ? 2 : 1;
        return { ok: true };
      }
      case 'setClass': {
        // anyone can set their own class; host can set bot classes
        const seat = this.seats.find(s => s.id === msg.seatId);
        if (!seat || !CLASSES[msg.classId]) return { error: 'Invalid.' };
        if (seat.id !== playerId && !(isHost && seat.kind !== 'human')) return { error: 'Not your seat.' };
        seat.classId = msg.classId;
        return { ok: true };
      }
      case 'setName': {
        const seat = this.seats.find(s => s.id === playerId);
        if (seat && msg.name) seat.name = String(msg.name).slice(0, 20);
        return { ok: true };
      }
      case 'start': {
        if (!isHost) return { error: 'Host only.' };
        return this.start();
      }
    }
    return { error: 'Unknown lobby action.' };
  }

  join(name) {
    if (this.phase !== 'lobby') {
      // allow joining an in-progress game only as a reconnect (handled elsewhere)
      return { error: 'Match already in progress.' };
    }
    const seat = this.seats.find(s => s.kind === 'open' || (s.kind === 'human' && !s.connected && s.id !== this.hostId));
    if (!seat) return { error: 'Room is full.' };
    seat.kind = 'human';
    seat.name = name || 'Beast';
    seat.connected = true;
    return { ok: true, seat };
  }

  start() {
    const filled = this.seats.filter(s => s.kind === 'bot' || (s.kind === 'human' && s.connected));
    if (filled.length < 2) return { error: 'Need at least 2 filled seats.' };
    const humansMissing = this.seats.some(s => s.kind === 'open');
    if (humansMissing) return { error: 'Fill or remove open seats first (set them to Bot).' };
    this.mode = this.mode || 'ffa';
    if (this.mode === 'teams') {
      const t1 = filled.filter(s => s.team === 1).length;
      const t2 = filled.filter(s => s.team === 2).length;
      if (t1 === 0 || t2 === 0) return { error: 'Both teams need at least one player.' };
    }
    this.phase = 'playing';
    this.game = createGame(filled, this.mode);
    for (const s of filled) if (s.kind === 'human') this.game.players[s.id].connected = s.connected;
    const events = startRound(this.game);
    this.broadcastState(events);
    this.armRoundTimer();
    this.scheduleBots();
    return { ok: true };
  }

  // ---------- in-game intents (humans via ws, bots via scheduler — same path) ----------

  handleIntent(playerId, msg) {
    if (!this.game) return { error: 'No game running.' };
    const p = this.game.players[playerId];
    if (!p) return { error: 'Not in this game.' };

    switch (msg.type) {
      case 'queuePlay': {
        const res = queuePlay(this.game, p, msg.cardUid, msg.targetId);
        if (res.ok) this.sendState(playerId);
        return res;
      }
      case 'unqueue': {
        const res = unqueuePlay(this.game, p, msg.index);
        if (res.ok) this.sendState(playerId);
        return res;
      }
      case 'commit': {
        const res = commit(this.game, p);
        if (res.error) return res;
        if (res.allCommitted) this.resolve();
        else this.broadcastState();
        return res;
      }
      case 'draftPick': {
        const res = draftPick(this.game, p, msg.cardId);
        if (res.error) return res;
        this.afterDraftAction(res);
        return res;
      }
      case 'relicPick': {
        const res = relicPick(this.game, p, msg.relicId);
        if (res.error) return res;
        this.afterDraftAction(res);
        return res;
      }
    }
    return { error: 'Unknown intent.' };
  }

  afterDraftAction(res) {
    if (res.allDone && this.game.phase === 'draft') {
      this.clearTimers();
      const events = startRound(this.game);
      this.broadcastState(events);
      this.armRoundTimer();
      this.scheduleBots();
    } else {
      this.broadcastState();
    }
  }

  resolve() {
    this.clearTimers();
    const events = resolveRound(this.game);
    this.broadcastState(events);
    if (this.game.phase === 'over') return;
    this.armRoundTimer();
    this.scheduleBots();
  }

  // ---------- timers & bots ----------

  armRoundTimer() {
    const ms = Math.max(1000, this.game.deadline - Date.now());
    this.roundTimer = setTimeout(() => {
      if (!this.game || this.game.phase === 'over') return;
      if (this.game.phase === 'combat') {
        for (const p of alivePlayers(this.game)) if (!p.committed) commit(this.game, p);
        this.resolve();
      } else if (this.game.phase === 'draft') {
        forceDraftFinish(this.game);
        if (draftAllDone(this.game)) this.afterDraftAction({ allDone: true });
      }
    }, ms);
  }

  scheduleBots() {
    if (!this.game || this.game.phase === 'over') return;
    const phase = this.game.phase;
    for (const p of alivePlayers(this.game)) {
      if (!p.isBot) continue;
      const delay = 1200 + Math.random() * 2500;
      this.botTimers.push(setTimeout(() => {
        if (!this.game || this.game.phase !== phase) return;
        if (phase === 'combat') {
          if (p.committed) return;
          botPlayTurn(this.game, p);
          const all = alivePlayers(this.game).every(x => x.committed);
          if (all) this.resolve();
          else this.broadcastState();
        } else if (phase === 'draft') {
          botDraft(this.game, p);
          if (draftAllDone(this.game)) this.afterDraftAction({ allDone: true });
          else this.broadcastState();
        }
      }, delay));
    }
  }

  clearTimers() {
    if (this.roundTimer) clearTimeout(this.roundTimer);
    this.roundTimer = null;
    for (const t of this.botTimers) clearTimeout(t);
    this.botTimers = [];
  }

  // ---------- connection management ----------

  attach(playerId, ws) {
    this.sockets.set(playerId, ws);
    const seat = this.seats.find(s => s.id === playerId);
    if (seat) seat.connected = true;
    const t = this.disconnectTimers.get(playerId);
    if (t) { clearTimeout(t); this.disconnectTimers.delete(playerId); }
    if (this.game && this.game.players[playerId]) {
      const p = this.game.players[playerId];
      p.connected = true;
      if (p.isBot && !p.wasAlwaysBot) {
        p.isBot = false; // human reclaims seat from the takeover bot
        p.name = p.name.replace(/ \(bot took over\)$/, '');
      }
      this.broadcastState();
    } else {
      this.broadcastLobby();
    }
  }

  detach(playerId) {
    this.sockets.delete(playerId);
    const seat = this.seats.find(s => s.id === playerId);
    if (seat) seat.connected = false;

    if (this.phase === 'lobby') {
      if (playerId === this.hostId) this.destroyLater();
      this.broadcastLobby();
      return;
    }
    const p = this.game && this.game.players[playerId];
    if (!p || p.isBot || !p.alive || this.game.phase === 'over') return;
    p.connected = false;
    this.broadcastState();
    // 30s reconnect window, then a bot takes over so the match can finish
    this.disconnectTimers.set(playerId, setTimeout(() => {
      this.disconnectTimers.delete(playerId);
      if (!this.game || this.game.phase === 'over' || !p.alive || p.connected) return;
      p.isBot = true;
      p.name = `${p.name} (bot took over)`;
      this.broadcastState();
      // let the takeover bot act in the current phase immediately
      if (this.game.phase === 'combat' && !p.committed) {
        botPlayTurn(this.game, p);
        if (alivePlayers(this.game).every(x => x.committed)) this.resolve();
        else this.broadcastState();
      } else if (this.game.phase === 'draft') {
        botDraft(this.game, p);
        if (draftAllDone(this.game)) this.afterDraftAction({ allDone: true });
        else this.broadcastState();
      }
    }, RECONNECT_GRACE_MS));
  }

  destroyLater() {
    setTimeout(() => {
      const anyHuman = [...this.sockets.values()].length > 0;
      if (!anyHuman) {
        this.clearTimers();
        for (const t of this.disconnectTimers.values()) clearTimeout(t);
        ROOMS.delete(this.code);
      }
    }, 60_000);
  }

  // ---------- broadcasting ----------

  send(playerId, obj) {
    const ws = this.sockets.get(playerId);
    if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj));
  }

  sendState(playerId, events = null) {
    if (!this.game) return;
    this.send(playerId, { type: 'state', state: viewFor(this.game, playerId), events });
  }

  broadcastState(events = null) {
    for (const playerId of this.sockets.keys()) this.sendState(playerId, events);
  }

  lobbyView() {
    return {
      code: this.code,
      hostId: this.hostId,
      mode: this.mode || 'ffa',
      phase: this.phase,
      seats: this.seats.map(s => ({
        id: s.id, kind: s.kind, name: s.name, classId: s.classId, team: s.team, connected: s.connected,
      })),
    };
  }

  broadcastLobby() {
    for (const playerId of this.sockets.keys())
      this.send(playerId, { type: 'lobby', lobby: this.lobbyView(), you: playerId });
  }
}

export function createRoom(hostName) { return new Room(hostName); }
export function getRoom(code) { return ROOMS.get(String(code || '').toUpperCase()); }
export function findRoomByPlayer(playerId) {
  for (const room of ROOMS.values()) if (room.seats.some(s => s.id === playerId)) return room;
  return null;
}
