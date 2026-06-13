// Card database. Effects are interpreted by engine.js — every field here is functional.
// target: 'enemy' | 'self' | 'ally' (ally or self) | 'allEnemies'
// archetype: 'fire' (aggro/burn) | 'bark' (block/scaling) | 'venom' (poison/attrition) | 'neutral'

export const CLASSES = {
  fox:      { id: 'fox',      name: 'Cinder Drake',   archetype: 'fire',  starter: 'emberBite' },
  tortoise: { id: 'tortoise', name: 'Stone Sentinel', archetype: 'bark',  starter: 'shellBash' },
  viper:    { id: 'viper',    name: 'Venom Lizard',   archetype: 'venom', starter: 'venomSpit' },
};

const A = 'attack', S = 'skill', P = 'power';

export const CARDS = {
  // ---- starters (neutral) ----
  clawSwipe: { name: 'Claw Swipe', type: A, cost: 1, archetype: 'neutral', rarity: 'starter',
    target: 'enemy', text: 'Deal 6 damage.', fx: { damage: 6 } },
  hunker: { name: 'Hunker Down', type: S, cost: 1, archetype: 'neutral', rarity: 'starter',
    target: 'self', text: 'Gain 5 Block.', fx: { block: 5 } },

  // ---- class starters ----
  emberBite: { name: 'Ember Bite', type: A, cost: 1, archetype: 'fire', rarity: 'starter',
    target: 'enemy', text: 'Deal 4 damage. Apply 2 Burn.', fx: { damage: 4, burn: 2 } },
  shellBash: { name: 'Shell Bash', type: A, cost: 1, archetype: 'bark', rarity: 'starter',
    target: 'enemy', text: 'Deal 4 damage. Gain 3 Block.', fx: { damage: 4, block: 3 } },
  venomSpit: { name: 'Venom Spit', type: A, cost: 1, archetype: 'venom', rarity: 'starter',
    target: 'enemy', text: 'Deal 3 damage. Apply 2 Poison.', fx: { damage: 3, poison: 2 } },

  // ---- FIRE: aggro / burn ----
  flameFang: { name: 'Flame Fang', type: A, cost: 1, archetype: 'fire', rarity: 'common',
    target: 'enemy', text: 'Deal 8 damage.', fx: { damage: 8 } },
  cinderSwipe: { name: 'Cinder Swipe', type: A, cost: 0, archetype: 'fire', rarity: 'common',
    target: 'enemy', text: 'Deal 4 damage.', fx: { damage: 4 } },
  wildfire: { name: 'Wildfire', type: S, cost: 1, archetype: 'fire', rarity: 'common',
    target: 'enemy', text: 'Apply 5 Burn.', fx: { burn: 5 } },
  emberVeil: { name: 'Ember Veil', type: S, cost: 1, archetype: 'fire', rarity: 'common',
    target: 'self', text: 'Gain 7 Block. You take 2 Burn.', fx: { block: 7, selfBurn: 2 } },
  scorch: { name: 'Scorch', type: A, cost: 2, archetype: 'fire', rarity: 'uncommon',
    target: 'enemy', text: 'Deal 10 damage. Apply 3 Burn.', fx: { damage: 10, burn: 3 } },
  twinFangs: { name: 'Twin Fangs', type: A, cost: 1, archetype: 'fire', rarity: 'uncommon',
    target: 'enemy', text: 'Deal 4 damage twice.', fx: { damage: 4, hits: 2 } },
  firestorm: { name: 'Firestorm', type: A, cost: 2, archetype: 'fire', rarity: 'uncommon',
    target: 'allEnemies', text: 'Deal 6 damage and apply 2 Burn to ALL enemies.', fx: { damage: 6, burn: 2 } },
  blazingSpeed: { name: 'Blazing Speed', type: S, cost: 0, archetype: 'fire', rarity: 'uncommon',
    target: 'self', text: 'Draw 2 cards.', fx: { draw: 2 } },
  volcanicRage: { name: 'Volcanic Rage', type: P, cost: 1, archetype: 'fire', rarity: 'uncommon',
    target: 'self', text: 'Gain 2 Strength.', fx: { strength: 2 } },
  infernoHowl: { name: 'Inferno Howl', type: P, cost: 1, archetype: 'fire', rarity: 'rare',
    target: 'self', text: 'Your attacks also apply 2 Burn.', fx: { power: { attacksApplyBurn: 2 } } },
  meteorPounce: { name: 'Meteor Pounce', type: A, cost: 3, archetype: 'fire', rarity: 'rare',
    target: 'enemy', text: 'Deal 20 damage. You take 3 Burn.', fx: { damage: 20, selfBurn: 3 } },
  phoenixPlume: { name: 'Phoenix Plume', type: S, cost: 2, archetype: 'fire', rarity: 'rare',
    target: 'self', text: 'Heal 9 HP. Exhaust.', fx: { heal: 9 }, exhaust: true },

  // ---- BARK: block / scaling ----
  barkSkin: { name: 'Bark Skin', type: S, cost: 1, archetype: 'bark', rarity: 'common',
    target: 'self', text: 'Gain 7 Block.', fx: { block: 7 } },
  rootGuard: { name: 'Root Guard', type: S, cost: 1, archetype: 'bark', rarity: 'common',
    target: 'self', text: 'Gain 5 Block. Draw 1 card.', fx: { block: 5, draw: 1 } },
  bodyCheck: { name: 'Body Check', type: A, cost: 1, archetype: 'bark', rarity: 'common',
    target: 'enemy', text: 'Deal damage equal to your Block.', fx: { damageEqBlock: true } },
  regrowth: { name: 'Regrowth', type: S, cost: 1, archetype: 'bark', rarity: 'common',
    target: 'self', text: 'Heal 4 HP.', fx: { heal: 4 } },
  oakWall: { name: 'Oak Wall', type: S, cost: 2, archetype: 'bark', rarity: 'uncommon',
    target: 'self', text: 'Gain 13 Block.', fx: { block: 13 } },
  entrench: { name: 'Entrench', type: S, cost: 2, archetype: 'bark', rarity: 'uncommon',
    target: 'self', text: 'Double your Block.', fx: { doubleBlock: true } },
  thornMail: { name: 'Thorn Mail', type: P, cost: 1, archetype: 'bark', rarity: 'uncommon',
    target: 'self', text: 'Gain 3 Thorns. (Attackers take damage.)', fx: { thorns: 3 } },
  shelteringCanopy: { name: 'Sheltering Canopy', type: S, cost: 1, archetype: 'bark', rarity: 'uncommon',
    target: 'ally', text: 'Give an ally (or yourself) 9 Block.', fx: { blockTarget: 9 } },
  boulderRoll: { name: 'Boulder Roll', type: A, cost: 2, archetype: 'bark', rarity: 'uncommon',
    target: 'enemy', text: 'Deal 9 damage. Apply 1 Weak.', fx: { damage: 9, weak: 1 } },
  ancientGrowth: { name: 'Ancient Growth', type: P, cost: 1, archetype: 'bark', rarity: 'rare',
    target: 'self', text: 'Gain 3 Block at the start of every round.', fx: { power: { blockPerRound: 3 } } },
  deepRoots: { name: 'Deep Roots', type: P, cost: 2, archetype: 'bark', rarity: 'rare',
    target: 'self', text: 'Gain 2 Thorns at the start of every round.', fx: { power: { thornsPerRound: 2 } } },
  livingFortress: { name: 'Living Fortress', type: S, cost: 3, archetype: 'bark', rarity: 'rare',
    target: 'self', text: 'Gain 11 Block. Gain 2 Regen.', fx: { block: 11, regen: 2 } },

  // ---- VENOM: poison / attrition ----
  viperFang: { name: 'Viper Fang', type: A, cost: 1, archetype: 'venom', rarity: 'common',
    target: 'enemy', text: 'Deal 5 damage. Apply 2 Poison.', fx: { damage: 5, poison: 2 } },
  corrode: { name: 'Corrode', type: S, cost: 1, archetype: 'venom', rarity: 'common',
    target: 'enemy', text: 'Apply 3 Poison and 1 Weak.', fx: { poison: 3, weak: 1 } },
  paralyticSting: { name: 'Paralytic Sting', type: A, cost: 1, archetype: 'venom', rarity: 'common',
    target: 'enemy', text: 'Deal 4 damage. Apply 2 Weak.', fx: { damage: 4, weak: 2 } },
  mendingMoss: { name: 'Mending Moss', type: S, cost: 1, archetype: 'venom', rarity: 'common',
    target: 'ally', text: 'Heal an ally (or yourself) 5 HP.', fx: { healTarget: 5 } },
  shadowCoil: { name: 'Shadow Coil', type: S, cost: 1, archetype: 'venom', rarity: 'uncommon',
    target: 'enemy', text: 'Gain 4 Block. Apply 1 Weak.', fx: { block: 4, weak: 1 } },
  leechFang: { name: 'Leech Fang', type: A, cost: 1, archetype: 'venom', rarity: 'uncommon',
    target: 'enemy', text: 'Deal 6 damage. Heal for unblocked damage dealt.', fx: { damage: 6, lifesteal: true } },
  toxicCloud: { name: 'Toxic Cloud', type: S, cost: 2, archetype: 'venom', rarity: 'uncommon',
    target: 'allEnemies', text: 'Apply 4 Poison to ALL enemies.', fx: { poison: 4 } },
  plagueSpores: { name: 'Plague Spores', type: S, cost: 2, archetype: 'venom', rarity: 'uncommon',
    target: 'enemy', text: "Double an enemy's Poison.", fx: { doublePoison: true } },
  rupture: { name: 'Rupture', type: A, cost: 1, archetype: 'venom', rarity: 'rare',
    target: 'enemy', text: "Deal damage equal to twice the target's Poison.", fx: { damageEqPoisonX2: true } },
  noxiousBloom: { name: 'Noxious Bloom', type: P, cost: 2, archetype: 'venom', rarity: 'rare',
    target: 'self', text: 'Apply 2 Poison to ALL enemies every round.', fx: { power: { poisonAllPerRound: 2 } } },
  serpentsPatience: { name: "Serpent's Patience", type: P, cost: 1, archetype: 'venom', rarity: 'rare',
    target: 'self', text: 'Gain 2 Regen at the start of every round.', fx: { power: { regenPerRound: 2 } } },

  // ---- NEUTRAL extras ----
  wildInstinct: { name: 'Wild Instinct', type: S, cost: 1, archetype: 'neutral', rarity: 'common',
    target: 'self', text: 'Draw 2 cards.', fx: { draw: 2 } },
  warHowl: { name: 'War Howl', type: P, cost: 1, archetype: 'neutral', rarity: 'common',
    target: 'self', text: 'Gain 1 Strength.', fx: { strength: 1 } },
  vineWhip: { name: 'Vine Whip', type: A, cost: 1, archetype: 'neutral', rarity: 'common',
    target: 'enemy', text: 'Deal 5 damage. Apply 1 Vulnerable.', fx: { damage: 5, vulnerable: 1 } },
  crushingBlow: { name: 'Crushing Blow', type: A, cost: 2, archetype: 'neutral', rarity: 'uncommon',
    target: 'enemy', text: 'Deal 13 damage.', fx: { damage: 13 } },
  adrenaline: { name: 'Adrenaline', type: S, cost: 0, archetype: 'neutral', rarity: 'rare',
    target: 'self', text: 'Gain 2 Energy. Exhaust.', fx: { energy: 2 }, exhaust: true },
};

