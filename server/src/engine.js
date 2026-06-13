// Authoritative game engine. All rules resolve here; clients only render state
// and send intents. Turn model: simultaneous secret commits — every player
// queues plays, then the round resolves in phases:
//   1. Skills & Powers (all players, seat order) — block, buffs, debuffs, heals
//   2. Attacks (interleaved round-robin, rotating start seat) — damage vs post-skill block
//   3. End of round — poison ticks, burn ticks, regen, forest wrath escalation
// Deaths are only checked at the end of the round, so mutual KOs are possible
// and nobody is denied their queued plays.

import { CARDS, makeCardInstance, starterDeck, rollDraftCards } from './cards.js';
import { RELICS, rollRelics } from './relics.js';

export const HAND_SIZE = 5;
export const BASE_ENERGY = 3;
export const START_HP = 70;
export const COMBAT_TIMER_MS = 60_000;
export const DRAFT_TIMER_MS = 35_000;
export const DRAFT_EVERY = 3;          // draft after every 3 combat rounds
export const WRATH_START_ROUND = 9;    // escalating ambient damage from this round

export function createGame(seats, mode, rng = Math.random) {
  const players = {};
  for (const seat of seats) {
    players[seat.id] = {
      id: seat.id,
      name: seat.name,
      classId: seat.classId,
      team: mode === 'teams' ? seat.team : null,
      isBot: seat.kind === 'bot',
      wasAlwaysBot: seat.kind === 'bot',
      connected: seat.kind === 'bot' ? true : !!seat.connected,
      hp: START_HP, maxHp: START_HP,
      block: 0, energy: 0,
      statuses: { strength: 0, weak: 0, vulnerable: 0, burn: 0, poison: 0, thorns: 0, regen: 0 },
      powers: {},      // attacksApplyBurn, blockPerRound, thornsPerRound, poisonAllPerRound, regenPerRound
      relics: [],
      deck: shuffle(starterDeck(seat.classId), rng),
      hand: [], discard: [], exhausted: [],
      queued: [],      // [{ card, targetId }]
      committed: false,
      alive: true,
      attackPlaysThisRound: 0,
    };
  }
  return {
    mode, rng,
    phase: 'combat',
    round: 0,
    draftCount: 0,
    players,
    seatOrder: seats.map(s => s.id),
    deadline: 0,
    draft: null,     // { offers: {pid: {cards, relics, pickedCard, pickedRelic, done}} }
    winners: null,   // array of player ids
    log: [],
  };
}

function shuffle(arr, rng) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function alivePlayers(game) {
  return game.seatOrder.map(id => game.players[id]).filter(p => p.alive);
}

export function enemiesOf(game, p) {
  return alivePlayers(game).filter(o => o.id !== p.id && (game.mode !== 'teams' || o.team !== p.team));
}

export function alliesOf(game, p) {
  return alivePlayers(game).filter(o => game.mode === 'teams' ? o.team === p.team : o.id === p.id);
}

// ---------- round lifecycle ----------

export function startRound(game, events = []) {
  game.phase = 'combat';
  game.round += 1;
  events.push({ kind: 'roundStart', round: game.round });
  for (const p of alivePlayers(game)) {
    p.block = 0;
    p.queued = [];
    p.committed = false;
    p.attackPlaysThisRound = 0;
    p.energy = BASE_ENERGY + (p.relics.includes('acornCharm') ? 1 : 0);
    if (p.relics.includes('turtleShell')) gainBlock(p, 3, events);
    if (p.powers.blockPerRound) gainBlock(p, p.powers.blockPerRound, events);
    if (p.powers.thornsPerRound) {
      p.statuses.thorns += p.powers.thornsPerRound;
      events.push({ kind: 'status', target: p.id, status: 'thorns', amount: p.powers.thornsPerRound, total: p.statuses.thorns });
    }
    if (p.powers.regenPerRound) p.statuses.regen += p.powers.regenPerRound;
    // redraw hand
    p.discard.push(...p.hand);
    p.hand = [];
    drawCards(game, p, HAND_SIZE + (p.relics.includes('owlFeather') ? 1 : 0));
  }
  game.deadline = Date.now() + COMBAT_TIMER_MS;
  return events;
}

