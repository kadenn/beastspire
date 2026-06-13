// Beast battlers are painted PNG sprites (rpgbattlers pack); card art and the
// forest backdrop are generated SVG tuned to match the painted palette.
import React from 'react';

// facing: which way the source image looks. Left-side combatants must face
// right (toward the enemy), so we flip when facing !== desired direction.
export const BEASTS = {
  fox:      { sprite: '/assets/beasts/drake.png',  facing: 'right' },
  tortoise: { sprite: '/assets/beasts/golem.png',  facing: 'left' },
  viper:    { sprite: '/assets/beasts/lizard.png', facing: 'right' },
};

export function BeastSprite({ classId, face = 'right', size = 140, className = '', style }) {
  const b = BEASTS[classId] || BEASTS.fox;
  const flip = b.facing !== face;
  return (
    <img
      src={b.sprite}
      alt={classId}
      draggable={false}
      className={`beast-sprite ${className}`}
      style={{ width: size, transform: flip ? 'scaleX(-1)' : undefined, ...style }}
    />
  );
}

export const ARCH_COLORS = {
  fire:    { main: '#ff7a36', dim: '#7a2d10', glow: 'rgba(255,122,54,.55)' },
  bark:    { main: '#7dc463', dim: '#2e4a22', glow: 'rgba(125,196,99,.5)' },
  venom:   { main: '#b66cff', dim: '#42235f', glow: 'rgba(182,108,255,.5)' },
  neutral: { main: '#d8c79a', dim: '#4a4232', glow: 'rgba(216,199,154,.4)' },
};

export const RARITY_COLORS = {
  starter: '#9aa3a0', common: '#c8cfc9', uncommon: '#5fb7e8', rare: '#f3c14b',
};

// ---------- Beast portraits (class avatars, square crop of the battler) ----------

export function BeastPortrait({ classId, size = 64 }) {
  const b = BEASTS[classId] || BEASTS.fox;
  return (
    <img src={b.sprite} alt={classId} draggable={false}
      style={{ width: size, height: size, objectFit: 'contain', display: 'block' }} />
  );
}

// ---------- Card art ----------
// Each card maps to an icon scene drawn in its archetype palette.

