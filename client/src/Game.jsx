import React, { useEffect, useRef, useState, useCallback } from 'react';
import { send } from './net.js';
import { CardView } from './CardView.jsx';
import { BeastSprite } from './art.jsx';
import { sfx } from './audio.js';

const STATUS_META = {
  strength: { icon: '💪', label: 'Strength', desc: 'Attacks deal +X damage.' },
  weak: { icon: '🌀', label: 'Weak', desc: 'Deals 25% less attack damage for X rounds.' },
  vulnerable: { icon: '🎯', label: 'Vulnerable', desc: 'Takes 25% more attack damage for X rounds.' },
  burn: { icon: '🔥', label: 'Burn', desc: 'Takes X damage at end of round, then clears.' },
  poison: { icon: '☠️', label: 'Poison', desc: 'Takes X damage at end of round, then -1.' },
  thorns: { icon: '🌵', label: 'Thorns', desc: 'Attackers take X damage.' },
  regen: { icon: '🌿', label: 'Regen', desc: 'Heals X at end of round, then -1.' },
};
const POWER_META = {
  attacksApplyBurn: { icon: '🔥', label: 'Inferno Howl', desc: 'Attacks also apply X Burn.' },
  blockPerRound: { icon: '🛡️', label: 'Ancient Growth', desc: 'Gain X Block every round.' },
  thornsPerRound: { icon: '🌵', label: 'Deep Roots', desc: 'Gain X Thorns every round.' },
  poisonAllPerRound: { icon: '☠️', label: 'Noxious Bloom', desc: 'Apply X Poison to all enemies every round.' },
  regenPerRound: { icon: '🌿', label: "Serpent's Patience", desc: 'Gain X Regen every round.' },
};

const EV_DELAY = { reveal: 700, play: 620, damage: 430, block: 300, status: 300, heal: 320, power: 350, death: 850, wrath: 650, roundStart: 600, draftStart: 350, gameOver: 400 };

// Arena slots: my side stands bottom-left facing right, foes on the right.
// Back slots sit deeper (higher, smaller) for a touch of perspective.
const LEFT_SLOTS = [
  { left: '10%', bottom: '6%', z: 6, s: 1 },
  { left: '0%', bottom: '20%', z: 5, s: 0.84 },
];
const RIGHT_SLOTS = [
  { right: '10%', bottom: '6%', z: 6, s: 1 },
  { right: '0%', bottom: '22%', z: 5, s: 0.84 },
  { right: '22%', bottom: '30%', z: 4, s: 0.72 },
];

let fxId = 0;

