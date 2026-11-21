// score-sheet.jsx — Score-a-hand bottom sheet

import React from 'react';
import { useT } from './i18n.js';
import { haptic } from './ui.jsx';
import { DEFAULT_RULES } from './state.js';
import { Sheet } from './sheet.jsx';
import { KnockHint } from './knock-hint.jsx';

const { useState: useSS } = React;

// ────────────────────────────────────────────────────────────────
// ScoreSheet — guided 3-step flow:
//   1) WHO won the hand?
//   2) HOW? (knock / gin / undercut)
//   3) Enter deadwood difference, see computed result, confirm
// ────────────────────────────────────────────────────────────────
function ScoreSheet({ players, deal, rules, onClose, onConfirm }) {
  const { t } = useT();
  const r = { ...DEFAULT_RULES, ...(rules || {}) };
  const [step, setStep] = useSS(1);
  const [winner, setWinner] = useSS(null);
  const [type, setType] = useSS(null);
  const [points, setPoints] = useSS(0);

  const titles = {
    1: t('whoWon'),
    2: t('howWon'),
    3: t('enterPoints'),
  };

  const back = () => {
    haptic(4);
    if (step === 1) { onClose(); return; }
    setStep(step - 1);
  };

  return (
    <Sheet title={titles[step]} step={step} totalSteps={3} onClose={onClose}>
      {/* step 1 — winner */}
      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 14 }}>
          <Hint>{t('tapWinnerHint')}</Hint>
          <WinnerCard name={players[0]} suit="♠" color="var(--ink)" badge="I"
            onPick={() => { haptic(8); setWinner(0); setStep(2); }} />
          <WinnerCard name={players[1]} suit="♥" color="var(--claret)" badge="II"
            onPick={() => { haptic(8); setWinner(1); setStep(2); }} />
        </div>
      )}

      {/* step 2 — outcome type */}
      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 14 }}>
          <Hint>{t('howDidWinHint', players[winner])}</Hint>
          <OutcomeCard
            label={t('knock')}
            blurb={t('knockBlurb')}
            ornament="♣"
            onPick={() => { haptic(8); setType('knock'); setStep(3); }} />
          <OutcomeCard
            label={t('gin')}
            blurb={t('ginBlurb', r.ginBonus)}
            ornament="♠"
            highlight
            onPick={() => { haptic(8); setType('gin'); setStep(3); }} />
          <OutcomeCard
            label={t('longGin')}
            blurb={t('longGinBlurb', r.longGinBonus)}
            ornament="♣"
            highlight
            onPick={() => { haptic(8); setType('longGin'); setStep(3); }} />
          <OutcomeCard
            label={t('undercut')}
            blurb={t('undercutBlurb', r.undercutBonus)}
            ornament="♦"
            ornamentColor="var(--claret-soft)"
            onPick={() => { haptic(8); setType('undercut'); setStep(3); }} />
          <button className="btn-ghost press" onClick={back} style={{ marginTop: 4 }}>{t('back')}</button>
        </div>
      )}

      {/* step 3 — points entry */}
      {step === 3 && (
        <PointEntry
          winnerName={players[winner]}
          type={type}
          points={points}
          setPoints={setPoints}
          rules={r}
          onBack={back}
          onConfirm={() => {
            haptic(14);
            onConfirm({ type, winner, points, deal });
          }} />
      )}
    </Sheet>
  );
}

function Hint({ children }) {
  return (
    <div style={{
      textAlign: 'center', color: 'rgba(255,255,255,0.55)',
      fontSize: 13, lineHeight: 1.5, marginTop: -2, marginBottom: 4,
      fontFamily: 'var(--serif)', fontStyle: 'italic',
    }}>{children}</div>
  );
}

// ── Cards in step 1
function WinnerCard({ name, suit, color, badge, onPick }) {
  return (
    <button className="press parchment" onClick={onPick} style={{
      display: 'flex', alignItems: 'center', gap: 16,
      padding: '18px 18px', border: 'none', textAlign: 'left',
      cursor: 'pointer',
    }}>
      <div style={{
        width: 50, height: 70, borderRadius: 4,
        background: 'oklch(0.99 0.01 80)',
        border: '1px solid rgba(0,0,0,0.12)',
        boxShadow: 'inset 0 0 0 2px oklch(0.99 0.01 80), inset 0 0 0 3px rgba(0,0,0,0.06)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <div style={{ fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 15, color }}>{badge}</div>
        <div style={{ fontSize: 28, lineHeight: 1, color, marginTop: 4 }}>{suit}</div>
      </div>
      <div style={{ flex: 1 }}>
        <div className="eyebrow" style={{ color: 'var(--ink-faint)', fontSize: 9.5 }}>Winner</div>
        <div className="display" style={{
          fontSize: 26, color: 'var(--ink)', marginTop: 2,
          letterSpacing: '0.005em',
        }}>{name}</div>
      </div>
      <div style={{ color: 'var(--brass-deep)', fontSize: 20 }}>›</div>
    </button>
  );
}

// ── Cards in step 2
function OutcomeCard({ label, blurb, ornament, ornamentColor = 'var(--brass)', highlight, onPick }) {
  return (
    <button className="press" onClick={onPick} style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '14px 16px',
      background: highlight
        ? 'linear-gradient(180deg, oklch(0.40 0.05 90 / 0.8), oklch(0.32 0.04 80 / 0.8))'
        : 'rgba(255,255,255,0.04)',
      border: highlight
        ? '1px solid var(--brass)'
        : '1px solid rgba(255,255,255,0.10)',
      borderRadius: 10,
      textAlign: 'left', cursor: 'pointer',
      boxShadow: highlight ? '0 0 18px rgba(212,170,80,0.12)' : 'none',
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.25)',
        border: '1px solid rgba(255,255,255,0.08)',
        fontSize: 20, color: ornamentColor,
        flexShrink: 0,
      }}>{ornament}</div>
      <div style={{ flex: 1 }}>
        <div className="display" style={{
          fontSize: 22, color: 'var(--parchment)', lineHeight: 1,
          letterSpacing: '0.005em',
        }}>{label}</div>
        <div style={{
          fontSize: 11.5, color: 'rgba(255,255,255,0.5)',
          marginTop: 4, lineHeight: 1.4, fontFamily: 'var(--sans)',
        }}>{blurb}</div>
      </div>
      <div style={{ color: 'var(--brass)', fontSize: 20 }}>›</div>
    </button>
  );
}

