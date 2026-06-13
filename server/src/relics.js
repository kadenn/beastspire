// Relic database. Hooks are read by engine.js at the points named in each comment.
export const RELICS = {
  acornCharm:  { name: 'Acorn Charm',  text: '+1 Energy every round.' },            // startRound
  owlFeather:  { name: 'Owl Feather',  text: 'Draw +1 card every round.' },         // startRound
  thornPelt:   { name: 'Thorn Pelt',   text: 'Gain 2 permanent Thorns.' },          // on pickup
  honeycomb:   { name: 'Honeycomb',    text: 'Heal 4 HP at every draft.' },         // startDraft
  wolfTotem:   { name: 'Wolf Totem',   text: 'Gain 1 permanent Strength.' },        // on pickup
  turtleShell: { name: 'Turtle Shell', text: 'Gain 3 Block at the start of every round.' }, // startRound
  serpentEye:  { name: 'Serpent Eye',  text: 'Poison you apply is increased by 1.' }, // applyPoison
  emberStone:  { name: 'Ember Stone',  text: 'Burn you apply is increased by 1.' },   // applyBurn
  stagHeart:   { name: 'Stag Heart',   text: '+12 Max HP. Heal 12.' },              // on pickup
  ravenSkull:  { name: 'Raven Skull',  text: 'Your first attack each round deals +4 damage.' }, // attack calc
  mossHide:    { name: 'Moss Hide',    text: 'Take 1 less damage from attacks.' },  // damage calc
};

for (const [id, r] of Object.entries(RELICS)) r.id = id;

export function rollRelics(rng, owned, n = 2) {
  const pool = Object.keys(RELICS).filter(id => !owned.includes(id));
  const picks = [];
  while (picks.length < n && pool.length) {
    const i = Math.floor(rng() * pool.length);
    picks.push(pool.splice(i, 1)[0]);
  }
  return picks;
}
