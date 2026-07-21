# Gin Rummy Counter — Design Handoff

A pocket score pad for two-player Gin Rummy. Vintage card-table aesthetic, full local-first data model, light/dark themes.

---

## About this bundle

The files in this folder are **design references created in HTML/JSX**. They're a working prototype that captures the intended look, behavior, and data model — **not production code to ship as-is**.

Your task is to recreate this design in your target codebase using its existing patterns and libraries (React Native, native iOS/Android, Flutter, plain React, etc.). If your project has no environment yet, pick the right framework for the platform you're shipping to.

**Fidelity: High.** Pixel-perfect mock with final colors, typography, spacing, interactions, and a complete data model. Reproduce the UI exactly. The HTML prototype uses React + Babel-in-browser for fast iteration; that's not how you'd ship — use your codebase's standard build setup.

---

## What's in here

| File | Purpose |
|---|---|
| `Gin Rummy Counter.html` | Entry point. Loads scripts, mounts `<App />` in a centered rounded card. |
| `styles.css` | All visual tokens (colors, fonts, animations) + atom classes (`.btn-brass`, `.parchment`, `.brass-rule`). Defines `.gr` (root) and `.gr--light` (light-theme override). |
| `state.jsx` | **Single source of truth.** Pure functions for store load/save, scoring, undo, edit-hand, stats, head-to-head, JSON export/import. No React. |
| `i18n.jsx` | Translations + locale resolution. Full dictionaries for 9 languages (en, de, ru, es, fr, pt, it, zh, ja); `LocaleContext` + `useT()` hook; pluralization helpers. |
| `ui.jsx` | Tiny shared atoms: `<BrassRule>`, `<Suit>`, `<Crest>`, `<Pip>`, `haptic()`. |
| `app.jsx` | Root `<App />`. Owns the store, routes views (home / setup / game / stats), wires every mutation, handles theme + toast + file picker. |
| `screens-home.jsx` | List of saved games + ⋯ settings sheet. |
| `screens-setup.jsx` | Player picker (typed names + roster chips) with "Manage roster" rename/delete. |
| `screens-game.jsx` | Scoreboard, ledger, dealer indicator. |
| `screens-sheet.jsx` | All bottom sheets: `ScoreSheet` (3-step new hand), `EditHandSheet` (edit existing), `MenuSheet` (in-game), `Sheet` (shell), `ThemePicker`, `KnockHint`. |
| `screens-winner.jsx` | End-of-game celebration with confetti + final-tally breakdown. |
| `screens-stats.jsx` | Per-player records + head-to-head rivalry cards. |

To run the prototype: open `Gin Rummy Counter.html` directly in a modern browser (Chrome, Safari, Firefox). No build step needed — Babel transpiles JSX in the browser.

---

## Product overview

Two-player Gin Rummy is a card game played to 100 points across multiple hands. This app is purely a **score keeper** — it doesn't deal cards or simulate play. The user records each hand's outcome by hand (Knock / Gin / Undercut + point value); the app maintains running totals, applies bonus rules, persists multiple concurrent games, and surfaces statistics across game nights.

### Scoring rules implemented (standard)

- **Knock**: knocker scores (opponent deadwood − knocker deadwood) when positive
- **Gin**: knocker scores opponent's full deadwood + gin bonus (default **+25**)
- **Long Gin**: gin with an extra card in hand — opponent's full deadwood + long-gin bonus (default **+25**)
- **Undercut**: defender scores (knocker deadwood − defender deadwood) + undercut bonus (default **+25**; legacy games use +10)
- **Game end**: first to ≥ target (default **100**) wins. Final score adds:
  - game bonus (default **+100**) to winner
  - box bonus (default **+25** per hand won) to both players
  - shutout bonus (default **+100**) to winner if loser won zero hands

### Configurable scoring rules

Every bonus above (plus the target score) is user-editable via steppers in the Settings/Menu sheets. `DEFAULT_RULES` in `state.jsx`:

```ts
type Rules = {
  target: number,        // 100
  ginBonus: number,      // 25
  longGinBonus: number,  // 25
  undercutBonus: number, // 25 (LEGACY_RULES: 10 — pre-rules games migrate to this)
  boxBonus: number,      // 25
  gameBonus: number,     // 100
  shutoutBonus: number,  // 100
};
```

- The **store** carries a global `rules` object that new games inherit; **each game stores its own snapshot**, so finished games keep their original math even if defaults change later.
- Changing rules mid-game calls `applyRulesToGame(game, newRules)` — every hand's `totalThisHand` is re-derived from its raw `points` and the game is recomputed.
- The rules section header shows a `Customised · N` brass badge when N fields differ from defaults; each modified stepper is brass-highlighted with a per-field Reset showing "Default: v".

