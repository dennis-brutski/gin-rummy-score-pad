// ui.jsx — shared UI atoms scoped under .gr (vintage card-table)

import React from 'react';

function BrassRule({ style }) {
  return (
    <div className="brass-rule" style={style}>
      <div className="line" />
      <div className="mark" />
      <div className="line" />
    </div>
  );
}

function Suit({ symbol, color = 'var(--brass)', size = 14, style }) {
  return <span className="suit" style={{ color, fontSize: size, ...style }}>{symbol}</span>;
}

// Haptic-style "tick" — visual flourish + (optional) navigator.vibrate
function haptic(ms = 8) {
  try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {}
}

// Brass crest used in headers — small monogram with diamond ornament
function Crest({ children, style }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 10,
      ...style,
    }}>
      <Suit symbol="♠" />
      <span className="smallcaps" style={{
        color: 'var(--brass)', fontSize: 14, letterSpacing: '0.12em',
      }}>{children}</span>
      <Suit symbol="♣" />
    </div>
  );
}

// Pip used as a decorative tally
function Pip({ filled }) {
  return (
    <span style={{
      display: 'inline-block', width: 6, height: 6, borderRadius: 999,
      background: filled ? 'var(--brass)' : 'transparent',
      border: '1px solid var(--brass-deep)',
      margin: '0 2px',
    }} />
  );
}

export { BrassRule, Suit, Crest, Pip, haptic };