export function drawCards(game, p, n) {
  const drawn = [];
  for (let i = 0; i < n; i++) {
    if (p.deck.length === 0) {
      if (p.discard.length === 0) break;
      p.deck = shuffle(p.discard, game.rng);
      p.discard = [];
    }
    const c = p.deck.pop();
    p.hand.push(c);
    drawn.push(c);
  }
  return drawn;
}

// ---------- intents (same API for humans and bots) ----------

export function queuePlay(game, p, cardUid, targetId) {
  if (game.phase !== 'combat') return { error: 'Not in combat.' };
  if (!p.alive) return { error: 'You are defeated.' };
  if (p.committed) return { error: 'Already committed.' };
  const idx = p.hand.findIndex(c => c.uid === cardUid);
  if (idx < 0) return { error: 'Card not in hand.' };
  const inst = p.hand[idx];
  const card = CARDS[inst.cardId];
  if (card.cost > p.energy) return { error: 'Not enough energy.' };

  let target = null;
  if (card.target === 'enemy') {
    target = game.players[targetId];
    if (!target || !target.alive) return { error: 'Invalid target.' };
    if (target.id === p.id) return { error: "Can't target yourself." };
    if (game.mode === 'teams' && target.team === p.team) return { error: "Can't target a teammate with that." };
  } else if (card.target === 'ally') {
    target = game.players[targetId];
    if (!target || !target.alive) return { error: 'Invalid target.' };
    if (game.mode === 'teams' ? target.team !== p.team : target.id !== p.id)
      return { error: 'Must target yourself or a teammate.' };
  }

  p.energy -= card.cost;
  p.hand.splice(idx, 1);
  const play = { card: inst, targetId: target ? target.id : null, immediate: false };
  // Draw/energy effects resolve immediately so the cards are usable this round.
  if (card.fx.draw) { drawCards(game, p, card.fx.draw); play.immediate = true; }
  if (card.fx.energy) { p.energy += card.fx.energy; play.immediate = true; }
  p.queued.push(play);
  return { ok: true };
}

export function unqueuePlay(game, p, index) {
  if (game.phase !== 'combat' || p.committed) return { error: 'Cannot undo now.' };
  const play = p.queued[index];
  if (!play) return { error: 'No such queued play.' };
  if (play.immediate) return { error: 'That card already drew/gained — cannot take it back.' };
  p.queued.splice(index, 1);
  p.hand.push(play.card);
  p.energy += CARDS[play.card.cardId].cost;
  return { ok: true };
}

export function commit(game, p) {
  if (game.phase !== 'combat') return { error: 'Not in combat.' };
  if (!p.alive) return { error: 'You are defeated.' };
  p.committed = true;
  return { ok: true, allCommitted: alivePlayers(game).every(x => x.committed) };
}

// ---------- resolution ----------