export function Game({ msg, db, onToast, onLeave }) {
  const view = msg.state;
  const me = view.players.find(p => p.id === view.you);

  const [disp, setDisp] = useState(null);          // animated player display overrides
  const [fx, setFx] = useState([]);                // floating fx elements
  const [flights, setFlights] = useState([]);      // flying cards
  const [poses, setPoses] = useState({});          // playerId -> animation class
  const [banner, setBanner] = useState(null);
  const [shake, setShake] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [selected, setSelected] = useState(null);  // selected hand card uid
  const [now, setNow] = useState(Date.now());
  const [showDeck, setShowDeck] = useState(false);
  const [confirmQuit, setConfirmQuit] = useState(false);

  const panelRefs = useRef({});
  const lastSettled = useRef(null);
  const playbackChain = useRef(Promise.resolve());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);

  // ---------- event playback ----------

  const spawnFx = useCallback((playerId, node, ms = 900) => {
    const id = ++fxId;
    setFx(f => [...f, { id, playerId, node }]);
    setTimeout(() => setFx(f => f.filter(x => x.id !== id)), ms);
  }, []);

  const setPose = useCallback((playerId, pose, ms) => {
    setPoses(p => ({ ...p, [playerId]: pose }));
    if (ms) setTimeout(() => setPoses(p => (p[playerId] === pose ? { ...p, [playerId]: null } : p)), ms);
  }, []);

  const flyCard = useCallback((fromId, toId, cardId) => {
    const from = panelRefs.current[fromId]?.getBoundingClientRect();
    const to = panelRefs.current[toId || fromId]?.getBoundingClientRect();
    if (!from) return;
    const id = ++fxId;
    const card = db.cards[cardId];
    setFlights(f => [...f, {
      id, card,
      x0: from.x + from.width / 2, y0: from.y + from.height / 2,
      x1: to ? to.x + to.width / 2 : from.x + from.width / 2,
      y1: to ? to.y + to.height / 2 : from.y - 80,
    }]);
    setTimeout(() => setFlights(f => f.filter(x => x.id !== id)), 620);
  }, [db]);

  useEffect(() => {
    if (!msg.events || !lastSettled.current) {
      lastSettled.current = view;
      return;
    }
    const events = msg.events;
    const startView = lastSettled.current;
    lastSettled.current = view;

    playbackChain.current = playbackChain.current.then(async () => {
      // snapshot pre-resolution stats for animated display
      const snap = {};
      for (const p of startView.players) {
        snap[p.id] = { hp: p.hp, block: p.block, statuses: { ...p.statuses }, alive: p.alive };
      }
      setDisp({ ...snap });
      setResolving(true);
      setSelected(null);

      for (const ev of events) {
        playEvent(ev, snap);
        setDisp({ ...snap });
        await sleep(EV_DELAY[ev.kind] ?? 300);
      }
      setBanner(null);
      setDisp(null);
      setPoses({});
      setResolving(false);
    });

    function playEvent(ev, snap) {
      const s = (id) => snap[id];
      switch (ev.kind) {
        case 'reveal': setBanner('⚔️ Plays revealed!'); break;
        case 'roundStart': setBanner(`Round ${ev.round} — choose your plays`); sfx('draw'); setTimeout(() => setBanner(null), 1600); break;
        case 'draftStart': setBanner('🃏 Draft time'); sfx('shuffle'); break;
        case 'play': {
          flyCard(ev.player, ev.targetId, ev.cardId);
          const type = db.cards[ev.cardId]?.type;
          if (type === 'attack') { setPose(ev.player, 'pose-lunge', 520); sfx('attack'); }
          else if (type === 'power') { setPose(ev.player, 'pose-cast', 520); }
          else setPose(ev.player, 'pose-cast', 420);
          break;
        }
        case 'damage': {
          const t = s(ev.target);
          if (t) { t.hp = ev.hpAfter; t.block = ev.blockAfter; }
          const cls = typeof ev.source === 'string' && !ev.source.startsWith('p') ? `dmg-${ev.source}` : '';
          spawnFx(ev.target, <span className={`dmg-pop ${cls}`}>-{ev.amount}{ev.blocked ? <em className="blocked-note">{ev.blocked} blocked</em> : null}</span>);
          setPose(ev.target, 'pose-hurt', 420);
          sfx('hit');
          if (ev.amount >= 10) { setShake(true); setTimeout(() => setShake(false), 420); }
          break;
        }
        case 'block': {
          const t = s(ev.target);
          if (t) t.block = ev.blockAfter;
          spawnFx(ev.target, <span className="block-pop">🛡️ +{ev.amount}</span>);
          sfx('block');
          break;
        }
        case 'heal': {
          const t = s(ev.target);
          if (t) t.hp = ev.hpAfter;
          spawnFx(ev.target, <span className="heal-pop">+{ev.amount}</span>);
          sfx('heal');
          break;
        }
        case 'status': {
          const t = s(ev.target);
          if (t) t.statuses[ev.status] = ev.total;
          const m = STATUS_META[ev.status];
          spawnFx(ev.target, <span className="status-pop">{m?.icon} +{ev.amount} {m?.label}</span>);
          break;
        }
        case 'power': {
          spawnFx(ev.player, <span className="status-pop">✨ {db.cards[ev.cardId]?.name}</span>);
          sfx('power');
          break;
        }
        case 'wrath': {
          setBanner(`🌲 The Forest's Wrath strikes everyone for ${ev.amount}!`);
          setShake(true); setTimeout(() => setShake(false), 500);
          sfx('hit');
          break;
        }
        case 'death': {
          const t = s(ev.player);
          if (t) t.alive = false;
          setPose(ev.player, 'pose-die');
          spawnFx(ev.player, <span className="death-pop">💀</span>, 1400);
          setShake(true); setTimeout(() => setShake(false), 500);
          break;
        }
        case 'gameOver': setBanner(null); break;
      }
    }
  }, [msg.seq]); // eslint-disable-line

  // ---------- intents ----------

  function tryPlayCard(uid, targetId = null) {
    const inst = me.hand?.find(c => c.uid === uid);
    if (!inst) return;
    const card = db.cards[inst.cardId];
    if (card.cost > me.energy) { onToast('Not enough energy.'); return; }
    if (card.target === 'enemy' || (card.target === 'ally' && view.mode === 'teams')) {
      if (!targetId) { setSelected(uid); return; }
      send({ type: 'queuePlay', cardUid: uid, targetId });
      sfx('pick');
    } else {
      const tid = card.target === 'ally' ? me.id : null;
      send({ type: 'queuePlay', cardUid: uid, targetId: tid });
      sfx('pick');
    }
    setSelected(null);
  }

  function onPanelActivate(p) {
    if (!selected) return;
    const card = db.cards[me.hand.find(c => c.uid === selected)?.cardId || ''];
    if (!card) { setSelected(null); return; }
    if (!isValidTarget(card, p)) { onToast(card.target === 'enemy' ? 'Pick an enemy.' : 'Pick an ally.'); return; }
    send({ type: 'queuePlay', cardUid: selected, targetId: p.id });
    sfx('pick');
    setSelected(null);
  }

  function isValidTarget(card, p) {
    if (!p.alive) return false;
    if (card.target === 'enemy') return p.id !== me.id && (view.mode !== 'teams' || p.team !== me.team);
    if (card.target === 'ally') return view.mode === 'teams' ? p.team === me.team : p.id === me.id;
    return false;
  }

  const selectedCard = selected ? db.cards[me.hand?.find(c => c.uid === selected)?.cardId] : null;
  const secsLeft = Math.max(0, Math.ceil((view.deadline - now) / 1000));
  const dp = (p) => disp?.[p.id] ? { ...p, ...disp[p.id] } : p;
  const inWrath = view.round >= view.wrathRound;

  // arena arrangement: me + allies on the left, foes on the right
  const allies = view.mode === 'teams' ? view.players.filter(p => p.id !== me.id && p.team === me.team) : [];
  const foes = view.players.filter(p => p.id !== me.id && (view.mode !== 'teams' || p.team !== me.team));
  const combatants = [
    ...[me, ...allies].map((p, i) => ({ p, slot: LEFT_SLOTS[i % LEFT_SLOTS.length], side: 'left' })),
    ...foes.map((p, i) => ({ p, slot: RIGHT_SLOTS[i % RIGHT_SLOTS.length], side: 'right' })),
  ];

  return (
    <div className={`game ${shake ? 'shake' : ''}`}>
      {/* top bar */}
      <div className="topbar">
        <div className="round-info">
          Round <b>{view.round}</b>
          {view.mode === 'teams' && <span className="mode-chip">2v2</span>}
          {inWrath
            ? <span className="wrath-chip">🌲 Forest's Wrath: {(view.round - view.wrathRound + 1) * 2} dmg/round</span>
            : <span className="muted"> · wrath at round {view.wrathRound}</span>}
        </div>
        <div className="topbar-right">
          {view.phase === 'combat' && <div className={`timer ${secsLeft <= 10 ? 'low' : ''}`}>⏱ {secsLeft}s</div>}
          <button className="btn mini quit-btn" title="Leave the match"
            onClick={() => (view.phase === 'over' ? onLeave() : setConfirmQuit(true))}>
            Leave ⏏
          </button>
        </div>
      </div>

      {/* battle arena */}
      <div className="arena">
        {combatants.map(({ p, slot, side }) => (
          <Combatant key={p.id} p={dp(p)} me={me} view={view} db={db} side={side} slot={slot}
            pose={poses[p.id]}
            innerRef={el => panelRefs.current[p.id] = el}
            targetable={selectedCard && isValidTarget(selectedCard, p)}
            onActivate={() => onPanelActivate(p)}
            fx={fx.filter(f => f.playerId === p.id)} />
        ))}
        {banner && <div className="banner">{banner}</div>}
      </div>

      {/* bottom: hand + actions */}
      <div className="my-row">
        <div className="hand-zone">
          {me.alive && view.phase === 'combat' && (
            <>
              <div className="queued-strip">
                <span className="deck-counts" onClick={() => setShowDeck(true)} title="View your deck">
                  🂠 {me.deckCount} · 🗑 {me.discardCount}
                </span>
                {(me.queued || []).map((q, i) => {
                  const c = db.cards[q.cardId];
                  const t = q.targetId && q.targetId !== me.id ? view.players.find(p => p.id === q.targetId) : null;
                  return (
                    <div key={q.uid} className={`queued-chip ${q.immediate ? 'locked' : ''}`}
                      title={q.immediate ? 'Already drew/gained — cannot undo' : 'Click to undo'}
                      onClick={() => !q.immediate && !me.committed && send({ type: 'unqueue', index: i })}>
                      <b>{c.name}</b>{t ? ` → ${t.name}` : ''}{q.immediate ? '' : ' ✕'}
                    </div>
                  );
                })}
                {(me.queued || []).length === 0 && <div className="queued-empty">Queue cards, then lock in. Plays reveal simultaneously.</div>}
              </div>
              <div className={`hand ${me.committed || resolving ? 'dimmed' : ''}`}>
                {(me.hand || []).map((inst, i) => {
                  const card = db.cards[inst.cardId];
                  const n = me.hand.length;
                  const rot = (i - (n - 1) / 2) * 4;
                  const lift = Math.abs(i - (n - 1) / 2) * 6;
                  return (
                    <div key={inst.uid} className="hand-slot" style={{ '--rot': `${rot}deg`, '--lift': `${lift}px` }}>
                      <CardView card={card} size="hand"
                        selected={selected === inst.uid}
                        disabled={card.cost > me.energy || me.committed}
                        onClick={() => !me.committed && (selected === inst.uid ? setSelected(null) : tryPlayCard(inst.uid))}
                        draggable={!me.committed && card.cost <= me.energy}
                        onDragStart={e => {
                          e.dataTransfer.setData('text/uid', inst.uid);
                          setSelected(inst.uid);
                        }} />
                    </div>
                  );
                })}
              </div>
            </>
          )}
          {!me.alive && <div className="dead-note">💀 You have fallen. Spectating until the hunt ends…</div>}
        </div>

        {me.alive && view.phase === 'combat' && (
          <div className="action-zone">
            <div className="energy-orb" title="Energy"><b>{me.energy ?? 0}</b><span>⚡</span></div>
            {!me.committed ? (
              <button className="btn primary big" disabled={resolving}
                onClick={() => { sfx('commit'); send({ type: 'commit' }); }}>
                Lock In ({(me.queued || []).length})
              </button>
            ) : (
              <div className="waiting-note">
                ✅ Locked in.<br />
                <span className="muted">Waiting: {view.players.filter(p => p.alive && !p.committed).map(p => p.name).join(', ') || '…'}</span>
              </div>
            )}
            {selectedCard && (
              <div className="target-hint">
                {selectedCard.target === 'enemy' ? '🎯 Click an enemy' : '💚 Click an ally'} to play <b>{selectedCard.name}</b>
                <button className="btn mini" onClick={() => setSelected(null)}>cancel</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* flying cards */}
      {flights.map(f => (
        <div key={f.id} className="flight" style={{ '--x0': `${f.x0}px`, '--y0': `${f.y0}px`, '--x1': `${f.x1}px`, '--y1': `${f.y1}px` }}>
          <CardView card={f.card} size="mini" />
        </div>
      ))}

      {/* draft overlay */}
      {view.phase === 'draft' && !resolving && (
        <DraftOverlay view={view} me={me} db={db} />
      )}

      {/* game over overlay */}
      {view.phase === 'over' && !resolving && (
        <GameOver view={view} me={me} onLeave={onLeave} />
      )}

      {showDeck && me.deckList && (
        <div className="overlay" onClick={() => setShowDeck(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Your deck ({Object.values(me.deckList).reduce((a, b) => a + b, 0)} cards)</h2>
            <div className="deck-grid">
              {Object.entries(me.deckList).sort().map(([cid, n]) => (
                <CardView key={cid} card={db.cards[cid]} size="draft" badge={`×${n}`} />
              ))}
            </div>
            <button className="btn" onClick={() => setShowDeck(false)}>Close</button>
          </div>
        </div>
      )}

      {confirmQuit && (
        <div className="overlay" onClick={() => setConfirmQuit(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Leave the match?</h2>
            <p className="muted center">
              {me.alive
                ? 'A bot will take over your beast and the match continues for everyone else.'
                : 'You’ll return to the den.'}
            </p>
            <div className="row">
              <button className="btn" onClick={() => setConfirmQuit(false)}>Stay</button>
              <button className="btn primary" onClick={onLeave}>Leave</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------- Combatant (battler sprite + floating UI) ----------------

function Combatant({ p, me, view, db, side, slot, pose, innerRef, targetable, onActivate, fx }) {
  const hpPct = Math.max(0, Math.min(100, (p.hp / p.maxHp) * 100));
  const self = p.id === me.id;
  const isAlly = view.mode === 'teams' && p.team === me.team && p.id !== me.id;
  const teamCls = view.mode === 'teams' ? (p.team === me.team ? 'ally' : 'foe') : '';

  return (
    <div
      ref={innerRef}
      className={`combatant ${side} ${self ? 'self' : ''} ${teamCls} ${p.alive ? '' : 'dead'} ${targetable ? 'targetable' : ''}`}
      style={{ ...(slot.left ? { left: slot.left } : { right: slot.right }), bottom: slot.bottom, zIndex: slot.z, '--cscale': slot.s }}
      onClick={targetable ? onActivate : undefined}
      onDragOver={targetable ? (e => e.preventDefault()) : undefined}
      onDrop={targetable ? (e => { e.preventDefault(); onActivate(); }) : undefined}
    >
      <div className="nameplate">
        <span className="cname">{p.name}{self ? ' (you)' : ''}{isAlly ? ' 🤝' : ''}</span>
        {p.isBot && <span className="bot-chip">BOT</span>}
        {!p.connected && !p.isBot && <span className="dc-chip">⛓️‍💥</span>}
        {view.phase === 'combat' && p.alive && (
          p.committed
            ? <span className="committed">✓</span>
            : !self && <span className="thinking">{p.queuedCount > 0 ? `${p.queuedCount}🂠` : '…'}</span>
        )}
      </div>

      <div className="chips">
        {Object.entries(p.statuses || {}).filter(([, v]) => v > 0).map(([k, v]) => (
          <span key={k} className={`chip st-${k}`} title={`${STATUS_META[k].label}: ${STATUS_META[k].desc.replace('X', v)}`}>
            {STATUS_META[k].icon}{v}
          </span>
        ))}
        {Object.entries(p.powers || {}).filter(([, v]) => v > 0).map(([k, v]) => (
          <span key={k} className="chip st-power" title={`${POWER_META[k].label}: ${POWER_META[k].desc.replace('X', v)}`}>
            ✨{POWER_META[k].icon}{v}
          </span>
        ))}
        {(p.relics || []).map(r => (
          <span key={r} className="chip relic" title={`${db.relics[r].name}: ${db.relics[r].text}`}>
            🪙{db.relics[r].name.split(' ')[0]}
          </span>
        ))}
      </div>

      <div className={`sprite-box ${pose || ''}`}>
        <div className="ground-shadow" />
        <BeastSprite classId={p.classId} face={side === 'left' ? 'right' : 'left'} size={250} className="battler" />
        {!p.alive && <div className="dead-overlay">💀</div>}
      </div>

      <div className="hp-strip">
        <div className="hp-bar">
          <div className="hp-fill" style={{ width: `${hpPct}%` }} />
          <span className="hp-text">{p.hp}/{p.maxHp}</span>
        </div>
        <div className={`block-shield ${p.block > 0 ? 'active' : ''}`} title="Block (decays each round)">
          🛡️<b>{p.block}</b>
        </div>
      </div>

      <div className="fx-layer">
        {fx.map(f => <div key={f.id} className="fx-item">{f.node}</div>)}
      </div>
    </div>
  );
}

// ---------------- Draft ----------------

function DraftOverlay({ view, me, db }) {
  const offer = view.draftOffer;
  if (!me.alive) return (
    <div className="overlay"><div className="modal"><h2>Draft in progress…</h2><p className="muted">The living beasts are choosing new cards.</p></div></div>
  );
  if (!offer) return null;
  const needCard = offer.pickedCard === null;
  const needRelic = offer.relics.length > 0 && offer.pickedRelic === null;
  const waitingNames = view.draftWaiting.filter(id => id !== me.id).map(id => view.players.find(p => p.id === id)?.name);

  return (
    <div className="overlay">
      <div className="modal draft">
        <h2>🃏 Draft — strengthen your beast</h2>
        {needCard ? (
          <>
            <p className="muted">Pick a card to add to your deck (or skip):</p>
            <div className="draft-cards">
              {offer.cards.map(cid => (
                <CardView key={cid} card={db.cards[cid]} size="draft"
                  onClick={() => { sfx('pick'); send({ type: 'draftPick', cardId: cid }); }} />
              ))}
            </div>
            <button className="btn mini" onClick={() => send({ type: 'draftPick', cardId: 'skip' })}>Skip card</button>
          </>
        ) : needRelic ? (
          <>
            <p className="muted">Choose a relic — it bends the rules for the rest of the match:</p>
            <div className="relic-offers">
              {offer.relics.map(rid => (
                <div key={rid} className="relic-card" onClick={() => { sfx('relic'); send({ type: 'relicPick', relicId: rid }); }}>
                  <div className="relic-icon">🪙</div>
                  <b>{db.relics[rid].name}</b>
                  <p>{db.relics[rid].text}</p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="muted center">✅ Picks made. Waiting for: {waitingNames.join(', ') || '…'}</p>
        )}
      </div>
    </div>
  );
}

// ---------------- Game over ----------------

function GameOver({ view, me, onLeave }) {
  const winners = (view.winners || []).map(id => view.players.find(p => p.id === id));
  const iWon = (view.winners || []).includes(me.id);
  useEffect(() => { sfx(iWon ? 'victory' : 'defeat'); }, []); // eslint-disable-line
  return (
    <div className="overlay">
      <div className="modal gameover">
        <h1>{winners.length === 0 ? '💀 Mutual Destruction' : iWon ? '🏆 Victory!' : '☠️ Defeat'}</h1>
        {winners.length > 0 && (
          <div className="winner-row">
            {winners.map(w => (
              <div key={w.id} className="winner">
                <BeastSprite classId={w.classId} size={130} />
                <b>{w.name}</b>
              </div>
            ))}
          </div>
        )}
        <p className="muted">The forest falls silent after {view.round} rounds.</p>
        <button className="btn primary big" onClick={onLeave}>Back to den</button>
      </div>
    </div>
  );
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
