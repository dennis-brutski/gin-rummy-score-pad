// screens-sheet.jsx — Score-a-hand bottom sheet + Menu sheet

import React from 'react';
import { useT, LANGUAGES } from './i18n.js';
import { BrassRule, haptic } from './ui.jsx';
import { DEFAULT_RULES } from './state.js';

const { useState: useSS, useEffect: useESS } = React;

// ────────────────────────────────────────────────────────────────
// Bottom-sheet shell
// ────────────────────────────────────────────────────────────────
function Sheet({ children, onClose, title, step, totalSteps, closeLabel }) {
  const { t } = useT();
  // Prevent background scroll while sheet is open
  useESS(() => {
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
            blurb={t('ginBlurb')}
            ornament="♠"
            highlight
            onPick={() => { haptic(8); setType('gin'); setStep(3); }} />
          <OutcomeCard
            label={t('longGin')}
            blurb={t('longGinBlurb')}
            ornament="♣"
            highlight
            onPick={() => { haptic(8); setType('longGin'); setStep(3); }} />
          <OutcomeCard
            label={t('undercut')}
            blurb={t('undercutBlurb')}
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

// ────────────────────────────────────────────────────────────────
// Knock helper — tiny one-line hint shown under the points display
// when the type is 'knock'. Reminds players of the deadwood-≤-10 rule.
// ────────────────────────────────────────────────────────────────
function KnockHint() {
  const { t } = useT();
  return (
    <div style={{
      textAlign: 'center', marginTop: 4,
      fontSize: 11, color: 'rgba(255,255,255,0.45)',
      fontFamily: 'var(--serif)', fontStyle: 'italic',
    }}>
      {t('knockHint')}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Menu sheet — game-level actions
// ────────────────────────────────────────────────────────────────
function MenuSheet({
  onClose, onExit, onStats, onExport, onImport,
  rules, onSetRules, lockTarget,
  theme, resolvedTheme, onSetTheme,
}) {
  const { t } = useT();
  return (
    <Sheet title={t('menuTitle')} onClose={onClose} closeLabel={t('done')}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 14 }}>
        <MenuRow label={t('continueGame')} sub={t('closeThisMenu')} onClick={onClose} ornament="♣" />
        <MenuRow label={t('backToGames')} sub={t('autoSavedSub')}
          onClick={onExit} ornament="♠" />
        <MenuRow label={t('statsTitle')} sub={t('statsSub')}
          onClick={onStats} ornament="♦" />

        <MenuDivider />
        {rules && onSetRules && (
          <RulesEditor rules={rules} onSet={onSetRules} lockTarget={lockTarget} />
        )}

        <MenuDivider />
        <MenuRow label={t('downloadBackup')} sub={t('downloadBackupSub')}
          onClick={onExport} ornament="↓" />
        <MenuRow label={t('restoreBackup')} sub={t('restoreBackupSub')}
          onClick={onImport} ornament="↑" />

        <MenuDivider />
        <ThemePicker theme={theme} resolvedTheme={resolvedTheme} onSetTheme={onSetTheme} />

        <MenuDivider />
        <LanguagePicker />

        <div style={{ height: 4 }} />
      </div>
    </Sheet>
  );
}

function MenuRow({ label, sub, onClick, ornament, danger }) {
  return (
    <button className="press" onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '14px 16px',
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.10)',
      borderRadius: 10,
      textAlign: 'left', cursor: 'pointer',
    }}>
      <div style={{
        width: 34, height: 34, borderRadius: 999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.25)',
        border: '1px solid rgba(255,255,255,0.08)',
        fontSize: 18, color: danger ? 'var(--claret-soft)' : 'var(--brass)',
      }}>{ornament}</div>
      <div style={{ flex: 1 }}>
        <div style={{
          fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--parchment)',
          lineHeight: 1.1,
        }}>{label}</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 3 }}>{sub}</div>
      </div>
      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 18 }}>›</div>
    </button>
  );
}

export { Sheet, ScoreSheet, MenuSheet, MenuRow, PointEntry, EditHandSheet, MenuDivider, KnockHint };

// ────────────────────────────────────────────────────────────────
// MenuDivider — thin brass-tinted hairline used inside the menu sheet
// to group related actions (game / data / appearance / scoring).
// ────────────────────────────────────────────────────────────────
function MenuDivider() {
  return (
    <div style={{
      height: 1, margin: '6px 4px',
      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.10), transparent)',
    }} />
  );
}

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

export { ThemePicker, LanguagePicker, RulesEditor, Stepper };

