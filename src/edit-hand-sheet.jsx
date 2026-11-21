// edit-hand-sheet.jsx — editor for an existing ledger row

import React from 'react';
import { useT } from './i18n.js';
import { haptic } from './ui.jsx';
import { DEFAULT_RULES } from './state.js';
import { Sheet } from './sheet.jsx';
import { Key } from './score-sheet.jsx';

const { useState: useSS } = React;

// ────────────────────────────────────────────────────────────────
// EditHandSheet — single-screen editor for an existing ledger row.
//   • Type pills (knock / gin / undercut)
//   • Winner toggle
//   • Points keypad (or fixed 0 for gin if user wants)
//   • Save + Delete buttons
//
// `initial` is the hand entry; `players` is the active game's name pair.
// onSave({ type, winner, points }), onDelete() — caller mutates the store.
// ────────────────────────────────────────────────────────────────
function EditHandSheet({ initial, players, rules, onClose, onSave, onDelete }) {
  const { t } = useT();
  const r = { ...DEFAULT_RULES, ...(rules || {}) };
  const [type, setType]     = useSS(initial.type);
  const [winner, setWinner] = useSS(initial.winner);
  const [points, setPoints] = useSS(initial.points);
  const [confirmDel, setConfirmDel] = useSS(false);

  const bonus = type === 'gin' ? r.ginBonus
              : type === 'longGin' ? r.longGinBonus
              : type === 'undercut' ? r.undercutBonus : 0;
  const total = points + bonus;
  const valid = points >= 0 && points <= 98 && (type === 'gin' || points > 0);

  const onKey = (k) => {
    haptic(3);
    if (k === '⌫') { setPoints(Math.floor(points / 10)); return; }
    if (k === 'C') { setPoints(0); return; }
    const next = points * 10 + Number(k);
    if (next <= 98) setPoints(next);
  };

  return (
    <Sheet title={t('editHandN', initial.deal)} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 18 }}>
        {/* Winner toggle */}
        <div>
          <div className="eyebrow" style={{ color: 'rgba(255,255,255,0.45)', marginBottom: 8 }}>
            {t('winner')}
          </div>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr',
            gap: 6, padding: 4,
            background: 'rgba(0,0,0,0.22)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 12,
          }}>
            {[0, 1].map((i) => {
              const on = winner === i;
              return (
                <button key={i} className="press" onClick={() => { haptic(4); setWinner(i); }} style={{
                  appearance: 'none', cursor: 'pointer',
                  padding: '12px 0', borderRadius: 9,
                  border: on ? '1px solid var(--brass)' : '1px solid transparent',
                  background: on
                    ? 'radial-gradient(ellipse at 50% 0%, oklch(0.46 0.04 150), oklch(0.36 0.04 150))'
                    : 'transparent',
                  color: on ? 'var(--parchment)' : 'rgba(255,255,255,0.55)',
                  fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 18,
                  letterSpacing: '0.01em',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                  <span style={{ fontSize: 14, color: i === 0 ? 'var(--parchment)' : 'var(--claret-soft)' }}>
                    {i === 0 ? '♠' : '♥'}
                  </span>
                  {players[i]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Type pills */}
        <div>
          <div className="eyebrow" style={{ color: 'rgba(255,255,255,0.45)', marginBottom: 8 }}>
            {t('outcome')}
          </div>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr',
            gap: 6, padding: 4,
            background: 'rgba(0,0,0,0.22)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 12,
          }}>
            {[{v:'knock',l:t('knock')},{v:'gin',l:t('gin')},{v:'longGin',l:t('longGin')},{v:'undercut',l:t('undercut')}].map((opt) => {
              const on = type === opt.v;
              return (
                <button key={opt.v} className="press" onClick={() => { haptic(4); setType(opt.v); }} style={{
                  appearance: 'none', cursor: 'pointer',
                  padding: '10px 0', borderRadius: 9,
                  border: on ? '1px solid var(--brass)' : '1px solid transparent',
                  background: on
                    ? 'radial-gradient(ellipse at 50% 0%, oklch(0.46 0.04 150), oklch(0.36 0.04 150))'
                    : 'transparent',
                  color: on ? 'var(--parchment)' : 'rgba(255,255,255,0.55)',
                  fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 15,
                  letterSpacing: '0.02em',
                }}>{opt.l}</button>
              );
            })}
          </div>
        </div>

        {/* Points big display + keypad */}
        <div style={{
          padding: '14px 18px', borderRadius: 12,
          background: 'linear-gradient(180deg, rgba(0,0,0,0.22), rgba(0,0,0,0.32))',
          border: '1px solid rgba(255,255,255,0.06)',
          position: 'relative',
        }}>
          <div className="eyebrow" style={{
            color: 'rgba(255,255,255,0.45)', marginBottom: 2,
          }}>{t('points')}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <div className="num" style={{
              fontSize: 56, lineHeight: 1, color: 'var(--parchment)',
              fontVariantNumeric: 'tabular-nums lining-nums',
            }}>{points}</div>
            {bonus > 0 && (
              <div className="num" style={{
                fontSize: 18, color: 'var(--brass)', fontStyle: 'italic',
              }}>+{bonus}</div>
            )}
            <div style={{ flex: 1 }} />
            <div style={{ textAlign: 'right' }}>
              <div className="eyebrow" style={{ color: 'var(--brass)' }}>{t('total')}</div>
              <div className="num" style={{ fontSize: 22, color: 'var(--brass)' }}>{total}</div>
            </div>
          </div>
          {type === 'knock' && (
            <div style={{
              fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 8,
              fontFamily: 'var(--serif)', fontStyle: 'italic',
            }}>{t('knockHintShort')}</div>
          )}
        </div>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 8,
        }}>
          {['1','2','3','4','5','6','7','8','9','C','0','⌫'].map((k) => (
            <Key key={k} k={k} onPress={onKey} />
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="press"
            onClick={() => {
              if (confirmDel) onDelete();
              else { setConfirmDel(true); setTimeout(() => setConfirmDel(false), 2400); }
            }}
            style={{
              appearance: 'none', flex: 1, padding: '14px 12px',
              border: '1px solid ' + (confirmDel ? 'var(--claret)' : 'rgba(255,255,255,0.18)'),
              background: confirmDel ? 'var(--claret)' : 'transparent',
              color: confirmDel ? 'var(--parchment)' : 'var(--claret-soft)',
              borderRadius: 999, fontFamily: 'var(--sans)', fontWeight: 600,
              fontSize: 13, letterSpacing: '0.06em',
              cursor: 'pointer',
            }}>{confirmDel ? t('tapAgainToDelete') : t('deleteHand')}</button>
          <button
            className="btn-brass press"
            disabled={!valid}
            onClick={() => { haptic(10); onSave({ type, winner, points }); }}
            style={{ flex: 2, padding: '14px 18px', fontSize: 18 }}
          >{t('saveChanges')}</button>
        </div>
      </div>
    </Sheet>
  );
}

export { EditHandSheet };
