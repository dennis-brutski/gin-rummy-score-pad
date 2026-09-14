// screens-setup.jsx — Setup: choose 2 players (from roster or new names)

import React from 'react';
import { useT } from './i18n.js';
import { BrassRule, haptic } from './ui.jsx';
import { findPlayer, DEFAULT_RULES } from './state.js';

const { useState: useSU } = React;

function SetupScreen({ store, onStart, onDeletePlayer, onRenamePlayer, onBack }) {
  const { t } = useT();
  // Each slot is either { id } (picked from roster) or { name } (typed fresh).
  const [a, setA] = useSU(null);
  const [b, setB] = useSU(null);
  const [typingA, setTypingA] = useSU('');
  const [typingB, setTypingB] = useSU('');
  const [manageMode, setManageMode] = useSU(false);

  const players = store.players || [];
  const pickedIds = new Set([a?.id, b?.id].filter(Boolean));

  const slotA = a ? slotLabel(a, store) : typingA.trim() ? { name: typingA.trim() } : null;
  const slotB = b ? slotLabel(b, store) : typingB.trim() ? { name: typingB.trim() } : null;
  const canStart =
    (slotA?.name && slotA.name.length > 0) &&
    (slotB?.name && slotB.name.length > 0) &&
    // Don't allow the same roster player on both sides.
    !(a?.id && b?.id && a.id === b.id);

  const startGame = () => {
    if (!canStart) return;
    haptic(12);
    const entryA = a ? { id: a.id } : { name: typingA.trim() };
    const entryB = b ? { id: b.id } : { name: typingB.trim() };
    onStart(entryA, entryB);
  };

  // When a roster chip is tapped, fill the first empty slot — and if both
  // slots are filled, replace whichever was set most recently.
  const [lastSlot, setLastSlot] = useSU('a');
  const pickFromRoster = (p) => {
    haptic(6);
    if (!a) { setA({ id: p.id }); setTypingA(''); setLastSlot('a'); return; }
    if (!b) { setB({ id: p.id }); setTypingB(''); setLastSlot('b'); return; }
    if (lastSlot === 'a') { setB({ id: p.id }); setTypingB(''); setLastSlot('b'); }
    else { setA({ id: p.id }); setTypingA(''); setLastSlot('a'); }
  };

  const clearA = () => { setA(null); setTypingA(''); };
  const clearB = () => { setB(null); setTypingB(''); };

  return (
    <div className="fade" style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      padding: '36px 24px 28px',
    }}>
      {/* back */}
      {store.games.length > 0 && (
        <button className="btn-ghost press" onClick={onBack} style={{
          alignSelf: 'flex-start', marginBottom: 4, marginLeft: -8,
        }}>{t('backToGamesShort')}</button>
      )}

      {/* masthead */}
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <div className="eyebrow" style={{ marginBottom: 6 }}>{t('newGameTitle')}</div>
        <div className="display" style={{
          fontSize: 38, lineHeight: 1, letterSpacing: '0.005em',
          color: 'var(--parchment)',
        }}>{t('choosePlayers')}</div>
      </div>

      <BrassRule style={{ margin: '14px 0 20px' }} />

      {/* slots */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <PlayerSlot
          number="I" suit="♠" color="var(--ink)"
          slot={slotA}
          value={typingA}
          onChange={(v) => { setA(null); setTypingA(v); }}
          onClear={clearA}
        />
        <PlayerSlot
          number="II" suit="♥" color="var(--claret)"
          slot={slotB}
          value={typingB}
          onChange={(v) => { setB(null); setTypingB(v); }}
          onClear={clearB}
        />
      </div>

      {/* recent players */}
      {players.length > 0 && (
        <div style={{ marginTop: 22 }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 10, padding: '0 4px',
          }}>
            <div className="eyebrow" style={{ color: 'rgba(255,255,255,0.5)' }}>
              {manageMode ? t('editRoster') : t('pickFromRoster')}
            </div>
            <button className="btn-ghost press" onClick={() => { haptic(4); setManageMode(!manageMode); }}
              style={{ fontSize: 11, padding: '4px 8px' }}>
              {manageMode ? t('done') : t('manage')}
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            {players.map((p) => manageMode ? (
              <RosterChipEdit
                key={p.id} player={p}
                onRename={(name) => onRenamePlayer(p.id, name)}
                onDelete={() => { haptic(8); onDeletePlayer(p.id); }}
                store={store}
              />
            ) : (
              <RosterChip
                key={p.id}
                player={p}
                disabled={pickedIds.has(p.id)}
                onPick={() => pickFromRoster(p)}
                store={store}
              />
            ))}
          </div>
        </div>
      )}

      <div style={{ flex: 1 }} />

      <button
        className="btn-brass press"
        disabled={!canStart}
        onClick={startGame}
      >{t('dealTheCards')}</button>

      <div style={{
        textAlign: 'center', marginTop: 14,
        color: 'rgba(255,255,255,0.4)', fontSize: 11,
        letterSpacing: '0.08em',
      }}>
        {t('rulesShort', { ...DEFAULT_RULES, ...store.rules })}
      </div>
    </div>
  );
}

function slotLabel(slot, store) {
  if (slot.id) {
    const p = findPlayer(store, slot.id);
    return p ? { id: p.id, name: p.name } : null;
  }
  return slot;
}