export function resolveRound(game) {
  const events = [];
  events.push({ kind: 'reveal', plays: alivePlayers(game).map(p => ({
    player: p.id,
    cards: p.queued.map(q => ({ cardId: q.card.cardId, targetId: q.targetId })),
  })) });

  const order = alivePlayers(game);

  // Phase 1: skills & powers, seat order, each player's queue order
  for (const p of order) {
    for (const play of p.queued) {
      const card = CARDS[play.card.cardId];
      if (card.type === 'attack') continue;
      events.push({ kind: 'play', player: p.id, cardId: card.id, targetId: play.targetId });
      applyNonAttack(game, p, card, play.targetId, events);
    }
  }

  // Phase 2: attacks, interleaved round-robin with rotating start seat
  const startIdx = (game.round - 1) % order.length;
  const queues = order.map(p => p.queued.filter(q => CARDS[q.card.cardId].type === 'attack'));
  let remaining = queues.reduce((s, q) => s + q.length, 0);
  let i = startIdx;
  while (remaining > 0) {
    const q = queues[i % order.length];
    if (q.length) {
      const play = q.shift();
      remaining--;
      const p = order[i % order.length];
      const card = CARDS[play.card.cardId];
      events.push({ kind: 'play', player: p.id, cardId: card.id, targetId: play.targetId });
      applyAttack(game, p, card, play.targetId, events);
    }
    i++;
  }

  // discard queued cards
  for (const p of order) {
    for (const play of p.queued) {
      const card = CARDS[play.card.cardId];
      (card.exhaust ? p.exhausted : p.discard).push(play.card);
    }
    p.queued = [];
  }

  // Phase 3: end of round
  for (const p of order) {
    if (p.powers.poisonAllPerRound) {
      for (const e of enemiesOf(game, p)) applyPoison(p, e, p.powers.poisonAllPerRound, events);
    }
  }
  for (const p of order) {
    if (p.statuses.poison > 0) {
      loseHp(p, p.statuses.poison, events, 'poison');
      p.statuses.poison -= 1;
    }
    if (p.statuses.burn > 0) {
      loseHp(p, p.statuses.burn, events, 'burn');
      p.statuses.burn = 0; // burn detonates once, then clears
    }
    if (p.statuses.regen > 0) {
      healHp(p, p.statuses.regen, events, 'regen');
      p.statuses.regen -= 1;
    }
    if (p.statuses.weak > 0) p.statuses.weak -= 1;
    if (p.statuses.vulnerable > 0) p.statuses.vulnerable -= 1;
  }
  // Forest Wrath: escalating ambient damage so matches always end
  if (game.round >= WRATH_START_ROUND) {
    const dmg = (game.round - WRATH_START_ROUND + 1) * 2;
    events.push({ kind: 'wrath', amount: dmg });
    for (const p of order) loseHp(p, dmg, events, 'wrath');
  }

  // deaths — checked only now, mutual KOs possible
  for (const p of order) {
    if (p.hp <= 0 && p.alive) {
      p.alive = false;
      p.hp = 0;
      events.push({ kind: 'death', player: p.id });
    }
  }

  checkGameOver(game, events);
  if (game.phase === 'over') return events;

  if (game.round % DRAFT_EVERY === 0) startDraft(game, events);
  else startRound(game, events);
  return events;
}

function checkGameOver(game, events) {
  const alive = alivePlayers(game);
  const aliveGroups = new Set(alive.map(p => game.mode === 'teams' ? `t${p.team}` : p.id));
  if (aliveGroups.size <= 1) {
    game.phase = 'over';
    if (game.mode === 'teams' && alive.length > 0) {
      // The whole surviving team wins, including teammates who died along the way.
      const team = alive[0].team;
      game.winners = Object.values(game.players).filter(p => p.team === team).map(p => p.id);
    } else {
      game.winners = alive.map(p => p.id); // empty array = mutual destruction draw
    }
    events.push({ kind: 'gameOver', winners: game.winners });
  }
}

// ---------- effect application ----------

function applyNonAttack(game, p, card, targetId, events) {
  const fx = card.fx;
  const targets = card.target === 'allEnemies' ? enemiesOf(game, p)
    : targetId ? [game.players[targetId]].filter(t => t && t.alive) : [p];

  if (fx.block) gainBlock(p, fx.block, events);
  if (fx.doubleBlock) {
    const gain = p.block;
    if (gain > 0) gainBlock(p, gain, events);
  }
  if (fx.heal) healHp(p, fx.heal, events);
  if (fx.strength) {
    p.statuses.strength += fx.strength;
    events.push({ kind: 'status', target: p.id, status: 'strength', amount: fx.strength, total: p.statuses.strength });
  }
  if (fx.thorns) {
    p.statuses.thorns += fx.thorns;
    events.push({ kind: 'status', target: p.id, status: 'thorns', amount: fx.thorns, total: p.statuses.thorns });
  }
  if (fx.regen) {
    p.statuses.regen += fx.regen;
    events.push({ kind: 'status', target: p.id, status: 'regen', amount: fx.regen, total: p.statuses.regen });
  }
  if (fx.selfBurn) applyBurn(null, p, fx.selfBurn, events);
  if (fx.power) {
    for (const [k, v] of Object.entries(fx.power)) p.powers[k] = (p.powers[k] || 0) + v;
    events.push({ kind: 'power', player: p.id, cardId: card.id });
  }

  for (const t of targets) {
    if (fx.blockTarget) gainBlock(t, fx.blockTarget, events);
    if (fx.healTarget) healHp(t, fx.healTarget, events);
    if (fx.burn) applyBurn(p, t, fx.burn, events);
    if (fx.poison) applyPoison(p, t, fx.poison, events);
    if (fx.doublePoison && t.statuses.poison > 0) applyPoison(null, t, t.statuses.poison, events);
    if (fx.weak) applyStatus(t, 'weak', fx.weak, events);
    if (fx.vulnerable) applyStatus(t, 'vulnerable', fx.vulnerable, events);
  }
}