const ICONS = {
  claw: (c) => (
    <g stroke={c.main} strokeWidth="5" strokeLinecap="round" fill="none">
      <path d="M28 20 C40 40 44 60 38 82" /><path d="M50 16 C58 40 60 62 54 84" /><path d="M72 20 C76 42 74 64 68 84" />
      <path d="M24 64 L80 36" stroke={c.dim} strokeWidth="8" opacity=".6" />
    </g>
  ),
  flame: (c) => (
    <g>
      <path d="M50 12 C66 30 72 44 70 60 C68 76 60 86 50 88 C40 86 32 76 30 60 C28 44 36 30 50 12 Z" fill={c.main} opacity=".9" />
      <path d="M50 36 C58 46 60 56 58 66 C56 76 53 80 50 82 C47 80 44 76 42 66 C40 56 42 46 50 36 Z" fill="#ffe9a8" />
    </g>
  ),
  shield: (c) => (
    <g>
      <path d="M50 12 L82 24 L78 62 L50 88 L22 62 L18 24 Z" fill={c.dim} stroke={c.main} strokeWidth="5" strokeLinejoin="round" />
      <path d="M50 26 L66 34 L63 58 L50 72 L37 58 L34 34 Z" fill="none" stroke={c.main} strokeWidth="3" opacity=".7" />
    </g>
  ),
  leaf: (c) => (
    <g>
      <path d="M50 10 C80 26 84 60 54 88 C30 70 22 36 50 10 Z" fill={c.main} opacity=".85" />
      <path d="M50 16 C50 40 52 64 54 84" stroke={c.dim} strokeWidth="4" fill="none" />
      <path d="M50 34 L36 40 M52 50 L38 58 M54 64 L42 72" stroke={c.dim} strokeWidth="3" />
    </g>
  ),
  fang: (c) => (
    <g>
      <path d="M30 18 C34 46 40 66 50 86 C56 64 58 44 56 20 Z" fill="#f2ead8" stroke={c.dim} strokeWidth="3" />
      <path d="M58 22 C64 42 68 58 74 70 C76 54 76 36 72 22 Z" fill="#f2ead8" stroke={c.dim} strokeWidth="3" />
      <path d="M28 16 L76 16" stroke={c.main} strokeWidth="6" strokeLinecap="round" />
    </g>
  ),
  droplet: (c) => (
    <g>
      <path d="M50 10 C66 36 74 52 74 64 C74 78 64 88 50 88 C36 88 26 78 26 64 C26 52 34 36 50 10 Z" fill={c.main} opacity=".9" />
      <circle cx="58" cy="64" r="7" fill="#fff" opacity=".5" />
    </g>
  ),
  skull: (c) => (
    <g>
      <path d="M50 14 C70 14 80 28 80 44 C80 56 74 62 68 66 L68 80 L58 80 L58 72 L42 72 L42 80 L32 80 L32 66 C26 62 20 56 20 44 C20 28 30 14 50 14 Z" fill="#e8e4d4" stroke={c.dim} strokeWidth="3" />
      <circle cx="38" cy="44" r="8" fill={c.main} /><circle cx="62" cy="44" r="8" fill={c.main} />
      <path d="M50 52 L46 62 L54 62 Z" fill={c.dim} />
    </g>
  ),
  swirl: (c) => (
    <g fill="none" strokeLinecap="round">
      <path d="M50 50 C50 34 66 30 74 40 C82 52 72 68 56 70 C36 73 22 58 26 40 C30 20 52 12 68 20" stroke={c.main} strokeWidth="6" />
      <circle cx="50" cy="50" r="6" fill={c.main} />
    </g>
  ),
  bolt: (c) => (
    <path d="M58 8 L28 52 L46 54 L40 90 L74 42 L54 40 Z" fill={c.main} stroke={c.dim} strokeWidth="3" strokeLinejoin="round" />
  ),
  heart: (c) => (
    <g>
      <path d="M50 84 C20 62 14 40 26 28 C36 18 48 24 50 34 C52 24 64 18 74 28 C86 40 80 62 50 84 Z" fill={c.main} stroke={c.dim} strokeWidth="3" />
      <path d="M38 36 C42 32 48 34 49 40" stroke="#fff" strokeWidth="3" fill="none" opacity=".6" strokeLinecap="round" />
    </g>
  ),
  paw: (c) => (
    <g fill={c.main}>
      <ellipse cx="50" cy="62" rx="20" ry="16" />
      <circle cx="28" cy="40" r="9" /><circle cx="44" cy="30" r="9" /><circle cx="60" cy="30" r="9" /><circle cx="74" cy="40" r="9" />
    </g>
  ),
  web: (c) => (
    <g stroke={c.main} strokeWidth="3" fill="none" opacity=".9">
      <path d="M50 10 L50 90 M14 30 L86 70 M86 30 L14 70" />
      <path d="M50 30 L67 40 L67 60 L50 70 L33 60 L33 40 Z" />
      <path d="M50 48 L56 52 L56 56 L50 60 L44 56 L44 52 Z" />
    </g>
  ),
  mushroom: (c) => (
    <g>
      <path d="M20 50 C20 28 34 14 50 14 C66 14 80 28 80 50 Z" fill={c.main} stroke={c.dim} strokeWidth="3" />
      <circle cx="38" cy="34" r="5" fill="#fff" opacity=".7" /><circle cx="58" cy="28" r="4" fill="#fff" opacity=".7" />
      <path d="M40 50 C40 70 38 78 36 86 L62 86 C60 78 58 70 58 50" fill="#e8e0c8" stroke={c.dim} strokeWidth="3" />
    </g>
  ),
};

const CARD_ICON = {
  clawSwipe: 'claw', hunker: 'shield', emberBite: 'fang', shellBash: 'shield', venomSpit: 'droplet',
  flameFang: 'fang', cinderSwipe: 'claw', wildfire: 'flame', emberVeil: 'shield', scorch: 'flame',
  twinFangs: 'fang', firestorm: 'flame', blazingSpeed: 'bolt', volcanicRage: 'paw', infernoHowl: 'flame',
  meteorPounce: 'bolt', phoenixPlume: 'heart',
  barkSkin: 'shield', rootGuard: 'leaf', bodyCheck: 'paw', regrowth: 'heart', oakWall: 'shield',
  entrench: 'shield', thornMail: 'web', shelteringCanopy: 'leaf', boulderRoll: 'paw',
  ancientGrowth: 'leaf', deepRoots: 'web', livingFortress: 'shield',
  viperFang: 'fang', corrode: 'droplet', paralyticSting: 'droplet', mendingMoss: 'mushroom',
  shadowCoil: 'swirl', leechFang: 'fang', toxicCloud: 'swirl', plagueSpores: 'mushroom',
  rupture: 'skull', noxiousBloom: 'mushroom', serpentsPatience: 'heart',
  wildInstinct: 'bolt', warHowl: 'paw', vineWhip: 'leaf', crushingBlow: 'paw', adrenaline: 'bolt',
};

