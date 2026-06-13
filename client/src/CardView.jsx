import React from 'react';
import { CardArt, ARCH_COLORS, RARITY_COLORS } from './art.jsx';

const TYPE_LABEL = { attack: 'Attack', skill: 'Skill', power: 'Power' };

export function CardView({ card, size = 'hand', selected, disabled, onClick, draggable, onDragStart, style, badge }) {
  if (!card) return null;
  const colors = ARCH_COLORS[card.archetype] || ARCH_COLORS.neutral;
  const rarity = RARITY_COLORS[card.rarity] || RARITY_COLORS.common;
  return (
    <div
      className={`card sz-${size} type-${card.type} ${selected ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
      style={{ '--arch': colors.main, '--arch-dim': colors.dim, '--arch-glow': colors.glow, '--rarity': rarity, ...style }}
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
    >
      <div className="card-cost">{card.cost}</div>
      {badge != null && <div className="card-badge">{badge}</div>}
      <div className="card-name">{card.name}</div>
      <div className="card-art"><CardArt cardId={card.id} archetype={card.archetype} /></div>
      <div className="card-type">{TYPE_LABEL[card.type]}{card.exhaust ? ' · Exhaust' : ''}</div>
      <div className="card-text">{card.text}</div>
    </div>
  );
}
