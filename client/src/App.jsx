import React, { useEffect, useState, useRef } from 'react';
import { connect, send, onMessage, getToken, setToken } from './net.js';
import { BeastPortrait, ForestBackdrop } from './art.jsx';
import { Game } from './Game.jsx';
import { music, isMuted, setMuted, onMuteChange } from './audio.js';

export default function App() {
  const [db, setDb] = useState(null);
  const [screen, setScreen] = useState('home');
  const [lobby, setLobby] = useState(null);
  const [you, setYou] = useState(null);
  const [gameMsg, setGameMsg] = useState(null); // { state, events, seq }
  const [toast, setToast] = useState(null);
  const [connected, setConnected] = useState(false);
  const seq = useRef(0);

  useEffect(() => {
    fetch('/api/db').then(r => r.json()).then(setDb);
    const off = onMessage((msg) => {
      switch (msg.type) {
        case '_open': setConnected(true); break;
        case '_closed': setConnected(false); break;
        case 'joined': setToken(msg.token); setYou(msg.token); break;
        case 'lobby':
          setYou(msg.you);
          setLobby(msg.lobby);
          setScreen('lobby');
          break;
        case 'state':
          setGameMsg({ state: msg.state, events: msg.events, seq: ++seq.current });
          setScreen('game');
          break;
        case 'error':
          if (msg.message === 'Session expired.') { setToken(null); setScreen('home'); }
          else showToast(msg.message);
          break;
      }
    });
    connect();
    return off;
  }, []);

  function showToast(text) {
    setToast(text);
    clearTimeout(showToast.t);
    showToast.t = setTimeout(() => setToast(null), 3000);
  }

  useEffect(() => {
    music(screen === 'game' ? 'battle' : 'lobby');
  }, [screen]);

  if (!db) return <div className="boot">Entering the forest…</div>;

  return (
    <div className="app">
      <ForestBackdrop />
      <MuteButton />
      {screen === 'home' && <Home connected={connected} />}
      {screen === 'lobby' && lobby && <Lobby lobby={lobby} you={you} db={db} />}
      {screen === 'game' && gameMsg && (
        <Game msg={gameMsg} db={db} onToast={showToast}
          onLeave={() => { setToken(null); location.href = location.pathname; }} />
      )}
      {toast && <div className="toast">{toast}</div>}
      {!connected && screen !== 'home' && <div className="conn-banner">Reconnecting…</div>}
    </div>
  );
}

function MuteButton() {
  const [muted, setM] = useState(isMuted());
  useEffect(() => onMuteChange(setM), []);
  return (
    <button className="mute-btn" title={muted ? 'Unmute' : 'Mute'} onClick={() => setMuted(!muted)}>
      {muted ? '🔇' : '🔊'}
    </button>
  );
}

// ---------------- Home ----------------

function Home({ connected }) {
  const params = new URLSearchParams(location.search);
  const [name, setName] = useState(localStorage.getItem('bs_name') || '');
  const [code, setCode] = useState(params.get('join') || '');

  function remember() {
    const n = name.trim() || 'Beast';
    localStorage.setItem('bs_name', n);
    return n;
  }

  return (
    <div className="home">
      <h1 className="logo">BEASTSPIRE</h1>
      <p className="tagline">A forest deckbuilder arena · 2–4 beasts · last one standing</p>
      <div className="home-card">
        <input className="input" placeholder="Your name" value={name} maxLength={20}
          onChange={e => setName(e.target.value)} />
        <button className="btn primary" disabled={!connected}
          onClick={() => send({ type: 'create', name: remember() })}>
          Create Room
        </button>
        <div className="divider">or join with a code</div>
        <div className="row">
          <input className="input code-input" placeholder="CODE" value={code} maxLength={4}
            onChange={e => setCode(e.target.value.toUpperCase())} />
          <button className="btn" disabled={!connected || code.length < 4}
            onClick={() => send({ type: 'join', code, name: remember() })}>
            Join
          </button>
        </div>
      </div>
      {!connected && <p className="muted">Connecting to server…</p>}
    </div>
  );
}