for (const [id, c] of Object.entries(CARDS)) c.id = id;

export const DRAFT_POOL = Object.values(CARDS).filter(c => c.rarity !== 'starter');

const RARITY_WEIGHT = { common: 60, uncommon: 30, rare: 10 };

export function rollDraftCards(rng, n = 3) {
  const picks = [];
  const pool = [...DRAFT_POOL];
  while (picks.length < n && pool.length) {
    const total = pool.reduce((s, c) => s + RARITY_WEIGHT[c.rarity], 0);
    let r = rng() * total;
    let chosen = pool[0];
    for (const c of pool) { r -= RARITY_WEIGHT[c.rarity]; if (r <= 0) { chosen = c; break; } }
    picks.push(chosen.id);
    pool.splice(pool.indexOf(chosen), 1);
  }
  return picks;
}

let uidCounter = 0;
export function makeCardInstance(cardId) {
  return { uid: `c${++uidCounter}`, cardId };
}

export function starterDeck(classId) {
  const cls = CLASSES[classId] || CLASSES.fox;
  const ids = [
    'clawSwipe', 'clawSwipe', 'clawSwipe', 'clawSwipe',
    'hunker', 'hunker', 'hunker', 'hunker',
    cls.starter, cls.starter,
  ];
  return ids.map(makeCardInstance);
}