function applyAttack(game, p, card, targetId, events) {
  const fx = card.fx;
  const targets = card.target === 'allEnemies' ? enemiesOf(game, p)
    : [game.players[targetId]].filter(t => t && t.alive);
  const hits = fx.hits || 1;
  const firstAttack = p.attackPlaysThisRound === 0;
  p.attackPlaysThisRound += 1;

  for (const t of targets) {
    let base = fx.damage || 0;
    if (fx.damageEqBlock) base = p.block;
    if (fx.damageEqPoisonX2) base = t.statuses.poison * 2;

    for (let h = 0; h < hits; h++) {
      let dmg = base + p.statuses.strength;
      if (firstAttack && h === 0 && p.relics.includes('ravenSkull')) dmg += 4;
      if (p.statuses.weak > 0) dmg = Math.floor(dmg * 0.75);
      if (t.statuses.vulnerable > 0) dmg = Math.floor(dmg * 1.25);
      if (t.relics.includes('mossHide')) dmg = Math.max(0, dmg - 1);
      const dealt = dealAttackDamage(t, dmg, events, p.id);
      if (fx.lifesteal && dealt > 0) healHp(p, dealt, events, 'lifesteal');
    }
    if (fx.burn) applyBurn(p, t, fx.burn, events);
    if (fx.poison) applyPoison(p, t, fx.poison, events);
    if (fx.weak) applyStatus(t, 'weak', fx.weak, events);
    if (fx.vulnerable) applyStatus(t, 'vulnerable', fx.vulnerable, events);
    if (p.powers.attacksApplyBurn) applyBurn(p, t, p.powers.attacksApplyBurn, events);
    // thorns retaliation (once per attack play, ignores attacker block)
    if (t.statuses.thorns > 0 && t.alive) {
      loseHp(p, t.statuses.thorns, events, 'thorns');
    }
  }
  if (fx.block) gainBlock(p, fx.block, events);
  if (fx.selfBurn) applyBurn(null, p, fx.selfBurn, events);
}

function dealAttackDamage(t, amount, events, sourceId) {
  const blocked = Math.min(t.block, amount);
  t.block -= blocked;
  const through = amount - blocked;
  t.hp -= through;
  events.push({ kind: 'damage', target: t.id, source: sourceId, amount: through, blocked,
    hpAfter: Math.max(0, t.hp), blockAfter: t.block });
  return through;
}

function loseHp(p, amount, events, reason) {
  p.hp -= amount;
  events.push({ kind: 'damage', target: p.id, source: reason, amount, blocked: 0,
    hpAfter: Math.max(0, p.hp), blockAfter: p.block });
}

function healHp(p, amount, events, reason = 'heal') {
  const healed = Math.min(amount, p.maxHp - p.hp);
  p.hp += healed;
  if (healed > 0) events.push({ kind: 'heal', target: p.id, amount: healed, hpAfter: p.hp, reason });
}

function gainBlock(p, amount, events) {
  p.block += amount;
  events.push({ kind: 'block', target: p.id, amount, blockAfter: p.block });
}

function applyBurn(source, t, amount, events) {
  let a = amount;
  if (source && source.relics.includes('emberStone')) a += 1;
  t.statuses.burn += a;
  events.push({ kind: 'status', target: t.id, status: 'burn', amount: a, total: t.statuses.burn });
}

function applyPoison(source, t, amount, events) {
  let a = amount;
  if (source && source.relics.includes('serpentEye')) a += 1;
  t.statuses.poison += a;
  events.push({ kind: 'status', target: t.id, status: 'poison', amount: a, total: t.statuses.poison });
}

function applyStatus(t, status, amount, events) {
  t.statuses[status] += amount;
  events.push({ kind: 'status', target: t.id, status, amount, total: t.statuses[status] });
}

// ---------- draft ----------

export function startDraft(game, events = []) {
  game.phase = 'draft';
  game.draftCount += 1;
  const offerRelic = game.draftCount % 2 === 0; // every other draft offers a relic too
  game.draft = { offers: {} };
  for (const p of alivePlayers(game)) {
    if (p.relics.includes('honeycomb')) healHp(p, 4, events, 'honeycomb');
    game.draft.offers[p.id] = {
      cards: rollDraftCards(game.rng, 3),
      relics: offerRelic ? rollRelics(game.rng, p.relics, 2) : [],
      pickedCard: null,
      pickedRelic: null,
    };
  }
  game.deadline = Date.now() + DRAFT_TIMER_MS;
  events.push({ kind: 'draftStart', draftCount: game.draftCount, offerRelic });
  return events;
}

