// screens-home.jsx — Home / Games list. Shows when no active game.
// User can start a new game, resume any existing one, delete a saved game,
// and jump to stats.

import React from 'react';
import { useT } from './i18n.js';
import { BrassRule, Suit, haptic } from './ui.jsx';
import { APP_VERSION, gamePlayers } from './state.js';
import { Sheet, ThemePicker, LanguagePicker, RulesEditor, MenuDivider, MenuRow } from './screens-sheet.jsx';

const { useState: useSH } = React;

function HomeScreen({ store, onNewGame, onResume, onDeleteGame, onStats,
                     onExport, onImport, onWipeAll, rules, onSetRules,
                     theme, resolvedTheme, onSetTheme }) {
  const { t } = useT();
  const [settingsOpen, setSettingsOpen] = useSH(false);
  const games = [...store.games].sort((a, b) => b.updatedAt - a.updatedAt);
  const playing  = games.filter((g) => g.phase === 'playing');
  const finished = games.filter((g) => g.phase === 'finished');

  return (
    <div className="fade" style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      padding: '32px 22px 24px', position: 'relative',
    }}>
      {/* gear-style settings button, top-right */}
      <button
        className="press"
        onClick={() => { haptic(4); setSettingsOpen(true); }}
        title={t('settings')}
        aria-label={t('settings')}
        style={{
          position: 'absolute', top: 16, right: 12,
          appearance: 'none', border: 'none', cursor: 'pointer',
          width: 44, height: 44, borderRadius: 999,
          background: 'transparent',
          color: 'rgba(255,255,255,0.55)',
          fontSize: 20, lineHeight: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>⋯</button>

      {/* masthead */}
      <div style={{ textAlign: 'center', marginBottom: 6 }}>
        <div className="eyebrow" style={{ marginBottom: 6 }}>{t('pocketScorePad')}</div>
        <div className="display" style={{
          fontSize: 38, lineHeight: 1, letterSpacing: '0.005em',
          color: 'var(--parchment)',
        }}>{t('appName')}</div>
        <div className="display" style={{
          fontFamily: 'var(--serif)', fontStyle: 'italic',
          fontSize: 15, color: 'var(--brass)', marginTop: 6,
        }}>{t('appTagline', (store.rules && store.rules.target) || 100)}</div>
      </div>

      <BrassRule style={{ margin: '14px 0 12px' }} />

      {/* games list — scrollable middle */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', margin: '0 -22px', padding: '0 22px' }}>
        {games.length === 0 && <EmptyState />}

        {playing.length > 0 && (
          <SectionHeader label={t('inProgress', playing.length)} />
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {playing.map((g) => (
            <GameRow key={g.id} game={g} store={store}
                     onResume={() => { haptic(8); onResume(g.id); }}
                     onDelete={() => onDeleteGame(g.id)} />
          ))}
        </div>

        {finished.length > 0 && (
          <SectionHeader label={t('finished', finished.length)} style={{ marginTop: playing.length ? 18 : 0 }} />
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {finished.map((g) => (
            <GameRow key={g.id} game={g} store={store}
                     onResume={() => { haptic(8); onResume(g.id); }}
                     onDelete={() => onDeleteGame(g.id)} />
          ))}
        </div>
      </div>

      {/* footer actions */}
      <div style={{ display: 'flex', gap: 10, marginTop: 14, alignItems: 'stretch' }}>
        <button className="btn-outline press" onClick={onStats}
                style={{ flex: 1, padding: '0 16px', fontSize: 13 }}>
          {t('statistics')}
        </button>
        <button className="btn-brass press" onClick={() => { haptic(10); onNewGame(); }}
                style={{ flex: 2 }}>
          {t('newGame')}
        </button>
      </div>

      {settingsOpen && (
        <SettingsSheet
          onClose={() => setSettingsOpen(false)}
          onExport={() => { setSettingsOpen(false); onExport(); }}
          onImport={() => { setSettingsOpen(false); onImport(); }}
          onWipeAll={() => { setSettingsOpen(false); onWipeAll(); }}
          rules={rules} onSetRules={onSetRules}
          theme={theme} resolvedTheme={resolvedTheme} onSetTheme={onSetTheme} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// SettingsSheet — opens from Home. Data + appearance + language items
// (no game-level actions since there's no active game from here).
// ─────────────────────────────────────────────────────────────────────────
function SettingsSheet({ onClose, onExport, onImport, onWipeAll, rules, onSetRules,
                        theme, resolvedTheme, onSetTheme }) {
  const { t } = useT();
  const [confirmWipe, setConfirmWipe] = useSH(false);
  return (
    <Sheet title={t('settings')} onClose={onClose} closeLabel={t('done')}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 14 }}>
        {rules && onSetRules && (
          <RulesEditor rules={rules} onSet={onSetRules} />
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

        {/* Danger zone — wipe everything, two-tap confirm. */}
        <MenuDivider />
        <div className="eyebrow" style={{
          color: 'var(--claret-soft)', textAlign: 'center',
          marginTop: 4, letterSpacing: '0.16em',
        }}>{t('dangerZone')}</div>
        <button
          className="press"
          onClick={() => {
            if (confirmWipe) { onWipeAll(); }
            else { setConfirmWipe(true); setTimeout(() => setConfirmWipe(false), 2600); }
          }}
          aria-label={t('deleteAllData')}
          style={{
            appearance: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '14px 16px',
            background: confirmWipe ? 'var(--claret)' : 'rgba(160,40,40,0.10)',
            border: `1px solid ${confirmWipe ? 'var(--claret-soft)' : 'rgba(160,40,40,0.32)'}`,
            borderRadius: 10,
            textAlign: 'left',
            color: confirmWipe ? 'var(--parchment)' : 'var(--claret-soft)',
            transition: 'all 160ms ease',
          }}>
          <div style={{
            width: 34, height: 34, borderRadius: 999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: confirmWipe ? 'rgba(0,0,0,0.25)' : 'rgba(160,40,40,0.20)',
            border: '1px solid rgba(255,255,255,0.08)',
            fontSize: 18, flexShrink: 0,
            color: confirmWipe ? 'var(--parchment)' : 'var(--claret-soft)',
          }}>✗</div>
          <div style={{ flex: 1 }}>
            <div style={{
              fontFamily: 'var(--serif)', fontSize: 18,
              color: confirmWipe ? 'var(--parchment)' : 'var(--claret-soft)',
              lineHeight: 1.1,
            }}>{t('deleteAllData')}</div>
            <div style={{
              fontSize: 11, marginTop: 3,
              color: confirmWipe ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.5)',
            }}>{confirmWipe ? t('tapAgainToWipe') : t('deleteAllDataSub')}</div>
          </div>
        </button>

        {/* About — static info block, no actions */}
        <MenuDivider />
        <AboutBlock />
      </div>
    </Sheet>
  );
}

// ────────────────────────────────────────────────────────────────
// AboutBlock — version + tagline + privacy summary. Static; included in
// Settings so app-store privacy/about requirements have a surface to point
// at. APP_VERSION is wired to a single constant in state.jsx.
// ────────────────────────────────────────────────────────────────
function AboutBlock() {
  const { t } = useT();
  return (
    <div style={{
      marginTop: 4, padding: '10px 14px',
      background: 'rgba(0,0,0,0.10)',
      border: '1px solid rgba(255,255,255,0.05)',
      borderRadius: 12,
      textAlign: 'center',
    }}>
      <div className="eyebrow" style={{
        color: 'var(--brass)', letterSpacing: '0.18em',
      }}>{t('about')}</div>
      <div className="display" style={{
        fontSize: 22, lineHeight: 1, marginTop: 8, color: 'var(--parchment)',
      }}>{t('appName')}</div>
      <div style={{
        fontFamily: 'var(--serif)', fontStyle: 'italic',
        fontSize: 12, color: 'rgba(255,255,255,0.55)',
        marginTop: 4,
      }}>{t('aboutTagline')}</div>
      <div className="num" style={{
        fontSize: 10, color: 'var(--ink-faint)',
        marginTop: 8, letterSpacing: '0.08em',
      }}>{t('aboutVersion', APP_VERSION)}</div>

      <div style={{
        height: 1, background: 'rgba(255,255,255,0.06)', margin: '10px 0 8px',
      }} />

      <div className="eyebrow" style={{
        color: 'rgba(255,255,255,0.45)', letterSpacing: '0.12em',
      }}>{t('privacyTitle')}</div>
      <div style={{
        fontSize: 11.5, color: 'rgba(255,255,255,0.55)',
        marginTop: 4, lineHeight: 1.45,
      }}>{t('privacyBody')}</div>

      <div className="num" style={{
        fontSize: 9.5, color: 'rgba(255,255,255,0.32)',
        marginTop: 10, letterSpacing: '0.18em', textTransform: 'uppercase',
      }}>{t('scoringLegend')}</div>
    </div>
  );
}

function SectionHeader({ label, style }) {
  return (
    <div className="eyebrow" style={{
      color: 'var(--brass)',
      letterSpacing: '0.18em',
      margin: '12px 0 8px',
      paddingLeft: 4,
      ...style,
    }}>{label}</div>
  );
}

function EmptyState() {
  const { t } = useT();
  // Compose a "Tap CTA below to deal a fresh hand." string with the CTA
  // text styled as brass. Translator returns a hint with the CTA marker
  // already substituted; we split on it to insert a styled <span>.
  const ctaText = t('newGame');
  const raw = t('tapNewGameHint', ' CTA ');
  const parts = (typeof raw === 'string' ? raw : '').split(' CTA ');
  return (
    <div style={{
      padding: '36px 18px 18px',
      textAlign: 'center', color: 'rgba(255,255,255,0.55)',
    }}>
      <Suit symbol="♣" color="var(--brass-deep)" size={36} />
      <div className="display" style={{
        fontSize: 22, color: 'var(--parchment)', marginTop: 14,
      }}>{t('noGamesYet')}</div>
      <div style={{
        fontSize: 13, marginTop: 6, lineHeight: 1.45,
        fontFamily: 'var(--serif)', fontStyle: 'italic',
      }}>
        {parts[0]}<span style={{ color: 'var(--brass)' }}>{ctaText}</span>{parts[1]}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// One game in the list — parchment card with player names, scores, and a
// status line (deal #, who's leading, when it was last touched).
// ─────────────────────────────────────────────────────────────────────────
function GameRow({ game, store, onResume, onDelete }) {
  const { t } = useT();
  const [confirm, setConfirm] = useSH(false);
  const [p0, p1] = gamePlayers(store, game);
  const isFinished = game.phase === 'finished';
  const winner = game.winner;
  const leader = game.scores[0] === game.scores[1] ? -1 :
                 game.scores[0] > game.scores[1] ? 0 : 1;

  if (!p0 || !p1) return null; // orphaned game, hide

  return (
    <div className="parchment" style={{ overflow: 'hidden', position: 'relative' }}>
      <button
        className="press"
        onClick={() => !confirm && onResume()}
        style={{
          appearance: 'none', border: 'none', background: 'transparent',
          width: '100%', textAlign: 'left', cursor: 'pointer',
          padding: '12px 14px',
          display: 'grid', gridTemplateColumns: '1fr auto', gap: 10,
          alignItems: 'center',
        }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            {isFinished ? (
              <span style={{
                fontSize: 11, color: 'var(--brass-deep)',
                fontWeight: 600, letterSpacing: '0.04em',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>{t('gameWon', winner === 0 ? p0.name : p1.name)}</span>
            ) : (
              <span style={{
                fontSize: 11, color: 'var(--ink-soft)',
                fontWeight: 500, letterSpacing: '0.04em',
                whiteSpace: 'nowrap',
              }}>{t('gameDealInProgress', game.deal)}</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <PlayerScore name={p0.name} score={game.scores[0]} bold={!isFinished ? leader === 0 : winner === 0} />
            <span style={{ color: 'var(--ink-faint)', fontSize: 14, padding: '0 4px' }}>{t('versus')}</span>
            <PlayerScore name={p1.name} score={game.scores[1]} bold={!isFinished ? leader === 1 : winner === 1} />
          </div>
          <div style={{
            fontSize: 10, color: 'var(--ink-faint)', marginTop: 4,
            letterSpacing: '0.04em',
          }}>{relativeTime(game.updatedAt, t)} · {t('nHands', game.hands.length)}</div>
        </div>
        <div style={{
          fontFamily: 'var(--serif)', color: 'var(--brass-deep)',
          fontSize: 22, fontWeight: 600,
        }}>›</div>
      </button>
      {/* delete — larger hit area */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (confirm) onDelete();
          else { setConfirm(true); setTimeout(() => setConfirm(false), 2400); }
        }}
        className="press"
        title={confirm ? t('tapAgainToDelete') : t('delete')}
        aria-label={t('delete')}
        style={{
          position: 'absolute', top: 0, right: 0,
          appearance: 'none', border: 'none', cursor: 'pointer',
          background: 'transparent',
          color: confirm ? 'var(--claret)' : 'var(--ink-faint)',
          width: 44, height: 44,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 26, height: 26, borderRadius: 999,
          background: confirm ? 'var(--claret)' : 'rgba(0,0,0,0.06)',
          color: confirm ? 'var(--parchment)' : 'var(--ink-faint)',
          fontSize: confirm ? 9 : 16, fontWeight: confirm ? 700 : 400,
          letterSpacing: confirm ? '0.04em' : 0,
        }}>{confirm ? t('delete') : '×'}</span>
      </button>
    </div>
  );
}

function PlayerScore({ name, score, bold }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 5, minWidth: 0 }}>
      <span style={{
        fontFamily: 'var(--serif)', fontSize: 16,
        color: bold ? 'var(--ink)' : 'var(--ink-soft)',
        fontWeight: bold ? 600 : 500,
        maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>{name}</span>
      <span className="num" style={{
        fontSize: 19, color: bold ? 'var(--ink)' : 'var(--ink-soft)',
        fontWeight: bold ? 600 : 500,
      }}>{score}</span>
    </span>
  );
}

function relativeTime(ts, t) {
  const diff = Date.now() - ts;
  const m = 60 * 1000, h = 60 * m, d = 24 * h;
  if (!t) t = (k) => k;
  if (diff < m)     return t('justNow');
  if (diff < h)     return t('minAgo', Math.floor(diff / m));
  if (diff < d)     return t('hourAgo', Math.floor(diff / h));
  if (diff < 7 * d) return t('dayAgo', Math.floor(diff / d));
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export { HomeScreen, GameRow, relativeTime, SettingsSheet, AboutBlock };
