// Bot decision-making. Bots are first-class players: they produce the same
// intents (queuePlay / commit / draftPick / relicPick) through the same engine
// API as humans — no special-cased game logic anywhere in the engine.

import { CARDS, CLASSES } from './cards.js';
import { queuePlay, commit, draftPick, relicPick, enemiesOf, alliesOf } from './engine.js';

// Decide and queue a full combat turn for bot `p`. Returns true when committed.
export function botPlayTurn(game, p) {
  if (game.phase !== 'combat' || !p.alive || p.committed) return false;

  let guard = 30;
  while (guard-- > 0) {
    const choice = bestPlay(game, p);
    if (!choice) break;
    const res = queuePlay(game, p, choice.uid, choice.targetId);
    if (res.error) break;
  }
  commit(game, p);
  return true;
}

function bestPlay(game, p) {
  const enemies = enemiesOf(game, p);
  if (enemies.length === 0) return null;
  const threat = estimateThreat(game, p, enemies);
  const wantBlock = p.hp - p.block < threat + 6;

  let best = null;
  for (const inst of p.hand) {
    const card = CARDS[inst.cardId];
    if (card.cost > p.energy) continue;
    const { score, targetId } = scoreCard(game, p, card, enemies, wantBlock);
    if (score <= 0) continue;
    if (!best || score > best.score) best = { uid: inst.uid, targetId, score };
  }
  return best;
}

function estimateThreat(game, p, enemies) {
  // Rough incoming-damage estimate: each enemy averages ~7 + their strength,
  // spread across the enemies they can hit (in FFA they may hit someone else).
  const targetsAvailable = game.mode === 'teams' ? 1 : Math.max(1, enemies.length);
  let total = 0;
  for (const e of enemies) total += (7 + e.statuses.strength * 2) / targetsAvailable;
  return Math.ceil(total) + p.statuses.burn + Math.min(p.statuses.poison, 4);
}

function scoreCard(game, p, card, enemies, wantBlock) {
  const fx = card.fx;
  const target = pickTarget(game, p, card, enemies);
  let score = 0;

  if (card.type === 'attack' || fx.damage || fx.damageEqBlock || fx.damageEqPoisonX2) {
    let dmg = (fx.damage || 0) + p.statuses.strength;
    if (fx.damageEqBlock) dmg = p.block;
    if (fx.damageEqPoisonX2 && target) dmg = target.statuses.poison * 2;
    dmg *= fx.hits || 1;
    if (p.statuses.weak > 0) dmg = Math.floor(dmg * 0.75);
    score += dmg * 1.0;
    // lethal pressure: finishing a low target is worth a lot
    if (target && dmg >= target.hp + target.block) score += 25;
    if (fx.hits && p.statuses.strength > 0) score += p.statuses.strength * (fx.hits - 1);
  }
  if (fx.burn && card.target !== 'self') score += fx.burn * 0.9 * (card.target === 'allEnemies' ? enemies.length : 1);
  if (fx.poison) score += fx.poison * 1.2 * (card.target === 'allEnemies' ? enemies.length : 1);
  if (fx.doublePoison && target) score += target.statuses.poison * 1.3;
  if (fx.weak) score += 2.5;
  if (fx.vulnerable) score += 2.5;

  if (fx.block) score += fx.block * (wantBlock ? 1.4 : 0.5);
  if (fx.doubleBlock) score += p.block * (wantBlock ? 1.3 : 0.4);
  if (fx.blockTarget) {
    const ally = pickWeakestAlly(game, p);
    score += fx.blockTarget * (ally && ally.hp < ally.maxHp * 0.5 ? 1.2 : 0.6);
  }
  if (fx.heal) score += Math.min(fx.heal, p.maxHp - p.hp) * 1.1;
  if (fx.healTarget && target) score += Math.min(fx.healTarget, target.maxHp - target.hp) * 1.1;
  if (fx.strength) score += fx.strength * 4;
  if (fx.thorns) score += fx.thorns * 2;
  if (fx.regen) score += fx.regen * 2;
  if (fx.power) {
    // powers are best early, dead weight late
    score += game.round <= 7 ? 14 - game.round : 2;
  }
  if (fx.draw) score += fx.draw * 2;
  if (fx.energy) score += fx.energy * 3;
  if (fx.selfBurn) score -= fx.selfBurn * 0.8;
  if (fx.lifesteal) score += 2;

  // don't waste a heal at full hp
  if ((fx.heal || fx.healTarget) && p.hp >= p.maxHp - 2 && !fx.block && !fx.damage) score = 0;

  // small efficiency bias: cheaper cards first when scores are close
  score -= card.cost * 0.5;

  return { score, targetId: target ? target.id : null };
}

function pickTarget(game, p, card, enemies) {
  if (card.target === 'enemy') {
    // poison cards stack onto the already-poisoned enemy; otherwise hit the squishiest
    if (card.fx.poison || card.fx.doublePoison || card.fx.damageEqPoisonX2) {
      const poisoned = [...enemies].sort((a, b) => b.statuses.poison - a.statuses.poison)[0];
      if (poisoned && (poisoned.statuses.poison > 0 || card.fx.poison)) return poisoned;
    }
    return [...enemies].sort((a, b) => (a.hp + a.block) - (b.hp + b.block))[0] || null;
  }
  if (card.target === 'ally') return pickWeakestAlly(game, p);
  return null;
}

function pickWeakestAlly(game, p) {
  const allies = alliesOf(game, p);
  return [...allies].sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp))[0] || p;
}

// ---------- draft ----------

export function botDraft(game, p) {
  const offer = game.draft && game.draft.offers[p.id];
  if (!offer) return;
  if (offer.pickedCard === null) {
    const myArch = CLASSES[p.classId]?.archetype;
    const archCounts = {};
    for (const list of [p.deck, p.discard, p.hand]) {
      for (const inst of list) {
        const a = CARDS[inst.cardId].archetype;
        archCounts[a] = (archCounts[a] || 0) + 1;
      }
    }
    const rarityVal = { common: 1, uncommon: 2, rare: 3 };
    let best = null;
    for (const id of offer.cards) {
      const c = CARDS[id];
      let s = rarityVal[c.rarity] * 2;
      s += (archCounts[c.archetype] || 0) * 1.5;            // draft toward what we have
      if (c.archetype === myArch) s += 3;                   // and toward our class
      if (c.archetype === 'neutral') s += 1;
      if (!best || s > best.s) best = { id, s };
    }
    draftPick(game, p, best.id);
  }
  if (offer.relics.length > 0 && offer.pickedRelic === null) {
    const pref = ['acornCharm', 'owlFeather', 'stagHeart', 'wolfTotem', 'ravenSkull',
      'serpentEye', 'emberStone', 'turtleShell', 'thornPelt', 'mossHide', 'honeycomb'];
    const pick = [...offer.relics].sort((a, b) => pref.indexOf(a) - pref.indexOf(b))[0];
    relicPick(game, p, pick);
  }
}