// ---------------- Lobby ----------------

function Lobby({ lobby, you, db }) {
  const isHost = you === lobby.hostId;
  const classes = Object.values(db.classes);
  const link = `${location.origin}${location.pathname}?join=${lobby.code}`;
  const [copied, setCopied] = useState(false);

  return (
    <div className="lobby">
      <h1 className="logo small">BEASTSPIRE</h1>
      <div className="lobby-card">
        <div className="room-code-row">
          <div>
            <div className="muted">Room code</div>
            <div className="room-code">{lobby.code}</div>
          </div>
          <button className="btn" onClick={() => {
            navigator.clipboard.writeText(link).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
          }}>{copied ? 'Copied!' : 'Copy invite link'}</button>
        </div>

        <div className="lobby-controls">
          <label>Seats
            <select className="input" disabled={!isHost} value={lobby.seats.length}
              onChange={e => send({ type: 'setSeatCount', count: +e.target.value })}>
              {[2, 3, 4].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <label>Mode
            <select className="input" disabled={!isHost} value={lobby.mode}
              onChange={e => send({ type: 'setMode', mode: e.target.value })}>
              <option value="ffa">Free-for-all</option>
              <option value="teams">2v2 Teams</option>
            </select>
          </label>
        </div>

        <div className="seats">
          {lobby.seats.map((seat, i) => {
            const mine = seat.id === you;
            const canSetClass = mine || (isHost && seat.kind !== 'human');
            return (
              <div key={seat.id} className={`seat ${mine ? 'mine' : ''} ${lobby.mode === 'teams' ? `team-${seat.team}` : ''}`}>
                <div className="seat-portrait"><BeastPortrait classId={seat.classId} size={52} /></div>
                <div className="seat-info">
                  <div className="seat-name">
                    {seat.name}{seat.id === lobby.hostId ? ' 👑' : ''}{mine ? ' (you)' : ''}
                    {seat.kind === 'human' && !seat.connected && seat.id !== lobby.hostId ? ' · waiting…' : ''}
                  </div>
                  <div className="seat-kind">
                    {isHost && seat.id !== lobby.hostId ? (
                      <select className="input mini" value={seat.kind === 'bot' ? 'bot' : 'open'}
                        disabled={seat.kind === 'human' && seat.connected}
                        onChange={e => send({ type: 'setSeatKind', seatId: seat.id, kind: e.target.value })}>
                        <option value="open">Open (human joins)</option>
                        <option value="bot">Bot</option>
                      </select>
                    ) : (
                      <span className="muted">{seat.kind === 'bot' ? 'Bot' : seat.kind === 'open' ? 'Open seat' : 'Human'}</span>
                    )}
                  </div>
                </div>
                <div className="seat-class">
                  {classes.map(c => (
                    <button key={c.id}
                      className={`class-pick ${seat.classId === c.id ? 'active' : ''}`}
                      disabled={!canSetClass}
                      title={c.name}
                      onClick={() => send({ type: 'setClass', seatId: seat.id, classId: c.id })}>
                      <BeastPortrait classId={c.id} size={30} />
                    </button>
                  ))}
                </div>
                {lobby.mode === 'teams' && (
                  <button className={`btn mini team-btn t${seat.team}`} disabled={!isHost}
                    onClick={() => send({ type: 'setTeam', seatId: seat.id, team: seat.team === 1 ? 2 : 1 })}>
                    Team {seat.team}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {isHost
          ? <button className="btn primary big" onClick={() => send({ type: 'start' })}>Begin the Hunt</button>
          : <p className="muted center">Waiting for the host to start…</p>}
        <p className="hint">Open seats are filled by friends using the room code. Set a seat to Bot to fill it instantly — bots draft and fight on their own.</p>
      </div>
    </div>
  );
}