export function draftPick(game, p, cardId) {
  if (game.phase !== 'draft') return { error: 'Not drafting.' };
  const offer = game.draft.offers[p.id];
  if (!offer) return { error: 'No offer.' };
  if (offer.pickedCard !== null) return { error: 'Already picked.' };
  if (cardId !== 'skip' && !offer.cards.includes(cardId)) return { error: 'Not offered.' };
  offer.pickedCard = cardId;
  if (cardId !== 'skip') p.discard.push(makeCardInstance(cardId));
  return { ok: true, allDone: draftAllDone(game) };
}

export function relicPick(game, p, relicId) {
  if (game.phase !== 'draft') return { error: 'Not drafting.' };
  const offer = game.draft.offers[p.id];
  if (!offer || offer.relics.length === 0) return { error: 'No relic offer.' };
  if (offer.pickedRelic !== null) return { error: 'Already picked.' };
  if (!offer.relics.includes(relicId)) return { error: 'Not offered.' };
  offer.pickedRelic = relicId;
  grantRelic(p, relicId);
  return { ok: true, allDone: draftAllDone(game) };
}

export function grantRelic(p, relicId) {
  p.relics.push(relicId);
  if (relicId === 'thornPelt') p.statuses.thorns += 2;
  if (relicId === 'wolfTotem') p.statuses.strength += 1;
  if (relicId === 'stagHeart') { p.maxHp += 12; p.hp = Math.min(p.maxHp, p.hp + 12); }
}

export function draftAllDone(game) {
  return alivePlayers(game).every(p => {
    const o = game.draft.offers[p.id];
    return o.pickedCard !== null && (o.relics.length === 0 || o.pickedRelic !== null);
  });
}

export function forceDraftFinish(game) {
  for (const p of alivePlayers(game)) {
    const o = game.draft.offers[p.id];
    if (o.pickedCard === null) draftPick(game, p, o.cards[0]);
    if (o.relics.length > 0 && o.pickedRelic === null) relicPick(game, p, o.relics[0]);
  }
}

// ---------- per-client view (hides other players' hands & queued plays) ----------

export function viewFor(game, viewerId) {
  return {
    phase: game.phase,
    mode: game.mode,
    round: game.round,
    deadline: game.deadline,
    winners: game.winners,
    wrathRound: WRATH_START_ROUND,
    draftEvery: DRAFT_EVERY,
    seatOrder: game.seatOrder,
    you: viewerId,
    players: game.seatOrder.map(id => {
      const p = game.players[id];
      const pub = {
        id: p.id, name: p.name, classId: p.classId, team: p.team, isBot: p.isBot,
        connected: p.connected, hp: p.hp, maxHp: p.maxHp, block: p.block,
        statuses: p.statuses, powers: p.powers, relics: p.relics,
        alive: p.alive, committed: p.committed,
        deckCount: p.deck.length, discardCount: p.discard.length, handCount: p.hand.length,
        queuedCount: p.queued.length,
      };
      if (id === viewerId) {
        pub.energy = p.energy;
        pub.hand = p.hand.map(c => ({ uid: c.uid, cardId: c.cardId }));
        pub.queued = p.queued.map(q => ({ uid: q.card.uid, cardId: q.card.cardId, targetId: q.targetId, immediate: q.immediate }));
        pub.deckList = countDeck(p);
      }
      return pub;
    }),
    draftOffer: game.phase === 'draft' && game.draft.offers[viewerId] ? game.draft.offers[viewerId] : null,
    draftWaiting: game.phase === 'draft'
      ? alivePlayers(game).filter(p => {
          const o = game.draft.offers[p.id];
          return o.pickedCard === null || (o.relics.length > 0 && o.pickedRelic === null);
        }).map(p => p.id)
      : [],
  };
}

function countDeck(p) {
  const counts = {};
  for (const c of [...p.deck, ...p.discard, ...p.hand, ...p.queued.map(q => q.card)])
    counts[c.cardId] = (counts[c.cardId] || 0) + 1;
  return counts;
}
