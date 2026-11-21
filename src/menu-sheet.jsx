// menu-sheet.jsx — Menu sheet and its sections (rules, language)

import React from 'react';
import { useT, LANGUAGES } from './i18n.js';
import { haptic } from './ui.jsx';
import { DEFAULT_RULES } from './state.js';
import { Sheet } from './sheet.jsx';
import { ThemePicker } from './theme-picker.jsx';

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

export { MenuSheet, MenuRow, MenuDivider, RulesEditor, Stepper, LanguagePicker };