// ─────────────────────────────────────────────────────────────────────────
// A single player slot — shows either a typed name or a "picked" chip
// from the roster. When picked, the slot reads as a parchment card with an
// "×" to clear; when empty, it shows a typeable line.
// ─────────────────────────────────────────────────────────────────────────
function PlayerSlot({ number, suit, color, slot, value, onChange, onClear }) {
  const { t } = useT();
  const picked = slot && slot.id;
  return (
    <div className="parchment" style={{
      padding: '14px 18px 12px',
      display: 'flex', gap: 14, alignItems: 'center', position: 'relative',
    }}>
      <div style={{
        width: 44, height: 60, borderRadius: 4,
        background: 'oklch(0.99 0.01 80)',
        border: '1px solid rgba(0,0,0,0.12)',
        boxShadow: 'inset 0 0 0 2px oklch(0.99 0.01 80), inset 0 0 0 3px rgba(0,0,0,0.06)',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between', padding: '4px 5px',
        flexShrink: 0,
      }}>
        <div style={{
          fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 13,
          color, lineHeight: 1,
        }}>{number}</div>
        <div style={{
          fontSize: 16, lineHeight: 1, color, alignSelf: 'flex-end',
        }}>{suit}</div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: 'var(--sans)', textTransform: 'uppercase',
          fontSize: 9.5, letterSpacing: '0.18em',
          color: 'var(--ink-faint)', marginBottom: 2,
        }}>{t('playerNumber', number)}</div>
        {picked ? (
          <div className="display" style={{
            fontSize: 24, color: 'var(--ink)', lineHeight: 1.1,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{slot.name}</div>
        ) : (
          <input
            className="input-line"
            style={{ color: 'var(--ink)', borderBottomColor: 'rgba(0,0,0,0.18)', fontSize: 24 }}
            value={value}
            onChange={(e) => onChange(e.target.value.slice(0, 24))}
            placeholder={t('typeAName')}
            autoComplete="off"
            autoCorrect="off"
          />
        )}
      </div>
      {(picked || value) && (
        <button onClick={onClear} className="press" aria-label="Clear name" style={{
          appearance: 'none', cursor: 'pointer',
          width: 32, height: 32, borderRadius: 999,
          background: 'rgba(0,0,0,0.06)', border: 'none',
          color: 'var(--ink-soft)', fontSize: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>×</button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Roster chip — tap to pick. Disabled means already selected above.
// Delete & rename live in Manage mode (RosterChipEdit) so this chip stays
// a single tap target with no decoration.
// ─────────────────────────────────────────────────────────────────────────
function RosterChip({ player, disabled, onPick }) {
  return (
    <button
      className="press"
      disabled={disabled}
      onClick={() => !disabled && onPick()}
      style={{
        display: 'inline-flex', alignItems: 'center', minHeight: 36,
        background: disabled ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.08)',
        border: `1px solid ${disabled ? 'rgba(255,255,255,0.06)' : 'var(--brass-deep)'}`,
        borderRadius: 999,
        padding: '6px 16px',
        opacity: disabled ? 0.4 : 1,
        color: disabled ? 'var(--ink-faint)' : 'var(--parchment)',
        fontFamily: 'var(--serif)', fontSize: 16, fontWeight: 500,
        cursor: disabled ? 'not-allowed' : 'pointer',
        letterSpacing: '0.01em', appearance: 'none',
      }}>{player.name}</button>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Edit-mode chip — inline rename input + delete (or lock when in use).
// Edits commit live (on blur/Enter) so there's no "forgot to save" trap.
// ─────────────────────────────────────────────────────────────────────────
function RosterChipEdit({ player, onRename, onDelete, store }) {
  const [text, setText] = useSU(player.name);
  const [confirming, setConfirming] = useSU(false);
  const inUse = store.games.some((g) => g.p0Id === player.id || g.p1Id === player.id);
  const dirty = text.trim() !== player.name && text.trim().length > 0;
  const commit = () => {
    const trimmed = text.trim();
    if (trimmed && trimmed !== player.name) onRename(trimmed);
  };
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center',
      background: dirty ? 'oklch(0.40 0.05 90 / 0.6)' : 'rgba(255,255,255,0.08)',
      border: `1px solid ${dirty ? 'var(--brass)' : 'var(--brass-deep)'}`,
      borderRadius: 999, padding: '2px 4px 2px 12px', gap: 4,
      transition: 'background 160ms ease, border-color 160ms ease',
    }}>
      <input
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, 24))}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') { commit(); e.currentTarget.blur(); } }}
        style={{
          appearance: 'none', border: 'none', background: 'transparent',
          color: 'var(--parchment)', fontFamily: 'var(--serif)',
          fontSize: 16, fontWeight: 500, padding: '6px 0',
          width: Math.max(60, text.length * 9 + 4), outline: 'none',
          letterSpacing: '0.01em',
        }}
      />
      {inUse ? (
        <div title="In an existing game — cannot be removed" style={{
          width: 28, height: 28, borderRadius: 999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'rgba(255,255,255,0.32)', fontSize: 12,
        }}>🔒</div>
      ) : (
        <button
          className="press"
          onClick={() => {
            if (confirming) onDelete();
            else { setConfirming(true); setTimeout(() => setConfirming(false), 2200); }
          }}
          title={confirming ? 'Tap again to remove' : 'Remove from roster'}
          style={{
            appearance: 'none', border: 'none', cursor: 'pointer',
            background: confirming ? 'var(--claret)' : 'rgba(0,0,0,0.2)',
            color: confirming ? 'var(--parchment)' : 'rgba(255,255,255,0.5)',
            width: 28, height: 28, borderRadius: 999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: confirming ? 10 : 16, fontWeight: confirming ? 600 : 400,
            flexShrink: 0, transition: 'all 160ms ease',
          }}>{confirming ? '✓' : '×'}</button>
      )}
    </div>
  );
}

export { SetupScreen, PlayerSlot, RosterChip, RosterChipEdit };