### Core flows

1. **Home** → list of games (in-progress + finished) → "New Game" or resume
2. **Setup** → name two players (typed or picked from roster) → "Deal the Cards"
3. **Game** → tap "Score this Hand" → 3-step sheet (Winner → Outcome → Points) → ledger updates
4. **Edit** → tap any ledger row to edit/delete that hand; downstream totals recompute
5. **Winner** → celebration + "Another Round?" (same players) or "Home"
6. **Stats** → per-player records + head-to-head between every pair

---

## Screens

### Home (`HomeScreen`)
**Purpose**: Landing page when no game is active. Browse, resume, or delete saved games. Quick access to stats and settings.

**Layout**:
- Vertical column, 32 px top / 22 px sides padding
- Masthead at top: `A POCKET SCORE PAD` (10 px eyebrow) → "Gin Rummy" (38 px serif) → "for two players, first to 100" (15 px italic, brass)
- Brass rule divider
- Scrollable middle: `In Progress · N` section, then `Finished · N` section, both lists of `GameRow` cards
- Footer row: outline button "Statistics" (1fr) + brass button "New Game" (2fr)
- Floating top-right: ⋯ button (44×44) opens `SettingsSheet`

**GameRow**:
- Parchment card. Top line: `★ Mira won` (finished) or `Deal 6 · in progress` (active)
- Middle: `Mira 67 vs Theo 42` — winner/leader bolded, scores at 19 px serif
- Bottom: `2d ago · 6 hands` (10 px, ink-faint)
- Right edge: 22 px ›, top-right corner: 44×44 hit area with × button (becomes "DEL" claret confirmation on first tap, fires delete on second tap within 2.4 s)

**SettingsSheet**: Download backup / Restore from backup / Theme picker (Auto / Light / Dark) / scoring legend.

### Setup (`SetupScreen`)
**Purpose**: Pick two players for a new game.

**Layout**:
- Optional back link (`← Games`, top-left) if any games exist
- Masthead: "NEW GAME" eyebrow → "Choose Players"
- Two `PlayerSlot` parchment cards (Player I ♠ + Player II ♥). Each shows a mini card icon (I/II), label, and either a typed input ("Type a name…") or a picked roster entry. × clears the slot.
- "or pick from your roster" header with `Manage` toggle. Below: row of `RosterChip` (brass-outlined pill, 36 px min-height). Tap to pick — disabled when already in a slot.
- In `Manage` mode chips become `RosterChipEdit`: inline input + delete (28×28) or lock 🔒 when used by an existing game.
- Brass `Deal the Cards` CTA
- Footer: scoring legend in monospace eyebrow

**Validation**: both names required, can't be same roster player.

### Game (`GameScreen`)
**Purpose**: Active play surface — see scores, log hands, undo, edit.

