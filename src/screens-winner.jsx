// screens-winner.jsx — celebration screen with confetti & breakdown

import React from 'react';
import { useT } from './i18n.js';
import { Crest, haptic } from './ui.jsx';
import { gamePlayers } from './state.js';
import { Ledger } from './screens-game.jsx';

const { useEffect: useEW } = React;

function WinnerScreen({ store, game, summary, onPlayAgain, onHome }) {
  const { t } = useT();
  const { winner, finals, shutout, boxBonus, loserBoxBonus, gameBonus } = summary;
  const rules = summary.rules || game.rules || {};
  const loser = 1 - winner;
  const [p0, p1] = gamePlayers(store, game);
  const names = [p0?.name || '—', p1?.name || '—'];

  useEW(() => {
    haptic(40);
    const t1 = setTimeout(() => haptic(30), 220);
    const t2 = setTimeout(() => haptic(20), 400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div className="fade" style={{
      height: '100%', position: 'relative', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      padding: '36px 22px 32px',
    }}>
      {/* confetti */}
      <Confetti />

      {/* radial glow */}
      <div style={{
        position: 'absolute', top: '-30%', left: '50%',
        transform: 'translateX(-50%)',
        width: '160%', height: '70%',
        background: 'radial-gradient(circle, oklch(0.74 0.13 80 / 0.22) 0%, transparent 60%)',
        pointerEvents: 'none',
      }} />

      <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <Crest>{t('theGameIsWon')}</Crest>
      </div>

      <div style={{ height: 14 }} />

      <div className="pop" style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <div className="eyebrow" style={{ color: 'var(--brass)', fontSize: 11, letterSpacing: '0.22em' }}>
          {t('theWinner')}
        </div>
        <div className="display" style={{
          fontSize: 44, lineHeight: 0.95, marginTop: 8,
          color: 'var(--parchment)',
          letterSpacing: '0.005em',
          textShadow: '0 2px 0 rgba(0,0,0,0.5), 0 0 40px rgba(255,220,150,0.2)',
        }}>{names[winner]}</div>
        <div className="display" style={{
          fontFamily: 'var(--serif)', fontStyle: 'italic',
          fontSize: 18, color: 'var(--brass)', marginTop: 6,
        }}>{shutout ? t('takesTheGameShutout') : t('takesTheGame')}</div>
      </div>

      <div style={{ height: 14 }} />

      {/* Hand-by-hand history; fills the leftover height and scrolls. No
          onPickHand, so a finished game can't be edited from here. */}
      <div style={{
        flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
        position: 'relative', zIndex: 1,
      }}>
        <Ledger game={game} names={names} />
      </div>

      <div style={{ height: 12 }} />

      {/* Scorecard */}
      <div className="parchment" style={{
        padding: '16px 18px 18px',
        position: 'relative', zIndex: 1,
      }}>
        <div className="eyebrow" style={{
          textAlign: 'center', color: 'var(--ink-faint)', marginBottom: 12,
        }}>{t('finalTally')}</div>
        <BreakdownRow label={t('pointsOnBoard')} w={game.scores[winner]} l={game.scores[loser]} />
        <BreakdownRow label={t('gameBonus')} w={gameBonus} l={0} />
        <BreakdownRow label={`${t('handsWon').split(' ')[0]} ${game.boxes[winner]} × ${rules.boxBonus}`} w={boxBonus} l={loserBoxBonus} subLabel={`${game.boxes[loser]} × ${rules.boxBonus}`} />
        {shutout && <BreakdownRow label={t('shutoutBonus')} w={summary.shutoutBonusValue ?? rules.shutoutBonus ?? 100} l={0} accent />}
        <div style={{ height: 1, background: 'rgba(0,0,0,0.12)', margin: '10px 0' }} />
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr auto auto',
          alignItems: 'baseline', gap: 8,
        }}>
          <div className="display" style={{ fontSize: 17, color: 'var(--ink)' }}>{t('totalRow')}</div>
          <div className="num" style={{
            fontSize: 28, color: 'var(--ink)', fontWeight: 600,
            fontFeatureSettings: '"tnum"',
          }}>{finals[winner]}</div>
          <div className="num" style={{
            fontSize: 16, color: 'var(--ink-faint)',
            fontFeatureSettings: '"tnum"',
            minWidth: 36, textAlign: 'right',
          }}>{finals[loser]}</div>
        </div>
        <div style={{
          textAlign: 'center', marginTop: 12,
          fontFamily: 'var(--serif)', fontStyle: 'italic',
          fontSize: 13, color: 'var(--ink-soft)',
        }}>
          {(() => {
            const raw = t('winsBy', names[winner], finals[winner] - finals[loser], game.hands.length);
            if (Array.isArray(raw)) {
              return <>{raw[0]}{raw[1]}<strong style={{ color: 'var(--ink)' }}>{raw[2]}</strong>{raw[3]}{raw[4]}</>;
            }
            return raw;
          })()}
        </div>
      </div>

      <div style={{ height: 14 }} />

      <div style={{ display: 'flex', gap: 10, alignItems: 'stretch' }}>
        <button className="btn-outline press" onClick={() => { haptic(6); onHome(); }}
                style={{ flex: 1, padding: '0 16px', fontSize: 13 }}>
          {t('home')}
        </button>
        <button className="btn-brass press" onClick={() => { haptic(10); onPlayAgain(); }}
                style={{ flex: 2 }}>
          {t('anotherRound')}
        </button>
      </div>
    </div>
  );
}