// ────────────────────────────────────────────────────────────────
// Point entry — gin has fixed prompt; knock/undercut take a number
// ────────────────────────────────────────────────────────────────
function PointEntry({ winnerName, type, points, setPoints, rules, onBack, onConfirm }) {
  const { t } = useT();
  const r = { ...DEFAULT_RULES, ...(rules || {}) };
  const prompts = {
    knock:    t('promptKnock'),
    gin:      t('promptGin'),
    longGin:  t('promptGin'),
    undercut: t('promptUndercut'),
  };
  const bonus = type === 'gin' ? r.ginBonus
              : type === 'longGin' ? r.longGinBonus
              : type === 'undercut' ? r.undercutBonus : 0;
  const total = points + bonus;
  // valid only when there's a number entered (or gin with 0 is acceptable)
  const valid = points >= 0 && points <= 98 && (type === 'gin' || points > 0);
  const max = 98;

  const onKey = (k) => {
    haptic(3);
    if (k === '⌫') { setPoints(Math.floor(points / 10)); return; }
    if (k === 'C') { setPoints(0); return; }
    const n = Number(k);
    const next = points * 10 + n;
    if (next <= max) setPoints(next);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 10 }}>
      <Hint>{prompts[type]}</Hint>

      {/* big number display */}
      <div style={{
        margin: '6px auto 4px',
        width: '100%',
        padding: '18px 20px',
        borderRadius: 12,
        background:
          'linear-gradient(180deg, rgba(0,0,0,0.22), rgba(0,0,0,0.32))',
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
        display: 'flex', alignItems: 'baseline', justifyContent: 'center',
        gap: 12, position: 'relative',
      }}>
        <div className="num" style={{
          fontSize: 88, lineHeight: 0.95, color: 'var(--parchment)',
          fontVariantNumeric: 'tabular-nums lining-nums',
          textShadow: '0 1px 0 rgba(0,0,0,0.5)',
        }}>{points}</div>
        {bonus > 0 && (
          <div style={{
            position: 'absolute', right: 20, top: 18,
            display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4,
          }}>
            <div className="eyebrow" style={{ color: 'var(--brass)' }}>{t('bonus')}</div>
            <div className="num" style={{ fontSize: 22, color: 'var(--brass)' }}>+{bonus}</div>
          </div>
        )}
      </div>

      {/* total preview */}
      <div style={{
        textAlign: 'center', marginTop: -2,
      }}>
        <span className="smallcaps" style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14 }}>
          {(() => {
            const raw = t('earnsPts', winnerName, total);
            if (Array.isArray(raw)) {
              return <>{raw[0]}{raw[1]}<span style={{ color: 'var(--brass)' }} className="num">{raw[2]}</span>{raw[3]}</>;
            }
            return raw;
          })()}
        </span>
      </div>

      {/* numeric keypad */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 8, marginTop: 10,
      }}>
        {['1','2','3','4','5','6','7','8','9','C','0','⌫'].map((k) => (
          <Key key={k} k={k} onPress={onKey} />
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button className="btn-ghost press" onClick={onBack} style={{ flex: 1 }}>{t('back')}</button>
        <button className="btn-brass press" onClick={onConfirm} disabled={!valid}
          style={{ flex: 2, padding: '14px 18px', fontSize: 18 }}>
          {t('recordHand')}
        </button>
      </div>

      {type === 'knock' && <KnockHint />}
    </div>
  );
}

function Key({ k, onPress }) {
  const isAction = k === '⌫' || k === 'C';
  return (
    <button onClick={() => onPress(k)} className="press" style={{
      padding: '14px 0',
      borderRadius: 10,
      border: '1px solid rgba(255,255,255,0.08)',
      background: isAction
        ? 'rgba(0,0,0,0.25)'
        : 'linear-gradient(180deg, oklch(0.42 0.04 150) 0%, oklch(0.34 0.04 150) 100%)',
      color: isAction ? 'var(--brass)' : 'var(--parchment)',
      fontFamily: 'var(--serif)',
      fontWeight: 500,
      fontSize: isAction ? 22 : 28,
      boxShadow: '0 1px 0 rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
      cursor: 'pointer',
    }}>{k}</button>
  );
}

export { ScoreSheet, PointEntry, Key };
