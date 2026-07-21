# Gin Rummy Score Pad — PWA Design

**Date:** 2026-07-21
**Status:** Approved pending user review

## Summary

Productionize the HTML/React prototype in `handoff/` into an installable, offline-capable PWA that runs on Android and iOS phones. No rewrite: the prototype's code, look, and data model are the product. Add a real build step, a real service worker, bundled assets, and a test suite. Store distribution (Play Store / App Store) is deferred; the chosen path keeps it open via Capacitor or a Trusted Web Activity later with no code changes.

## Goals

- Installable PWA on Android and iOS (home-screen install, works fully offline).
- Minimal dependencies. Runtime: `react`, `react-dom`. Dev: `esbuild`, `@playwright/test`. Test runner is Node's built-in `node:test`.
- Unit + behavior tests over the state layer; small Playwright e2e suite over the real UI.
- Fix three bugs found in the prototype (see Bug fixes).

## Non-goals (v1)

- App-store packaging, icons/splash/signing, store listings (deferred; see `handoff/NATIVE_PACKAGING.md`).
- TypeScript conversion.
- CI setup.
- Restructuring i18n — dictionaries are ported as-is.
- Any change to game rules, screens, or visual design beyond the bug fixes below.

## Architecture

```
src/          state.js, i18n.js, ui.jsx, app.jsx, screens-*.jsx, styles.css  (ported from handoff/)
public/       index.html, manifest.json, sw.js, fonts/*.woff2, icons
test/
  unit/       one file per state-function group (node:test)
  behavior/   full-game flows through the state layer (node:test)
e2e/          Playwright specs, mobile viewport
build.mjs     esbuild script → dist/ (static, deployable anywhere)
```

- `state.jsx` becomes `state.js` with ES module exports (it contains no JSX). All other files keep JSX and are compiled by esbuild. `Object.assign(window, …)` globals are replaced with imports/exports.
- React and ReactDOM come from npm and are bundled — no CDN, so the app works offline from first launch.
- Fonts (Cormorant Garamond, DM Sans; woff2, latin + latin-ext + cyrillic subsets) are bundled locally via `@font-face`. CJK locales fall back to system fonts.
- The prototype's data-URL manifest and Blob-URL service worker become real files: `manifest.json` (name, icons, `display: standalone`, theme color) and a cache-first `sw.js` that precaches the built assets and serves them offline.
- Persistence stays `localStorage` under `gr-counter.v2`, including the existing v1 migration path.
- Output is a static `dist/` folder; any static host works (GitHub Pages assumed).

## Bug fixes (with regression tests)

1. **Mid-game target change instantly ends the game.** The target stepper in the in-game ☰ menu applies retroactively via `applyRulesToGame` → `recomputeGame`; one stray −25 tap (100 → 75) instantly finishes a game where a player has ≥ 75, jumping to the Winner screen with no trail or undo ("won at 83"). **Fix:** the target stepper is disabled (greyed, with a short hint) in the in-game menu once `hands.length > 0`. Bonus steppers remain editable mid-game and continue to rescore the ledger. Target remains editable in Home settings (applies to new games) and before the first hand.
2. **Import drops Long Gin.** `parseImportJSON`'s hand-type whitelist is `['knock','gin','undercut']`; imported `longGin` hands silently become `knock`. **Fix:** add `longGin` to the whitelist.
3. **Import drops rules.** `parseImportJSON` rebuilds games without their `rules` snapshot and discards the store-level `rules`. **Fix:** preserve both, sanitized field-by-field (numbers, clamped to the stepper bounds); games without rules fall back to `LEGACY_RULES`, store rules to `DEFAULT_RULES` — matching `loadStore`'s existing backfill.

## Testing

**Unit (`node:test`, `test/unit/`)** — every pure function in `state.js`:
`applyHandToGame` (knock/gin/longGin/undercut math, bonus application, finish detection, winner selection), `undoLastHand` (incl. finished → playing), `recomputeGame`, `editHandInGame` (incl. finished ↔ playing flips), `deleteHandInGame` (deal renumbering), `summaryForGame` (game/box/shutout bonuses), `applyRulesToGame`, `rulesOf`, `dealerOf`, `computeStats` (incl. streaks, long-gin counting), `computeHeadToHead`, `renamePlayerInStore`, `exportStoreJSON`/`parseImportJSON` round-trip (incl. regressions for bugs 2 and 3), v1 → v2 migration.

**Behavior (`node:test`, `test/behavior/`)** — multi-step flows through the state layer:
- New game → score hands to ≥ 100 → finished, correct winner and summary.
- Undo past game-end returns to playing.
- Edit a hand that un-finishes a finished game; edit that finishes a playing game.
- Delete a mid-ledger hand: renumbering, recompute, dealer rotation.
- Rules change mid-game rescores history; changed target applies only where permitted (bug 1 regression at the state level: recompute under a lowered target is exercised, and the UI-level lock is covered in e2e).
- Backup export → import round-trip preserves games, rules, and long gins.
- Legacy v1 store migrates.

**E2E (Playwright, `e2e/`, mobile viewport)** — deliberately small:
- Happy path: create game → record hands via the 3-step sheet → scores update → finish → Winner screen.
- One edit-hand flow, one undo flow.
- Bug 1 regression: with hands recorded, open the ☰ menu — the target stepper is disabled; tapping it does not end the game.

`npm test` runs unit + behavior; `npm run e2e` runs Playwright against a built `dist/`.

## Later (explicitly deferred)

- Play Store via Capacitor or Bubblewrap/TWA; App Store via Capacitor (`handoff/NATIVE_PACKAGING.md` is the checklist). Nothing in this design blocks it.
- Native haptics, status-bar styling, crash reporting — Capacitor-era concerns.
