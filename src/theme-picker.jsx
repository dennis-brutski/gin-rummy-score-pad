// theme-picker.jsx — Auto / Light / Dark segmented control

import React from 'react';
import { useT } from './i18n.js';
import { haptic } from './ui.jsx';

// ────────────────────────────────────────────────────────────────
// Theme picker — segmented Auto / Light / Dark inside the menu.
// Lives in the menu sheet to match the rest of the brass+felt UI.
// ────────────────────────────────────────────────────────────────
function ThemePicker({ theme, resolvedTheme, onSetTheme }) {
  const { t } = useT();
  const options = [
    { v: 'auto',  l: t('auto'),  d: t('followDevice') },
    { v: 'light', l: t('light'), d: t('dayAtTheTable') },
    { v: 'dark',  l: t('dark'),  d: t('eveningRoom') },
  ];
  return (
    <div style={{ marginTop: 8 }}>
      <div className="eyebrow" style={{
        color: 'rgba(255,255,255,0.45)', textAlign: 'center',
        marginBottom: 8, letterSpacing: '0.16em',
      }}>{t('tableLight')}</div>
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
        gap: 6, padding: 4,
        background: 'rgba(0,0,0,0.22)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 12,
      }}>
        {options.map(({ v, l }) => {
          const on = theme === v;
          return (
            <button
              key={v}
              className="press"
              onClick={() => { haptic(6); onSetTheme(v); }}
              style={{
                appearance: 'none', cursor: 'pointer',
                padding: '10px 0',
                borderRadius: 9,
                border: on ? '1px solid var(--brass)' : '1px solid transparent',
                background: on
                  ? 'radial-gradient(ellipse at 50% 0%, oklch(0.46 0.04 150), oklch(0.36 0.04 150))'
                  : 'transparent',
                color: on ? 'var(--parchment)' : 'rgba(255,255,255,0.55)',
                fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 16,
                letterSpacing: '0.02em',
                boxShadow: on
                  ? 'inset 0 1px 0 rgba(255,255,255,0.06), 0 1px 0 rgba(0,0,0,0.25)'
                  : 'none',
              }}>{l}</button>
          );
        })}
      </div>
      <div style={{
        textAlign: 'center', marginTop: 6,
        fontSize: 10.5, color: 'rgba(255,255,255,0.4)',
        fontFamily: 'var(--serif)', fontStyle: 'italic',
      }}>
        {theme === 'auto'
          ? t('followingDevice', t(resolvedTheme))
          : (options.find((o) => o.v === theme)?.d ?? '')}
      </div>
    </div>
  );
}

export { ThemePicker };