export function CardArt({ cardId, archetype }) {
  const c = ARCH_COLORS[archetype] || ARCH_COLORS.neutral;
  const icon = ICONS[CARD_ICON[cardId] || 'paw'];
  return (
    <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', display: 'block' }}>
      <rect x="0" y="0" width="100" height="100" fill={c.dim} opacity=".45" />
      <circle cx="50" cy="50" r="34" fill={c.glow} opacity=".35" />
      {icon(c)}
    </svg>
  );
}

// ---------- Forest backdrop ----------

export function ForestBackdrop() {
  return (
    <svg className="forest-bg" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMax slice">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#070f14" /><stop offset=".45" stopColor="#0b2018" /><stop offset=".8" stopColor="#123424" /><stop offset="1" stopColor="#1a4530" />
        </linearGradient>
        <radialGradient id="moonglow" cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#e8f4cc" stopOpacity=".5" /><stop offset="1" stopColor="#e8f4cc" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="clearing" cx=".5" cy="1" r="1">
          <stop offset="0" stopColor="#2c5a3c" stopOpacity=".55" /><stop offset=".6" stopColor="#16402a" stopOpacity=".25" /><stop offset="1" stopColor="#081710" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="mist" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9ecfae" stopOpacity="0" /><stop offset=".5" stopColor="#9ecfae" stopOpacity=".10" /><stop offset="1" stopColor="#9ecfae" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="1200" height="800" fill="url(#sky)" />
      <circle cx="960" cy="120" r="150" fill="url(#moonglow)" />
      <circle cx="960" cy="120" r="48" fill="#e9f2d2" opacity=".85" />
      <circle cx="946" cy="108" r="9" fill="#c9d8ae" opacity=".5" />
      <circle cx="975" cy="135" r="6" fill="#c9d8ae" opacity=".4" />
      {/* far tree line */}
      <g fill="#091a12" opacity=".9">
        {[40, 190, 330, 470, 640, 790, 930, 1080].map((x, i) => (
          <path key={i} d={`M${x} 800 L${x} ${300 + (i % 3) * 60} L${x - 60} ${410 + (i % 3) * 50} L${x - 24} ${400 + (i % 3) * 50} L${x - 80} ${550} L${x - 30} ${540} L${x - 70} 690 L${x + 70} 690 L${x + 30} 540 L${x + 80} 550 L${x + 24} ${400 + (i % 3) * 50} L${x + 60} ${410 + (i % 3) * 50} Z`} />
        ))}
      </g>
      {/* near trees framing the arena */}
      <g fill="#0a2014" opacity=".95">
        {[70, 1130].map((x, i) => (
          <path key={i} d={`M${x} 800 L${x} ${380} L${x - 110} ${560} L${x - 40} ${545} L${x - 130} 800 Z M${x} ${380} L${x + 110} ${560} L${x + 40} ${545} L${x + 130} 800 Z`} />
        ))}
        {[330, 880].map((x, i) => (
          <path key={i} d={`M${x} 800 L${x} ${500} L${x - 90} ${650} L${x - 30} ${635} L${x - 100} 800 Z M${x} ${500} L${x + 90} ${650} L${x + 30} ${635} L${x + 100} 800 Z`} />
        ))}
      </g>
      {/* moonlit clearing on the arena floor */}
      <ellipse cx="600" cy="800" rx="640" ry="320" fill="url(#clearing)" />
      <rect x="0" y="560" width="1200" height="120" fill="url(#mist)" className="mist-band" />
      <rect x="-300" y="620" width="1200" height="90" fill="url(#mist)" className="mist-band slow" />
      {/* fireflies */}
      <g fill="#e8f4cc">
        {[150, 320, 520, 680, 860, 1040, 240, 760].map((x, i) => (
          <circle key={i} cx={x} cy={220 + ((i * 137) % 320)} r={1.6 + (i % 2)} className={`firefly f${i % 4}`} />
        ))}
      </g>
    </svg>
  );
}
