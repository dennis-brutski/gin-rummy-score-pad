// screens-game.jsx — Main game screen: scoreboard, ledger, score-hand sheet

import React from 'react';
import { useT, romanize } from './i18n.js';
import { Crest, haptic, Suit, Pip } from './ui.jsx';
import { TARGET_SCORE, dealerOf, gamePlayers } from './state.js';
import { ScoreSheet, MenuSheet, EditHandSheet } from './screens-sheet.jsx';

const { useState: useStateG, useEffect: useEffectG, useRef: useRefG } = React;

// ────────────────────────────────────────────────────────────────
// Game screen
// ────────────────────────────────────────────────────────────────
function GameScreen({ store, game, onScore, onUndo, onExit, onStats,
                     onEditHand, onDeleteHand, onExport, onImport, onSetRules,
                     theme, resolvedTheme, onSetTheme }) {
  const { t } = useT();
  const [sheetOpen, setSheetOpen] = useStateG(false);
  const [menuOpen, setMenuOpen] = useStateG(false);
  const [editingHand, setEditingHand] = useStateG(null);

  const [p0, p1] = gamePlayers(store, game);
  const names = [p0?.name || '—', p1?.name || '—'];
  const [s1, s2] = game.scores;
  const target = game.rules?.target ?? TARGET_SCORE;
  const leader = s1 === s2 ? -1 : (s1 > s2 ? 0 : 1);
  const dealer = dealerOf(game);

  return (
    <div className="fade" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        padding: '24px 20px 10px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <button className="btn-ghost press" onClick={() => setMenuOpen(true)}>
          ☰&nbsp;&nbsp;{t('menu')}
        </button>
        <Crest>{t('dealN', romanize(game.deal))}</Crest>
        <button
          className="btn-ghost press"
          disabled={game.hands.length === 0}
          onClick={() => { haptic(6); onUndo(); }}
        >{t('undo')}&nbsp;↶</button>
      </div>

      {/* Scoreboard */}
      <div style={{ padding: '6px 14px 10px' }}>
        <Scoreboard
          p1={names[0]} p2={names[1]} s1={s1} s2={s2}
          boxes={game.boxes} target={target} leader={leader} dealer={dealer} />
      </div>

      {/* Ledger */}
      <div style={{ padding: '4px 14px 8px', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Ledger game={game} names={names} onPickHand={setEditingHand} />
      </div>

      {/* Footer CTA */}
      <div style={{ padding: '0 20px 24px' }}>
        <button className="btn-brass press" onClick={() => { haptic(8); setSheetOpen(true); }}>
          {t('scoreThisHand')}
        </button>
      </div>

      {sheetOpen && (
        <ScoreSheet
          players={names}
          deal={game.deal}
          rules={game.rules}
          onClose={() => setSheetOpen(false)}
          onConfirm={(entry) => { setSheetOpen(false); onScore(entry); }}
        />
      )}
      {menuOpen && (
        <MenuSheet
          onClose={() => setMenuOpen(false)}
          onExit={() => { setMenuOpen(false); onExit(); }}
          onStats={() => { setMenuOpen(false); onStats(); }}
          onExport={() => { setMenuOpen(false); onExport(); }}
          onImport={() => { setMenuOpen(false); onImport(); }}
          rules={game.rules}
          onSetRules={onSetRules}
          lockTarget={game.hands.length > 0}
          theme={theme} resolvedTheme={resolvedTheme} onSetTheme={onSetTheme} />
      )}
      {editingHand && (
        <EditHandSheet
          initial={editingHand}
          players={names}
          rules={game.rules}
          onClose={() => setEditingHand(null)}
          onSave={(patch) => { setEditingHand(null); onEditHand(editingHand.id, patch); }}
          onDelete={() => { setEditingHand(null); haptic(12); onDeleteHand(editingHand.id); }} />
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Scoreboard
// ────────────────────────────────────────────────────────────────
function Scoreboard({ p1, p2, s1, s2, boxes, target, leader, dealer }) {
  return (
    <div style={{
      position: 'relative',
      display: 'grid', gridTemplateColumns: '1fr 1px 1fr',
      alignItems: 'stretch', gap: 0,
      padding: '14px 6px 12px',
      background:
        'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.04), transparent 70%)',
    }}>
      <ScoreColumn
        name={p1} score={s1} target={target}
        boxes={boxes[0]} isLeader={leader === 0} isDealer={dealer === 0}
        align="right" suit="♠"
        suitColor="var(--parchment)"
      />
      {/* brass spine */}
      <div style={{
        background: 'linear-gradient(180deg, transparent 0%, var(--brass-deep) 15%, var(--brass) 50%, var(--brass-deep) 85%, transparent 100%)',
        boxShadow: '0 0 8px rgba(212,170,80,0.25)',
        width: 1,
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%) rotate(45deg)',
          width: 12, height: 12, background: 'var(--brass)',
          boxShadow: '0 0 0 1px var(--brass-deep), 0 0 10px rgba(212,170,80,0.4)',
        }} />
      </div>
      <ScoreColumn
        name={p2} score={s2} target={target}
        boxes={boxes[1]} isLeader={leader === 1} isDealer={dealer === 1}
        align="left" suit="♥"
        suitColor="var(--claret-soft)"
      />
    </div>
  );
}

function ScoreColumn({ name, score, target, boxes, isLeader, isDealer, align, suit, suitColor }) {
  const { t } = useT();
  const pct = Math.min(1, score / target);
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: align === 'right' ? 'flex-end' : 'flex-start',
      padding: align === 'right' ? '0 16px 0 4px' : '0 4px 0 16px',
      textAlign: align,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        flexDirection: align === 'right' ? 'row' : 'row-reverse',
      }}>
        <Suit symbol={suit} color={suitColor} size={13} />
        <div className="eyebrow" style={{
          color: isLeader ? 'var(--brass)' : 'rgba(255,255,255,0.5)',
          letterSpacing: '0.14em',
        }}>{name}</div>
      </div>
      <div className="num" style={{
        fontSize: 76, lineHeight: 0.95, marginTop: 6,
        color: isLeader ? 'var(--parchment)' : 'oklch(0.78 0.025 80)',
        fontVariantNumeric: 'tabular-nums lining-nums',
        fontWeight: 500,
        textShadow: isLeader
          ? '0 1px 0 rgba(0,0,0,0.35), 0 0 18px rgba(255,220,150,0.06)'
          : '0 1px 0 rgba(0,0,0,0.35)',
      }}>{score}</div>
      {/* progress bar (subtle, brass) */}
      <div style={{
        width: '100%', maxWidth: 130, height: 3, borderRadius: 999,
        background: 'rgba(0,0,0,0.28)',
        marginTop: 10,
        overflow: 'hidden',
        boxShadow: 'inset 0 1px 1px rgba(0,0,0,0.5)',
      }}>
        <div style={{
          width: pct * 100 + '%', height: '100%',
          background: 'linear-gradient(90deg, var(--brass-deep), var(--brass), var(--brass-pale))',
          borderRadius: 999,
          transition: 'width 600ms cubic-bezier(.2,.8,.2,1)',
        }} />
      </div>
      {/* boxes tally + dealer chip */}
      <div style={{
        marginTop: 10, display: 'flex', alignItems: 'center',
        flexDirection: align === 'right' ? 'row' : 'row-reverse',
        gap: 6,
      }}>
        <div className="eyebrow" style={{ color: 'rgba(255,255,255,0.4)' }}>
          {t('box', boxes)}
        </div>
        <div style={{ display: 'flex', gap: 0 }}>
          {Array.from({ length: Math.min(boxes, 6) }).map((_, i) => <Pip key={i} filled />)}
        </div>
      </div>
      {isDealer && (
        <div style={{
          marginTop: 6,
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '2px 8px', borderRadius: 999,
          background: 'rgba(212,170,80,0.10)',
          border: '1px solid var(--brass-deep)',
          fontFamily: 'var(--sans)', fontSize: 9,
          color: 'var(--brass)', fontWeight: 600,
          letterSpacing: '0.16em', textTransform: 'uppercase',
        }}>
          <span style={{ fontSize: 8 }}>◆</span> {t('deals')}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Ledger
// ────────────────────────────────────────────────────────────────
function Ledger({ game, names, onPickHand }) {
  const { t } = useT();
  const scrollRef = useRefG(null);
  useEffectG(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [game.hands.length]);

  if (game.hands.length === 0) {
    const ctaText = t('scoreThisHand');
    // dict.en's ledgerEmptyHint returns [prefix, ctaText, suffix] directly
    // (unlike tapNewGameHint, it doesn't take a marker to split) — pass the
    // real ctaText and consume the array positionally instead of splitting.
    const raw = t('ledgerEmptyHint', ctaText);
    const parts = Array.isArray(raw) ? raw : ['', ctaText, ''];
    return (
      <div className="parchment" style={{
        flex: 1, minHeight: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: 24, gap: 10,
      }}>
        <Suit symbol="♣" color="var(--ink-faint)" size={32} />
        <div style={{
          fontFamily: 'var(--serif)', fontStyle: 'italic',
          fontSize: 17, color: 'var(--ink-soft)', textAlign: 'center',
        }}>{t('ledgerAwaits')}</div>
        <div style={{
          fontSize: 11, color: 'var(--ink-faint)', textAlign: 'center',
          maxWidth: 220, lineHeight: 1.5, marginTop: 2,
        }}>{parts[0]}<span style={{ color: 'var(--brass-deep)', fontWeight: 600 }}>{parts[1]}</span>{parts[2]}</div>
      </div>
    );
  }

  // running totals along the way
  let r1 = 0, r2 = 0;
  const rows = game.hands.map((h) => {
    if (h.winner === 0) r1 += h.totalThisHand; else r2 += h.totalThisHand;
    return { ...h, r1, r2 };
  });

  return (
    <div className="parchment" style={{
      flex: 1, minHeight: 0,
      display: 'flex', flexDirection: 'column',
      padding: '12px 0 0',
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '36px 1fr 1fr 56px',
        gap: 0,
        padding: '0 16px 8px',
        borderBottom: '1px solid rgba(0,0,0,0.08)',
        alignItems: 'baseline',
      }}>
        <div className="eyebrow" style={{ color: 'var(--ink-faint)' }}>{t('handCol')}</div>
        <div className="eyebrow" style={{ color: 'var(--ink-faint)', textAlign: 'center' }}>
          {truncate(names[0], 7)}
        </div>
        <div className="eyebrow" style={{ color: 'var(--ink-faint)', textAlign: 'center' }}>
          {truncate(names[1], 7)}
        </div>
        <div className="eyebrow" style={{ color: 'var(--ink-faint)', textAlign: 'right' }}>{t('typeCol')}</div>
      </div>
      <div ref={scrollRef} style={{
        flex: 1, minHeight: 0, overflowY: 'auto',
        padding: '6px 0 12px',
      }}>
        {rows.map((row, i) => (
          <LedgerRow
            key={row.id} row={row} idx={i + 1}
            isLast={i === rows.length - 1}
            onPick={() => { haptic(4); onPickHand?.(row); }} />
        ))}
      </div>
    </div>
  );
}

function truncate(s, n) {
  if (!s) return '—';
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

function LedgerRow({ row, idx, isLast, onPick }) {
  const { t } = useT();
  const typeLabel = { knock: t('typeKnock'), gin: t('typeGin'), longGin: t('typeLongGin'), undercut: t('typeUnder') }[row.type];
  const typeColor = (row.type === 'gin' || row.type === 'longGin')
    ? 'var(--brass-deep)'
    : (row.type === 'undercut' ? 'var(--claret)' : 'var(--ink-soft)');
  return (
    <button
      onClick={onPick}
      className={`press ${isLast ? 'pop' : ''}`}
      style={{
        display: 'grid',
        gridTemplateColumns: '36px 1fr 1fr 56px',
        alignItems: 'center',
        padding: '7px 16px',
        borderBottom: '1px dashed rgba(0,0,0,0.06)',
        appearance: 'none', border: 'none', background: 'transparent',
        width: '100%', textAlign: 'inherit', cursor: 'pointer',
        font: 'inherit', color: 'inherit',
      }}>
      <div className="num" style={{
        fontSize: 14, color: 'var(--ink-faint)',
        display: 'flex', alignItems: 'baseline', gap: 4,
      }}>
        <span>{idx}.</span>
        {row.edited && (
          <span title="Edited" style={{
            fontSize: 9, color: 'var(--brass-deep)', letterSpacing: 0,
            transform: 'translateY(-2px)',
          }}>•</span>
        )}
      </div>
      <Cell active={row.winner === 0} score={row.totalThisHand} running={row.r1} />
      <Cell active={row.winner === 1} score={row.totalThisHand} running={row.r2} />
      <div style={{
        textAlign: 'right',
        fontFamily: (row.type === 'gin' || row.type === 'longGin') ? 'var(--serif)' : 'var(--sans)',
        fontStyle: (row.type === 'gin' || row.type === 'longGin') ? 'italic' : 'normal',
        fontWeight: (row.type === 'gin' || row.type === 'longGin') ? 600 : 500,
        letterSpacing: (row.type === 'gin' || row.type === 'longGin') ? '0.08em' : '0.03em',
        fontSize: (row.type === 'gin' || row.type === 'longGin') ? 13 : 10,
        textTransform: (row.type === 'gin' || row.type === 'longGin') ? 'none' : 'uppercase',
        color: typeColor,
      }}>{typeLabel}</div>
    </button>
  );
}

function Cell({ active, score, running }) {
  if (!active) {
    return (
      <div style={{ textAlign: 'center' }}>
        <div className="num" style={{ fontSize: 13, color: 'rgba(0,0,0,0.18)' }}>—</div>
      </div>
    );
  }
  return (
    <div style={{ textAlign: 'center' }}>
      <div className="num" style={{ fontSize: 19, color: 'var(--ink)', lineHeight: 1 }}>+{score}</div>
      <div className="num" style={{ fontSize: 10, color: 'var(--ink-faint)', marginTop: 2 }}>
        ({running})
      </div>
    </div>
  );
}

export { GameScreen, Scoreboard, Ledger };
