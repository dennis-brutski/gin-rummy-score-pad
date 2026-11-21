// sheet.jsx — bottom-sheet shell shared by every sheet

import React from 'react';
import { useT } from './i18n.js';
import { BrassRule } from './ui.jsx';

const { useEffect } = React;

// ────────────────────────────────────────────────────────────────
// Bottom-sheet shell
// ────────────────────────────────────────────────────────────────
function Sheet({ children, onClose, title, step, totalSteps, closeLabel }) {
  const { t } = useT();
  // Prevent background scroll while sheet is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);
  return (
    <div className="fade" style={{
      position: 'absolute', inset: 0, zIndex: 50,
      display: 'flex', alignItems: 'flex-end',
      background: 'rgba(0,0,0,0.5)',
      backdropFilter: 'blur(2px)',
    }}
      onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} style={{
        width: '100%',
        background:
          'radial-gradient(ellipse at 30% 0%, var(--felt-light) 0%, transparent 60%), var(--felt-mid)',
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        boxShadow: '0 -20px 60px rgba(0,0,0,0.5), 0 -1px 0 rgba(255,255,255,0.06) inset',
        paddingBottom: 28,
        maxHeight: '92%',
        display: 'flex', flexDirection: 'column',
        position: 'relative',
      }}>
        {/* grabber */}
        <div style={{
          width: 44, height: 4, borderRadius: 999,
          background: 'rgba(255,255,255,0.18)',
          margin: '10px auto 6px',
        }} />
        {/* header */}
        <div style={{
          padding: '8px 22px 14px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <button className="btn-ghost press" onClick={onClose}>{closeLabel ?? t('cancel')}</button>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div className="display" style={{
              fontSize: 18, color: 'var(--parchment)', lineHeight: 1,
            }}>{title}</div>
            {step != null && (
              <div className="eyebrow" style={{
                color: 'rgba(255,255,255,0.4)', marginTop: 4, fontSize: 9,
              }}>{t('stepN', step, totalSteps)}</div>
            )}
          </div>
          <div style={{ width: 60 }} />
        </div>
        <BrassRule style={{ margin: '0 22px 18px' }} />
        <div style={{ padding: '0 22px', overflow: 'auto', flex: 1 }}>{children}</div>
      </div>
    </div>
  );
}

export { Sheet };