**Layout**:
- Header (24 px top): `☰ Menu` left, `Deal V` crest center (Roman numeral), `Undo ↶` right (disabled when no hands)
- **Scoreboard**: 2-column grid with a vertical brass spine + central diamond
  - Each column: suit + name eyebrow → 76 px tabular score → 3 px progress bar (fill to score/100) → boxes tally + pips → **dealer chip** `◆ DEALS` (only on dealer's side, alternates each hand)
- **Ledger**: parchment card filling middle. Header row (Hand / Mira / Theo / Type). Each row tappable (44 px hit area minimum): hand index, +N for winner with running total `(NN)` below in ink-faint, type label right-aligned (`KNOCK` plain, `GIN`/`Long Gin` italic-serif-brass, `under` claret). Most-recent row gets `pop` entry animation.
- Bottom: `Score this Hand` brass CTA

**Sheets opened from here**: `ScoreSheet` (new hand), `EditHandSheet` (tap a row), `MenuSheet` (☰).

### ScoreSheet (3-step)
1. **Winner** — two parchment cards (player I + II). Tap one → advance.
2. **Outcome** — four rows (Knock / Gin / Long Gin / Undercut), Gin highlighted with brass border + glow. Each shows blurb + ornament. Tap one → advance.
3. **Points** — Hint sentence (e.g. "Total deadwood points left in the opponent's hand"), big tabular number display with `+25` or `+10` bonus tag, total preview, custom 3×4 keypad (1–9, C, 0, ⌫). Knock outcome adds a hint: "The knocker must have ten or fewer deadwood points to knock." `Back` + `Record Hand` buttons.

### EditHandSheet
Single-screen editor for an existing ledger row:
- Winner segmented control (2 columns)
- Outcome segmented control (4 columns: Knock / Gin / Long Gin / Undercut)
- Points display with bonus preview + total
- Keypad
- "Delete hand" (claret, 2-tap confirm) + "Save Changes" (brass) buttons

After save, calls `editHandInGame(game, handId, patch)` which mutates the hand and runs `recomputeGame()` to rebuild scores/boxes/phase/winner from scratch. So a game can transition between playing/finished as needed when edits change the outcome.

### MenuSheet
Continue game · Back to games · Statistics · Download backup · Restore from backup · Theme picker · scoring legend.

### Winner (`WinnerScreen`)
- Crest `The Game is Won` at top
- "THE WINNER" eyebrow → giant 64 px name → italic subtitle (`takes the game` or `takes the game without losing a hand` for a shutout)
- Final tally parchment card: rows for Points on board / Game bonus / Boxes / Shutout bonus / Total. Two columns of numbers (winner + loser).
- Italic recap: "Mira wins by 127 points, in 6 hands."
- Footer: outline `Home` + brass `Another Round?`
- 36 falling-suit confetti pieces (CSS `@keyframes confetti-fall`)
- Triple haptic burst on mount

### Stats (`StatsScreen`)
- Back link → home
- "THE RECORD" crest
- Totals strip parchment card: Games / Hands / Players (with `N in play` subtitle for in-progress)
- Per-player cards (sorted by wins): rank+name → 🔥 N-win streak badge → big Wins / Losses / Win-rate row → win-rate bar → sub-grid (Hands won, Biggest hand, Gins called — shown as `4 (2 long)` when any long gins, Undercuts)
- **Head to Head section** (when any finished games exist): one card per player-pair with `Mira vs Theo` names + `4–1` W-L + two-tone bar + leader callout

---

## Internationalization (i18n)

Full UI translation for nine languages (incl. Long Gin + rules-customisation strings): **English, Deutsch, Русский, Español, Français, Português, Italiano, 中文, 日本語**. Auto-detection from device language (`navigator.languages`) with manual override.

- `i18n.jsx` holds `dict[code]` — each entry is either a string or a function (used for plurals and inserted values). Example: `nHands: (n) => "${n} ${n === 1 ? 'hand' : 'hands'}"`. Russian uses a 3-bucket plural picker (`pluralRu(n, one, few, many)`); other languages use simple `one/other`.
- `resolveLocale(setting)` matches the user's setting (or `'auto'` + `navigator.languages`) to a supported code; falls back to `en`.
- `makeT(locale)` builds a `t(key, ...args)` lookup, falling through to English then to the raw key.
- `LocaleContext` makes `{ t, locale, setLocale, localeSetting }` available to every screen via `useT()`.
- The **Language picker** lives in the Menu (in-game) and Settings (home) sheets. "System language" sits as a wide top row; supported languages render below as a 2-column grid using their native names so users find their language even if the current UI is in a script they don't read.
- Some translations need rich rendering (a styled span for a CTA in the middle of a sentence). For those, the translator returns an **array of parts** which the calling component composes back together with markup. See `EmptyState`, `Ledger` empty state, and `WinnerScreen.winsBy` for the pattern.

When porting to a native codebase, swap `dict` for your platform's i18n machinery (e.g. iOS `Localizable.strings`, Android `strings.xml`, Flutter `intl`). The string keys map 1:1.

## Design tokens

All in `:root` of `styles.css`. The `.gr--light` selector overrides them.

### Colors (dark/default)
```
--felt:            oklch(0.32 0.04 150)   /* main background */
--felt-deep:       oklch(0.24 0.035 150)
--felt-mid:        oklch(0.36 0.04 150)
--felt-light:      oklch(0.42 0.045 150)
--brass:           oklch(0.74 0.12 80)    /* primary accent */
--brass-deep:      oklch(0.58 0.11 65)
--brass-pale:      oklch(0.86 0.08 85)
--parchment:       oklch(0.94 0.025 80)   /* card bg / light text */
--parchment-warm:  oklch(0.90 0.035 75)
--parchment-shadow:oklch(0.82 0.04 70)
--ink:             oklch(0.18 0.02 80)    /* primary text on parchment */
--ink-soft:        oklch(0.32 0.02 80)
--ink-faint:       oklch(0.55 0.02 80)
--claret:          oklch(0.45 0.13 25)    /* hearts/diamonds + destructive */
--claret-soft:     oklch(0.62 0.10 25)
```

### Light theme overrides
Felt brightens (0.45 / 0.38 / 0.48 / 0.56), brass shifts warmer (0.78 / 0.60 / 0.88). Parchment & ink stay roughly the same since cards are on top.

### Typography
```
--serif:  'Cormorant Garamond', 'Iowan Old Style', Georgia, serif
--sans:   'DM Sans', -apple-system, system-ui, sans-serif
```

| Element | Spec |
|---|---|
| Display large | serif 500, 38–76 px, letter-spacing 0.005 em |
| Display italic | serif italic 500, brass color |
| Eyebrow | sans 600, 10 px, uppercase, letter-spacing 0.18 em |
| Smallcaps | serif 500, `font-variant: small-caps`, letter-spacing 0.08 em |
| Number | serif 500/600, tabular + lining numerals |
| Body | sans 13–14 px |
| Hint | serif italic 11–13 px |

All numbers MUST use `font-variant-numeric: tabular-nums lining-nums; font-feature-settings: 'tnum' 1, 'lnum' 1;` so totals don't jitter when digits change.

### Spacing & radii
- Card padding: 12–18 px
- Sheet padding: 22 px sides, 14 px vertical sections
- Button height: brass CTA ≥ 56 px (intrinsic via 18 px padding + 22 px font)
- Tap targets: minimum 44×44 px (delete buttons render a smaller visual in a 44 px hit area)
- Border radius: parchment 6 px, cards 10–12 px, sheets top 28 px, pills 999 px
- Brass button: `border-radius: 8 px`

### Shadows
```
parchment card:    0 6px 18px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.6)
brass button:      0 4px 14px rgba(0,0,0,0.32), inset 0 1px 0 oklch(0.95 0.06 85)
sheet:             0 -20px 60px rgba(0,0,0,0.5)
phone card:        0 30px 60px rgba(0,0,0,0.55) — only when desktop letterboxed
```

### Animations (defined in `styles.css`)
- `slide-up` 280 ms cubic-bezier(.2,.8,.2,1) — sheet entry
- `fade-in` 240 ms ease
- `pop-in` 340 ms cubic-bezier(.2,.8,.2,1) — newest ledger row
- `confetti-fall` 3–6 s ease-in — winner screen
- Press feedback: `transform: scale(0.97); filter: brightness(0.95)` on `:active`

---

## State model (single source of truth)

```ts
type Store = {
  version: 2,
  theme: 'auto' | 'light' | 'dark',
  rules: Rules,               // global defaults inherited by new games
  locale: 'auto' | 'en' | 'de' | 'ru' | 'es' | 'fr' | 'pt' | 'it' | 'zh' | 'ja',
  players: Player[],
  games: Game[],
  activeGameId: string | null,
  view: 'home' | 'setup' | 'game' | 'stats',
};

type Player = { id: string, name: string, createdAt: number };

type Game = {
  id: string,
  createdAt: number,
  updatedAt: number,
  p0Id: string, p1Id: string,
  scores: [number, number],
  boxes:  [number, number],   // hands won by each side
  hands: Hand[],
  deal: number,               // 1-indexed; current pending deal
  dealerStart: 0 | 1,         // who dealt hand 1
  phase: 'playing' | 'finished',
  winner: 0 | 1 | null,
  rules: Rules,           // per-game snapshot (see Configurable scoring rules)
};

type Hand = {
  id: string,
  deal: number,
  type: 'knock' | 'gin' | 'longGin' | 'undercut',
  winner: 0 | 1,
  points: number,             // raw deadwood difference (or full deadwood for gin)
  totalThisHand: number,      // points + bonus (used directly in scores)
  edited?: boolean,           // set when modified via EditHandSheet
};
```

Persistence: single JSON blob in `localStorage` under key `gr-counter.v2`. The store also defines a `gr-counter.v1` legacy migration path — useful as reference if you support upgrade paths.

### Pure state helpers (port these directly)

All in `state.jsx`. Pure functions, no React, no DOM. Test with plain values.

- `applyHandToGame(game, { type, winner, points })` — append a hand, advance deal, finalize if either score ≥ 100
- `undoLastHand(game)` — pop last hand, revert scores/boxes/phase
- `editHandInGame(game, handId, patch)` — modify a single hand, then `recomputeGame(game)` to rebuild totals
- `deleteHandInGame(game, handId)` — drop a hand, renumber subsequent deals, recompute
- `recomputeGame(game)` — replay `hands[]` to derive scores/boxes/phase/winner
- `summaryForGame(game)` — final tally object (winner, finals, bonuses)
- `dealerOf(game)` — `(dealerStart + deal - 1) % 2`
- `applyRulesToGame(game, newRules)` — rescore all hands under a new rule set, then recompute
- `rulesOf(game)` — game's rule snapshot merged over `DEFAULT_RULES`
- `computeStats(store)` — per-player record (wins, hands, gins, biggest hand, current streak)
- `computeHeadToHead(store)` — pairwise rivalry records
- `renamePlayerInStore(store, id, name)`
- `exportStoreJSON(store)` / `parseImportJSON(text)` — JSON backup with `kind: 'gin-rummy-counter.v2'` marker

---

## Interactions

- **Haptic feedback** (`navigator.vibrate`, ms values): 3 (keypad), 4 (toggle), 6 (pick), 8 (commit), 10–12 (CTA), 18–40 (game-event). Wrap in try/catch — many browsers no-op.
- **Press animation**: every interactive element gets `.press` (scale 0.97 + slight darken on `:active`).
- **2-tap confirm pattern**: destructive buttons show a "DEL"/"Tap again" state for 2.2–2.4 s after first tap; second tap commits. Fades back to normal if user wanders away.
- **Auto-scroll**: ledger scrolls to bottom whenever a hand is added.
- **Toast**: 2.8 s, bottom-center, brass-bordered pill. Used for "Backup downloaded", "Backup restored", etc.

---

## Responsive behavior

The HTML prototype scales the app inside a centered ~402×874 px rounded card on desktop (`window.innerWidth ≥ 520 && innerHeight ≥ 720`) and goes full-bleed below that. **In a native app this isn't needed** — the screen is the phone. Skip the `Shell` wrapper, render `<App />` as the root view, and let your platform handle safe areas.

---

## Assets

No images, no icons, no fonts to bundle. Everything is:
- **Type**: Cormorant Garamond + DM Sans via Google Fonts (free, open). Replace with platform equivalents if you can't pull from Google Fonts.
- **Iconography**: Unicode card suits (`♠ ♥ ♦ ♣`), arithmetic (`× + ↶ ◆`), arrows (`← → ↑ ↓ ›`). Replace with your icon set if you have one.
- **Brass divider ornament**: inline CSS (linear-gradient hairline + rotated 6 px diamond)
- **Card-corner number+suit**: drawn with plain divs, 44×60 px
- **Confetti**: Unicode glyphs animated with CSS

No bitmap assets to copy.

---

## PWA notes (skip in native)

The HTML file includes a minimal `<link rel="manifest">` (data URL), `apple-touch-icon`, theme color meta, and an inline service worker registered from a Blob URL. These exist so the prototype can be installed when hosted at https — irrelevant in a native build.

---

## Behaviour & edge cases worth verifying

- Editing a hand mid-game can flip the game's `phase` back to `playing` if the new totals are no longer ≥ 100; or end the game if they cross. `recomputeGame` handles this.
- Undo after a game has finished returns it to `playing`. Useful for "wait, that wasn't gin".
- A player in the roster who is referenced by any game shows a lock (🔒) and can't be deleted — protects stats integrity. Same player can still be renamed.
- Imported backups land on the Home screen with `activeGameId = null` to avoid jumping into a foreign game.
- An "orphan" game (referencing a player id not in the roster — possible only via tampered import) hides itself from the home list rather than crashing.

---

## Out of scope (intentional gaps)

- No card-dealing / hand simulation — this is a counter, not a game engine.
- No network sync. Local-first by design. Backup/restore is the only multi-device path.
- 2 players only. Hollywood / Oklahoma variants and ≥ 3 players aren't modeled.
- No authentication.

If your spec changes any of these, the data model needs a corresponding extension — `games[].players` would generalize to an array, scoring math would split per-variant, etc.

---

## Suggested implementation order

1. **State module first** — port `state.jsx` to your language. Write unit tests for `applyHandToGame`, `recomputeGame`, `editHandInGame`, `deleteHandInGame`, `summaryForGame`, `computeStats`, `computeHeadToHead`. These are pure and the trickiest part of the app.
2. **i18n keys** — port the dictionary from `i18n.jsx` into your platform's localization system. The key set is stable; you only need to wire it to your `t()` equivalent.
3. **Token system** — port the OKLCH palette and font stack. Verify both themes.
4. **Atoms** — Brass rule, parchment card, brass button, outline button, ghost button. Get these reading correctly in both themes.
5. **Game screen + ScoreSheet** — the main happy path. Once you can record hands the rest is decoration.
6. **Home + Setup** — multi-game shell.
7. **Stats + Winner + Edit + Menu** — secondary screens.
8. **Backup/restore + theme + language + dealer indicator + tap-target audit** — polish.

Good luck. The HTML prototype runs offline in any browser — keep it open in a tab and check it whenever spec questions arise.