// ─────────────────────────────────────────────────────────────────────────
// Stepper — small ± stepper with a tabular numeric value in the middle.
// Used in RulesEditor to keep bonus values mobile-friendly without an
// on-screen keyboard. Holds bounds; clamps on out-of-range.
// ─────────────────────────────────────────────────────────────────────────
function Stepper({ value, min, max, step, onChange, modified, disabled }) {
  const dec = () => {
    if (disabled) return;
    haptic(3);
    const v = Math.max(min, value - step);
    if (v !== value) onChange(v);
  };
  const inc = () => {
    if (disabled) return;
    haptic(3);
    const v = Math.min(max, value + step);
    if (v !== value) onChange(v);
  };
  const btnStyle = (disabled) => ({
    appearance: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
    border: 'none', background: 'transparent',
    width: 36, height: 36, borderRadius: 999,
    color: disabled ? 'rgba(255,255,255,0.25)' : 'var(--brass)',
    fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 600,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    lineHeight: 1,
  });
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center',
      background: modified ? 'oklch(0.40 0.05 90 / 0.45)' : 'rgba(0,0,0,0.18)',
      border: `1px solid ${modified ? 'var(--brass)' : 'rgba(255,255,255,0.06)'}`,
      borderRadius: 999,
      padding: 2,
      transition: 'background 160ms ease, border-color 160ms ease',
    }}>
      <button className="press" onClick={dec} disabled={disabled || value <= min} aria-label="-"
              style={btnStyle(disabled || value <= min)}>−</button>
      <span className="num" style={{
        minWidth: 44, textAlign: 'center',
        color: modified ? 'var(--brass)' : 'var(--parchment)',
        fontSize: 17,
        fontFamily: 'var(--serif)', fontWeight: modified ? 600 : 500,
      }}>{value}</span>
      <button className="press" onClick={inc} disabled={disabled || value >= max} aria-label="+"
              style={btnStyle(disabled || value >= max)}>+</button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// RulesEditor — five rows of (label, stepper) for the scoring bonuses.
// Each call uses bounds appropriate for that field; values are restricted
// to multiples of `step` so the user can't end up with awkward 27-point
// bonuses. A "Reset to defaults" link below restores the standard ruleset.
// ─────────────────────────────────────────────────────────────────────────
function RulesEditor({ rules, onSet, lockTarget }) {
  const { t } = useT();
  const r = { ...DEFAULT_RULES, ...rules };
  const set = (k, v) => onSet({ ...r, [k]: v });
  const resetOne = (k) => { haptic(6); set(k, DEFAULT_RULES[k]); };
  const reset = () => {
    haptic(8);
    onSet({ ...DEFAULT_RULES, ...(lockTarget ? { target: r.target } : {}) });
  };
  const fields = [
    { key: 'target',        label: t('targetScore'),        min: 50, max: 500, step: 25 },
    { key: 'ginBonus',      label: t('ginBonusLabel'),       min:  0, max: 100, step:  5 },
    { key: 'longGinBonus',  label: t('longGinBonusLabel'),   min:  0, max: 100, step:  5 },
    { key: 'undercutBonus', label: t('undercutBonusLabel'),  min:  0, max: 100, step:  5 },
    { key: 'boxBonus',      label: t('boxBonusLabel'),       min:  0, max:  50, step:  5 },
    { key: 'gameBonus',     label: t('gameBonusLabel'),      min:  0, max: 250, step: 25 },
    { key: 'shutoutBonus',  label: t('shutoutBonusLabel'),   min:  0, max: 300, step: 25 },
  ];
  const changedCount = fields.filter((f) => r[f.key] !== DEFAULT_RULES[f.key]).length;
  const dirty = changedCount > 0;
  return (
    <div style={{ marginTop: 8 }}>
      {/* Section header — shows a "Customised · N" badge when any field
          differs from defaults so the user immediately sees that the
          ruleset is non-standard. */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 8, marginBottom: 10,
      }}>
        <div className="eyebrow" style={{
          color: 'rgba(255,255,255,0.45)',
          letterSpacing: '0.16em',
        }}>{t('scoringRules')}</div>
        {dirty && (
          <span style={{
            fontSize: 9, padding: '2px 8px', borderRadius: 999,
            background: 'oklch(0.40 0.05 90 / 0.6)',
            border: '1px solid var(--brass-deep)',
            color: 'var(--brass)',
            fontFamily: 'var(--sans)', fontWeight: 600,
            letterSpacing: '0.12em', textTransform: 'uppercase',
          }}>{t('customised', changedCount)}</span>
        )}
      </div>

      <div style={{
        display: 'flex', flexDirection: 'column', gap: 0,
        background: 'rgba(0,0,0,0.10)',
        border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: 12, padding: '4px 12px',
      }}>
        {fields.map((f, i) => {
          const def = DEFAULT_RULES[f.key];
          const modified = r[f.key] !== def;
          const locked = f.key === 'target' && !!lockTarget;
          return (
            <div key={f.key} data-testid={'rule-' + f.key} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 0',
              borderBottom: i < fields.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
              gap: 8,
            }}>
              {/* Label + default echo when modified */}
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    fontFamily: 'var(--serif)', fontSize: 15,
                    color: modified ? 'var(--brass)' : 'var(--parchment)',
                    fontWeight: modified ? 600 : 500,
                  }}>{f.label}</span>
                  {modified && (
                    <span title={t('modified')} style={{
                      width: 6, height: 6, borderRadius: 999,
                      background: 'var(--brass)',
                      flexShrink: 0,
                    }} />
                  )}
                </div>
                {modified && !locked && (
                  <button
                    onClick={() => resetOne(f.key)}
                    className="press"
                    style={{
                      appearance: 'none', border: 'none', background: 'transparent',
                      color: 'rgba(255,255,255,0.45)',
                      fontFamily: 'var(--sans)', fontSize: 10.5,
                      fontStyle: 'italic',
                      padding: 0, marginTop: 2,
                      cursor: 'pointer',
                      textAlign: 'left',
                      letterSpacing: '0.02em',
                    }}>
                    {t('defaultWas', def)} · {t('reset')}
                  </button>
                )}
                {locked && (
                  <div style={{
                    fontFamily: 'var(--sans)', fontSize: 10.5, fontStyle: 'italic',
                    color: 'rgba(255,255,255,0.45)', marginTop: 2,
                  }}>{t('targetLocked')}</div>
                )}
              </div>
              <Stepper
                value={r[f.key]} min={f.min} max={f.max} step={f.step}
                modified={modified}
                disabled={locked}
                onChange={(v) => set(f.key, v)} />
            </div>
          );
        })}
      </div>
      <button
        className="press"
        onClick={reset}
        disabled={!dirty}
        style={{
          marginTop: 8, width: '100%',
          appearance: 'none', cursor: dirty ? 'pointer' : 'not-allowed',
          background: 'transparent', border: 'none',
          color: dirty ? 'var(--brass)' : 'rgba(255,255,255,0.25)',
          fontFamily: 'var(--sans)', fontWeight: 500, fontSize: 12,
          letterSpacing: '0.06em',
          padding: '6px 0',
        }}>{t('resetToDefaults')}</button>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// LanguagePicker — grid of native language names. "Auto" sits as a wide
