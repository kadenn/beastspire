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

// A hand-built painted forest clearing at dusk: layered tree masses fading into
// fog for depth, a moonlit ground plane the beasts stand on, god-rays through
// the canopy, framing foreground trunks, drifting mist and fireflies. All one
// SVG so it scales crisply and themes from CSS-free literal colors.

// soft rounded tree-mass silhouette (a clump of canopy on a trunk)
function treeMass(x, baseY, h, w, fill, key) {
  const top = baseY - h;
  return (
    <g key={key} fill={fill}>
      <path d={`M${x - w} ${baseY}
        C ${x - w} ${top + h * 0.45}, ${x - w * 0.6} ${top}, ${x} ${top}
        C ${x + w * 0.6} ${top}, ${x + w} ${top + h * 0.45}, ${x + w} ${baseY} Z`} />
      <rect x={x - w * 0.12} y={baseY - h * 0.25} width={w * 0.24} height={h * 0.3} />
    </g>
  );
}

// tall conifer for the framing foreground
function conifer(x, baseY, h, w, fill, key) {
  const tiers = [];
  for (let i = 0; i < 4; i++) {
    const ty = baseY - (h * (0.18 + i * 0.2));
    const tw = w * (1 - i * 0.18);
    const th = h * 0.34;
    tiers.push(`M${x - tw} ${ty} L${x} ${ty - th} L${x + tw} ${ty} Z`);
  }
  return (
    <g key={key} fill={fill}>
      <rect x={x - w * 0.06} y={baseY - h * 0.15} width={w * 0.12} height={h * 0.2} />
      <path d={tiers.join(' ')} />
    </g>
  );
}

export function ForestBackdrop() {
  return (
    <svg className="forest-bg" viewBox="0 0 1280 800" preserveAspectRatio="xMidYMax slice">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0a141c" /><stop offset=".38" stopColor="#10241f" />
          <stop offset=".7" stopColor="#163322" /><stop offset="1" stopColor="#0c2417" />
        </linearGradient>
        <radialGradient id="skyglow" cx=".74" cy=".16" r=".7">
          <stop offset="0" stopColor="#2a4a44" stopOpacity=".75" /><stop offset="1" stopColor="#2a4a44" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="moonglow" cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#eef6d6" stopOpacity=".6" /><stop offset=".5" stopColor="#cfe0b0" stopOpacity=".22" /><stop offset="1" stopColor="#cfe0b0" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1c3a26" /><stop offset=".5" stopColor="#13301f" /><stop offset="1" stopColor="#0a1d12" />
        </linearGradient>
        <radialGradient id="clearing" cx=".5" cy=".15" r=".9">
          <stop offset="0" stopColor="#3f7a52" stopOpacity=".55" /><stop offset=".55" stopColor="#234a30" stopOpacity=".25" /><stop offset="1" stopColor="#0a1d12" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ray" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#dff0c0" stopOpacity=".22" /><stop offset="1" stopColor="#dff0c0" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="mist" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a8d2b8" stopOpacity="0" /><stop offset=".5" stopColor="#a8d2b8" stopOpacity=".12" /><stop offset="1" stopColor="#a8d2b8" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="vignette" cx=".5" cy=".46" r=".75">
          <stop offset=".55" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".55" />
        </radialGradient>
        <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" /><feColorMatrix type="saturate" values="0" /></filter>
        <filter id="soft"><feGaussianBlur stdDeviation="6" /></filter>
      </defs>

      {/* sky */}
      <rect width="1280" height="800" fill="url(#sky)" />
      <rect width="1280" height="800" fill="url(#skyglow)" />

      {/* moon */}
      <circle cx="950" cy="135" r="170" fill="url(#moonglow)" className="moon-glow" />
      <circle cx="950" cy="135" r="52" fill="#eef6d6" opacity=".9" />
      <circle cx="934" cy="122" r="10" fill="#c4d4a4" opacity=".45" />
      <circle cx="966" cy="150" r="7" fill="#c4d4a4" opacity=".4" />
      <circle cx="958" cy="118" r="5" fill="#c4d4a4" opacity=".35" />

      {/* stars / dust */}
      <g fill="#dfeccb">
        {[120, 260, 420, 560, 1120, 1200, 360, 700, 1040].map((x, i) => (
          <circle key={i} cx={x} cy={40 + ((i * 71) % 160)} r={0.8 + (i % 2) * 0.6} opacity={0.25 + (i % 3) * 0.12} />
        ))}
      </g>

      {/* god rays slanting from the canopy */}
      <g className="god-rays">
        {[
          'M820 -40 L1020 -40 L1280 620 L1080 620 Z',
          'M620 -40 L720 -40 L880 560 L760 560 Z',
          'M980 -40 L1060 -40 L1260 480 L1160 480 Z',
        ].map((d, i) => <path key={i} d={d} fill="url(#ray)" />)}
      </g>

      {/* layer 1 — farthest ridge, heavily fogged (light = far) */}
      <g opacity=".5" filter="url(#soft)">
        {[60, 200, 340, 480, 620, 760, 900, 1040, 1180, 1260].map((x, i) =>
          treeMass(x, 470, 150 + (i % 3) * 40, 95, '#274736', `f1-${i}`))}
      </g>
      {/* layer 2 — mid trees */}
      <g opacity=".82">
        {[30, 170, 300, 440, 600, 740, 880, 1010, 1150, 1270].map((x, i) =>
          treeMass(x, 530, 190 + (i % 4) * 45, 110, '#16321f', `f2-${i}`))}
      </g>
      {/* layer 3 — near tree line */}
      <g>
        {[-20, 130, 270, 520, 700, 980, 1120, 1300].map((x, i) =>
          treeMass(x, 600, 230 + (i % 3) * 55, 130, '#0d2114', `f3-${i}`))}
      </g>

      {/* ground plane the beasts stand on */}
      <path d="M0 560 Q640 500 1280 560 L1280 800 L0 800 Z" fill="url(#ground)" />
      <ellipse cx="640" cy="640" rx="720" ry="240" fill="url(#clearing)" />
      {/* a few ground rocks / tufts for grounding */}
      <g fill="#0a1d12" opacity=".7">
        <ellipse cx="180" cy="720" rx="60" ry="16" /><ellipse cx="1080" cy="710" rx="70" ry="18" />
        <ellipse cx="640" cy="770" rx="120" ry="22" />
      </g>

      {/* drifting mist over the floor */}
      <rect x="-200" y="560" width="1680" height="120" fill="url(#mist)" className="mist-band" />
      <rect x="-400" y="630" width="1680" height="100" fill="url(#mist)" className="mist-band slow" />

      {/* foreground framing conifers (darkest, closest) */}
      <g>
        {conifer(40, 820, 560, 150, '#061309', 'fg-l')}
        {conifer(1240, 820, 600, 165, '#061309', 'fg-r')}
        {conifer(150, 850, 360, 110, '#081710', 'fg-l2')}
        {conifer(1140, 850, 380, 115, '#081710', 'fg-r2')}
      </g>

      {/* fireflies */}
      <g fill="#eef6d6">
        {[210, 380, 560, 720, 900, 1080, 300, 820, 1180].map((x, i) => (
          <circle key={i} cx={x} cy={300 + ((i * 137) % 300)} r={1.6 + (i % 2)} className={`firefly f${i % 4}`} />
        ))}
      </g>

      {/* paper-grain + vignette to bind the layers into a painted look */}
      <rect width="1280" height="800" filter="url(#grain)" opacity=".05" />
      <rect width="1280" height="800" fill="url(#vignette)" />
    </svg>
  );
}