function BreakdownRow({ label, w, l, subLabel, accent }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr auto auto',
      alignItems: 'baseline', gap: 8, padding: '4px 0',
    }}>
      <div style={{
        fontFamily: 'var(--sans)', fontSize: 13,
        color: accent ? 'var(--brass-deep)' : 'var(--ink-soft)',
        fontWeight: accent ? 600 : 400,
      }}>{label}{subLabel && (
        <span style={{ color: 'var(--ink-faint)', marginLeft: 6, fontSize: 11 }}>
          / {subLabel}
        </span>
      )}</div>
      <div className="num" style={{ fontSize: 15, color: 'var(--ink)', minWidth: 36, textAlign: 'right' }}>{w}</div>
      <div className="num" style={{ fontSize: 13, color: 'var(--ink-faint)', minWidth: 36, textAlign: 'right' }}>{l || '—'}</div>
    </div>
  );
}

// Confetti — small falling shapes (suits + parchment squares)
function Confetti() {
  const pieces = React.useMemo(() => {
    const arr = [];
    const symbols = ['♠','♥','♦','♣','◆','●'];
    const colors = [
      'var(--brass)', 'var(--brass-pale)', 'var(--claret-soft)',
      'var(--parchment)', 'var(--brass-deep)',
    ];
    for (let i = 0; i < 36; i++) {
      arr.push({
        sym: symbols[i % symbols.length],
        color: colors[i % colors.length],
        left: Math.random() * 100,
        delay: Math.random() * 2.5,
        duration: 3 + Math.random() * 3,
        size: 12 + Math.random() * 14,
        drift: (Math.random() - 0.5) * 80,
      });
    }
    return arr;
  }, []);
  return (
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden',
      zIndex: 0,
    }}>
      {pieces.map((p, i) => (
        <span key={i} style={{
          position: 'absolute',
          left: `calc(${p.left}% + ${p.drift}px)`,
          top: -30,
          color: p.color,
          fontSize: p.size,
          animation: `confetti-fall ${p.duration}s ${p.delay}s ease-in forwards`,
          fontFamily: 'Georgia, serif',
          textShadow: '0 1px 0 rgba(0,0,0,0.3)',
        }}>{p.sym}</span>
      ))}
    </div>
  );
}

export { WinnerScreen };