// row on top; below, a 2×N grid of language buttons. Native rendering so
// users see their language in their own script.
// ────────────────────────────────────────────────────────────────
function LanguagePicker() {
  const { t, locale, setLocale, localeSetting } = useT();
  const selectedAuto = localeSetting === 'auto';
  return (
    <div style={{ marginTop: 8 }}>
      <div className="eyebrow" style={{
        color: 'rgba(255,255,255,0.45)', textAlign: 'center',
        marginBottom: 8, letterSpacing: '0.16em',
      }}>{t('language')}</div>
      <button
        className="press"
        onClick={() => { haptic(6); setLocale('auto'); }}
        style={{
          appearance: 'none', cursor: 'pointer', width: '100%',
          padding: '10px 12px', marginBottom: 6,
          borderRadius: 9,
          border: selectedAuto ? '1px solid var(--brass)' : '1px solid rgba(255,255,255,0.10)',
          background: selectedAuto
            ? 'radial-gradient(ellipse at 50% 0%, oklch(0.46 0.04 150), oklch(0.36 0.04 150))'
            : 'rgba(0,0,0,0.22)',
          color: selectedAuto ? 'var(--parchment)' : 'rgba(255,255,255,0.7)',
          fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 15,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          letterSpacing: '0.01em',
        }}>
        <span>{t('languageSystem')}</span>
        <span style={{
          fontSize: 10, color: selectedAuto ? 'var(--brass)' : 'rgba(255,255,255,0.4)',
          fontFamily: 'var(--sans)', letterSpacing: '0.12em', textTransform: 'uppercase',
        }}>{locale}</span>
      </button>
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: 6,
      }}>
        {LANGUAGES.map((lang) => {
          const on = !selectedAuto && locale === lang.code;
          return (
            <button
              key={lang.code}
              className="press"
              onClick={() => { haptic(6); setLocale(lang.code); }}
              style={{
                appearance: 'none', cursor: 'pointer',
                padding: '10px 12px', borderRadius: 9,
                border: on ? '1px solid var(--brass)' : '1px solid rgba(255,255,255,0.06)',
                background: on
                  ? 'radial-gradient(ellipse at 50% 0%, oklch(0.46 0.04 150), oklch(0.36 0.04 150))'
                  : 'rgba(0,0,0,0.15)',
                color: on ? 'var(--parchment)' : 'rgba(255,255,255,0.55)',
                fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 14,
                letterSpacing: '0.01em',
              }}>{lang.name}</button>
          );
        })}
      </div>
    </div>
  );
}
