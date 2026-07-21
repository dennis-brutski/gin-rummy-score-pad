# Gin Rummy Score Pad PWA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the HTML/React prototype in `handoff/` into an installable, offline-capable, fully tested PWA.

**Architecture:** The prototype's files are ported nearly verbatim into `src/` as ES modules (the `Object.assign(window, …)` globals become imports/exports), bundled by esbuild into a static `dist/`. The pure state layer gets `node:test` unit + behavior suites; Playwright drives a small mobile-viewport e2e suite. Three known bugs are fixed with regression tests.

**Tech Stack:** React 18, esbuild, `node:test` (Node ≥ 20; dev machine has v25), `@playwright/test` (Chromium only).

**Spec:** `docs/superpowers/specs/2026-07-21-gin-rummy-pwa-design.md`. The prototype source of truth is `handoff/` — keep it untouched as reference.

## Global Constraints

- Dependencies are EXACTLY: runtime `react`, `react-dom`; dev `esbuild`, `@playwright/test`. Nothing else, ever.
- Test runner for unit/behavior tests is Node's built-in `node:test` + `node:assert/strict`.
- No TypeScript. No CDN resources — everything bundled/local.
- `localStorage` keys stay `gr-counter.v2` / `gr-counter.v1`; data model unchanged.
- Visual design is reproduced exactly; the ONLY UI additions are the target-lock (disabled stepper + hint, Task 12) and `data-testid` attributes on rules rows.
- Git commits: short imperative messages, NO Co-Authored-By or other trailers.
- Ported files keep the prototype's code style and comments — this is a port, not a rewrite. Do not reformat, rename variables, or "improve" logic beyond what a task specifies.

## Port recipe (referenced by Tasks 2, 9, 10)

For each `handoff/X.jsx` → `src/X.jsx` (or `.js` when it contains no JSX):
1. `cp` the file.
2. Delete the `Object.assign(window, { … })` statement at the bottom; add `export { <the same names> };` in its place.
3. Add `import React from 'react';` if the file references `React`. Keep existing destructures like `const { useState: useSS } = React;` — they now read from the import.
4. Add imports for every identifier the file uses from another src module (map in Task 10). Free (unimported) identifiers do NOT fail the esbuild build — they surface as runtime `ReferenceError`s, which the smoke e2e in Task 10 is designed to catch. Fix by adding the missing import.

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`, `.gitignore`

**Interfaces:**
- Produces: npm scripts `test`, `build`, `e2e`; installed deps `react`, `react-dom`, `esbuild`, `@playwright/test`.

- [ ] **Step 1: Init npm and install the four dependencies**

```bash
cd /home/dennis/git/gin-rummy-score-pad
npm init -y
npm install react react-dom
npm install --save-dev esbuild @playwright/test
npx playwright install chromium
```

- [ ] **Step 2: Write `package.json` fields** (edit the generated file; keep the `dependencies`/`devDependencies` npm wrote)

```json
{
  "name": "gin-rummy-score-pad",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "node build.mjs",
    "test": "node --test test/",
    "e2e": "npm run build && playwright test",
    "icons": "node scripts/make-icons.mjs"
  }
}
```

- [ ] **Step 3: Write `.gitignore`**

```
node_modules/
dist/
test-results/
playwright-report/
```

- [ ] **Step 4: Verify and commit**

Run: `npm test` — Expected: exits 0 (or "no test files found" style output), no crash.

```bash
git add package.json package-lock.json .gitignore
git commit -m "Scaffold npm project with react, esbuild, playwright"
```

---

### Task 2: Port state.js + scoring unit tests

**Files:**
- Create: `src/state.js` (from `handoff/state.jsx` via the Port recipe — it contains no JSX)
- Test: `test/unit/scoring.test.js`

**Interfaces:**
- Produces (all later tasks import from `src/state.js`): `TARGET_SCORE`, `DEFAULT_RULES`, `LEGACY_RULES`, `rulesOf(game)`, `APP_VERSION`, `STORAGE_KEY`, `LEGACY_KEY`, `initialStore()`, `loadStore()`, `saveStore(s)`, `migrateFromV1(v1)`, `newPlayer(name)`, `newGame(p0Id, p1Id, rules?)`, `applyHandToGame(game, {type, winner, points})`, `undoLastHand(game)`, `recomputeGame(game)`, `editHandInGame(game, handId, patch)`, `deleteHandInGame(game, handId)`, `applyRulesToGame(game, newRules)`, `dealerOf(game)`, `summaryForGame(game)`, `computeStats(store)`, `computeHeadToHead(store)`, `renamePlayerInStore(store, id, name)`, `exportStoreJSON(store)`, `parseImportJSON(text)`, `findPlayer`, `findGame`, `activeGame`, `gamePlayers`.

- [ ] **Step 1: Write the failing test**

```js
// test/unit/scoring.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, applyHandToGame, LEGACY_RULES, DEFAULT_RULES } from '../../src/state.js';

const fresh = () => newGame('a', 'b');

test('knock scores raw points, no bonus', () => {
  const g = applyHandToGame(fresh(), { type: 'knock', winner: 0, points: 10 });
  assert.deepEqual(g.scores, [10, 0]);
  assert.deepEqual(g.boxes, [1, 0]);
  assert.equal(g.hands[0].totalThisHand, 10);
  assert.equal(g.hands[0].deal, 1);
  assert.equal(g.deal, 2);
  assert.equal(g.phase, 'playing');
  assert.equal(g.winner, null);
});

test('gin adds ginBonus (25)', () => {
  const g = applyHandToGame(fresh(), { type: 'gin', winner: 0, points: 20 });
  assert.equal(g.hands[0].totalThisHand, 45);
  assert.deepEqual(g.scores, [45, 0]);
});

test('longGin adds longGinBonus (25)', () => {
  const g = applyHandToGame(fresh(), { type: 'longGin', winner: 1, points: 20 });
  assert.equal(g.hands[0].totalThisHand, 45);
  assert.deepEqual(g.scores, [0, 45]);
});

test('undercut adds undercutBonus (25)', () => {
  const g = applyHandToGame(fresh(), { type: 'undercut', winner: 1, points: 15 });
  assert.equal(g.hands[0].totalThisHand, 40);
});

test('legacy rules use undercut +10', () => {
  const g = applyHandToGame(newGame('a', 'b', LEGACY_RULES), { type: 'undercut', winner: 0, points: 15 });
  assert.equal(g.hands[0].totalThisHand, 25);
});

test('custom ginBonus is honoured', () => {
  const g = applyHandToGame(newGame('a', 'b', { ...DEFAULT_RULES, ginBonus: 50 }), { type: 'gin', winner: 0, points: 20 });
  assert.equal(g.hands[0].totalThisHand, 70);
});

test('game finishes at >= target with higher scorer as winner', () => {
  let g = fresh();
  g = applyHandToGame(g, { type: 'knock', winner: 0, points: 98 });
  assert.equal(g.phase, 'playing');
  g = applyHandToGame(g, { type: 'knock', winner: 1, points: 50 });
  g = applyHandToGame(g, { type: 'knock', winner: 0, points: 10 }); // 108
  assert.equal(g.phase, 'finished');
  assert.equal(g.winner, 0);
  assert.deepEqual(g.scores, [108, 50]);
});

test('99 points does not finish', () => {
  const g = applyHandToGame(fresh(), { type: 'knock', winner: 0, points: 99 });
  assert.equal(g.phase, 'playing');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/unit/scoring.test.js`
Expected: FAIL — cannot find module `src/state.js`.

- [ ] **Step 3: Port the module**

```bash
mkdir -p src
cp handoff/state.jsx src/state.js
```

Then in `src/state.js` replace the entire `Object.assign(window, { … });` block (lines ~462–471) with:

```js
export {
  TARGET_SCORE, DEFAULT_RULES, LEGACY_RULES, rulesOf, APP_VERSION, STORAGE_KEY, LEGACY_KEY,
  initialStore, loadStore, saveStore, migrateFromV1,
  newPlayer, newGame,
  applyHandToGame, undoLastHand, summaryForGame, computeStats,
  recomputeGame, editHandInGame, deleteHandInGame, dealerOf, applyRulesToGame,
  computeHeadToHead, renamePlayerInStore,
  exportStoreJSON, parseImportJSON,
  findPlayer, findGame, activeGame, gamePlayers,
};
```

No other changes. (`loadStore`/`saveStore` reference `localStorage` inside `try/catch`, so they are Node-safe as-is.)

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/unit/scoring.test.js` — Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/state.js test/unit/scoring.test.js
git commit -m "Port state module as ESM with scoring unit tests"
```

---

### Task 3: Mutation unit tests (undo / recompute / edit / delete)

**Files:**
- Test: `test/unit/mutations.test.js`

**Interfaces:**
- Consumes: `newGame`, `applyHandToGame`, `undoLastHand`, `recomputeGame`, `editHandInGame`, `deleteHandInGame`, `dealerOf` from `src/state.js` (Task 2).

- [ ] **Step 1: Write the tests** (they should pass immediately — the module is already ported; these pin its behavior)

```js
// test/unit/mutations.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  newGame, applyHandToGame, undoLastHand, recomputeGame,
  editHandInGame, deleteHandInGame, dealerOf,
} from '../../src/state.js';

const played = () => {
  let g = newGame('a', 'b');
  g = applyHandToGame(g, { type: 'knock', winner: 0, points: 20 });
  g = applyHandToGame(g, { type: 'gin', winner: 1, points: 30 });   // b: 55
  g = applyHandToGame(g, { type: 'knock', winner: 0, points: 15 }); // a: 35
  return g;
};

test('undo reverts last hand, scores, boxes, deal', () => {
  const g = undoLastHand(played());
  assert.deepEqual(g.scores, [20, 55]);
  assert.deepEqual(g.boxes, [1, 1]);
  assert.equal(g.hands.length, 2);
  assert.equal(g.deal, 3);
});

test('undo on empty game is a no-op', () => {
  const g = newGame('a', 'b');
  assert.equal(undoLastHand(g), g);
});

test('undo after game end returns to playing', () => {
  let g = applyHandToGame(newGame('a', 'b'), { type: 'gin', winner: 0, points: 98 }); // 123, finished
  assert.equal(g.phase, 'finished');
  g = undoLastHand(g);
  assert.equal(g.phase, 'playing');
  assert.equal(g.winner, null);
  assert.deepEqual(g.scores, [0, 0]);
});

test('recomputeGame reproduces incremental totals', () => {
  const g = played();
  const r = recomputeGame(g);
  assert.deepEqual(r.scores, g.scores);
  assert.deepEqual(r.boxes, g.boxes);
  assert.equal(r.deal, g.deal);
  assert.equal(r.phase, g.phase);
});

test('editHandInGame rederives total and recomputes', () => {
  const g = played();
  const h = g.hands[1]; // gin 30 → 55
  const e = editHandInGame(g, h.id, { type: 'knock' });
  assert.equal(e.hands[1].totalThisHand, 30);
  assert.equal(e.hands[1].edited, true);
  assert.deepEqual(e.scores, [35, 30]);
});

test('edit can finish a playing game', () => {
  const g = played(); // [35, 55]
  const e = editHandInGame(g, g.hands[2].id, { points: 98 }); // a: 20+98=118
  assert.equal(e.phase, 'finished');
  assert.equal(e.winner, 0);
});

test('edit can un-finish a finished game', () => {
  let g = applyHandToGame(newGame('a', 'b'), { type: 'gin', winner: 0, points: 98 });
  g = editHandInGame(g, g.hands[0].id, { points: 10 }); // 35 < 100
  assert.equal(g.phase, 'playing');
  assert.equal(g.winner, null);
});

test('deleteHandInGame renumbers deals and recomputes', () => {
  const g = played();
  const d = deleteHandInGame(g, g.hands[1].id);
  assert.equal(d.hands.length, 2);
  assert.deepEqual(d.hands.map((h) => h.deal), [1, 2]);
  assert.deepEqual(d.scores, [35, 0]);
  assert.equal(d.deal, 3);
});

test('dealerOf alternates from dealerStart', () => {
  const g = { ...newGame('a', 'b'), dealerStart: 0, deal: 1 };
  assert.equal(dealerOf(g), 0);
  assert.equal(dealerOf({ ...g, deal: 2 }), 1);
  assert.equal(dealerOf({ ...g, deal: 3 }), 0);
});
```

- [ ] **Step 2: Run and verify all pass**

Run: `node --test test/unit/mutations.test.js` — Expected: all PASS. If any fails, the port diverged from `handoff/state.jsx` — diff against the original; do NOT change assertions to match broken code.

- [ ] **Step 3: Commit**

```bash
git add test/unit/mutations.test.js
git commit -m "Add unit tests for undo, recompute, edit, delete"
```

---

### Task 4: Rules & summary unit tests

**Files:**
- Test: `test/unit/rules-summary.test.js`

**Interfaces:**
- Consumes: `newGame`, `applyHandToGame`, `applyRulesToGame`, `rulesOf`, `summaryForGame`, `DEFAULT_RULES` from `src/state.js`.

- [ ] **Step 1: Write the tests**

```js
// test/unit/rules-summary.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  newGame, applyHandToGame, applyRulesToGame, rulesOf, summaryForGame, DEFAULT_RULES,
} from '../../src/state.js';

test('rulesOf merges snapshot over defaults', () => {
  assert.equal(rulesOf({ rules: { ginBonus: 40 } }).ginBonus, 40);
  assert.equal(rulesOf({ rules: { ginBonus: 40 } }).target, 100);
  assert.equal(rulesOf({}).undercutBonus, 25);
});

test('applyRulesToGame rescores every hand from raw points', () => {
  let g = applyHandToGame(newGame('a', 'b'), { type: 'gin', winner: 0, points: 20 }); // 45
  g = applyRulesToGame(g, { ...DEFAULT_RULES, ginBonus: 50 });
  assert.equal(g.hands[0].totalThisHand, 70);
  assert.deepEqual(g.scores, [70, 0]);
  assert.equal(g.rules.ginBonus, 50);
});

test('lowering target below a current score finishes the game (state level; UI locks this)', () => {
  let g = applyHandToGame(newGame('a', 'b'), { type: 'gin', winner: 0, points: 60 }); // 85
  assert.equal(g.phase, 'playing');
  g = applyRulesToGame(g, { ...DEFAULT_RULES, target: 75 });
  assert.equal(g.phase, 'finished');
  assert.equal(g.winner, 0);
});

test('summaryForGame is null while playing', () => {
  assert.equal(summaryForGame(newGame('a', 'b')), null);
});

test('summary applies game and box bonuses', () => {
  let g = newGame('a', 'b');
  g = applyHandToGame(g, { type: 'knock', winner: 1, points: 20 });
  g = applyHandToGame(g, { type: 'gin', winner: 0, points: 98 }); // a: 123, finished
  const s = summaryForGame(g);
  assert.equal(s.winner, 0);
  assert.equal(s.shutout, false);
  assert.equal(s.gameBonus, 100);
  assert.equal(s.boxBonus, 25);        // 1 box × 25
  assert.equal(s.loserBoxBonus, 25);
  assert.deepEqual(s.finals, [123 + 100 + 25, 20 + 25]); // [248, 45]
});

test('summary adds shutout bonus when loser has zero boxes', () => {
  const g = applyHandToGame(newGame('a', 'b'), { type: 'gin', winner: 0, points: 98 });
  const s = summaryForGame(g);
  assert.equal(s.shutout, true);
  assert.equal(s.shutoutBonusValue, 100);
  assert.deepEqual(s.finals, [123 + 100 + 25 + 100, 0]); // [348, 0]
});
```

- [ ] **Step 2: Run and verify all pass**

Run: `node --test test/unit/rules-summary.test.js` — Expected: all PASS.

- [ ] **Step 3: Commit**

```bash
git add test/unit/rules-summary.test.js
git commit -m "Add unit tests for rules application and game summary"
```

---

### Task 5: Stats unit tests

**Files:**
- Test: `test/unit/stats.test.js`

**Interfaces:**
- Consumes: `newGame`, `applyHandToGame`, `computeStats`, `computeHeadToHead`, `renamePlayerInStore` from `src/state.js`.

- [ ] **Step 1: Write the tests**

```js
// test/unit/stats.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  newGame, applyHandToGame, computeStats, computeHeadToHead, renamePlayerInStore,
} from '../../src/state.js';

const P = (id, name) => ({ id, name, createdAt: 1 });

// Finished game where p0 wins with a longGin and a knock; p1 wins one undercut.
function finishedGame(p0 = 'pa', p1 = 'pb', createdAt = 1) {
  let g = { ...newGame(p0, p1), createdAt };
  g = applyHandToGame(g, { type: 'longGin', winner: 0, points: 40 }); // 65
  g = applyHandToGame(g, { type: 'undercut', winner: 1, points: 10 }); // 35
  g = applyHandToGame(g, { type: 'knock', winner: 0, points: 50 });   // 115, finished
  return g;
}

test('computeStats counts wins, hands, gins, undercuts, biggest hand', () => {
  const store = { players: [P('pa', 'A'), P('pb', 'B')], games: [finishedGame()] };
  const s = computeStats(store);
  assert.equal(s.pa.wins, 1);
  assert.equal(s.pa.gamesPlayed, 1);
  assert.equal(s.pa.handsWon, 2);
  assert.equal(s.pa.handsPlayed, 3);
  assert.equal(s.pa.gins, 1);       // longGin counts as a gin
  assert.equal(s.pa.longGins, 1);
  assert.equal(s.pa.knocks, 1);
  assert.equal(s.pa.biggestHand, 65);
  assert.equal(s.pb.wins, 0);
  assert.equal(s.pb.undercuts, 1);
});

test('in-progress games count hands but not wins', () => {
  const g = applyHandToGame(newGame('pa', 'pb'), { type: 'knock', winner: 0, points: 5 });
  const s = computeStats({ players: [P('pa', 'A'), P('pb', 'B')], games: [g] });
  assert.equal(s.pa.gamesPlayed, 0);
  assert.equal(s.pa.handsWon, 1);
});

test('currentStreak counts consecutive recent wins', () => {
  const store = {
    players: [P('pa', 'A'), P('pb', 'B')],
    games: [finishedGame('pa', 'pb', 1), finishedGame('pa', 'pb', 2), finishedGame('pb', 'pa', 3)],
  };
  const s = computeStats(store);
  // most recent game (createdAt 3): p0='pb' wins → pb streak 1, pa streak broken
  assert.equal(s.pb.currentStreak, 1);
  assert.equal(s.pa.currentStreak, 0);
});

test('computeHeadToHead tallies pairs with id-sorted key', () => {
  const store = {
    players: [P('pa', 'A'), P('pb', 'B')],
    games: [finishedGame('pa', 'pb', 1), finishedGame('pb', 'pa', 2)],
  };
  const h = computeHeadToHead(store);
  const e = h['pa|pb'];
  assert.equal(e.total, 2);
  assert.deepEqual(e.wins, [1, 1]); // each won one as p0
});

test('renamePlayerInStore trims, caps at 24 chars, rejects empty', () => {
  const store = { players: [P('pa', 'A')], games: [] };
  assert.equal(renamePlayerInStore(store, 'pa', '  New Name  ').players[0].name, 'New Name');
  assert.equal(renamePlayerInStore(store, 'pa', 'x'.repeat(40)).players[0].name.length, 24);
  assert.equal(renamePlayerInStore(store, 'pa', '   ').players[0].name, 'A');
});
```

- [ ] **Step 2: Run and verify all pass**

Run: `node --test test/unit/stats.test.js` — Expected: all PASS.

- [ ] **Step 3: Commit**

```bash
git add test/unit/stats.test.js
git commit -m "Add unit tests for stats, head-to-head, rename"
```

---

### Task 6: Backup round-trip tests + import bug fixes (spec bugs 2 & 3)

**Files:**
- Modify: `src/state.js` (`parseImportJSON`, new `RULE_BOUNDS` + `cleanRules`)
- Test: `test/unit/backup.test.js`

**Interfaces:**
- Consumes: Task 2 exports.
- Produces: `RULE_BOUNDS` export from `src/state.js` — `{ target: [50, 500], ginBonus: [0, 100], longGinBonus: [0, 100], undercutBonus: [0, 100], boxBonus: [0, 50], gameBonus: [0, 250], shutoutBonus: [0, 300] }`.

- [ ] **Step 1: Write the failing tests**

```js
// test/unit/backup.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  initialStore, newGame, applyHandToGame, newPlayer,
  exportStoreJSON, parseImportJSON, DEFAULT_RULES, LEGACY_RULES,
} from '../../src/state.js';

function sampleStore() {
  const p0 = newPlayer('Mira'), p1 = newPlayer('Theo');
  let g = newGame(p0.id, p1.id, { ...DEFAULT_RULES, ginBonus: 40 });
  g = applyHandToGame(g, { type: 'longGin', winner: 0, points: 30 });
  return { ...initialStore(), players: [p0, p1], games: [g], rules: { ...DEFAULT_RULES, target: 150 } };
}

test('rejects invalid JSON, wrong kind, missing arrays', () => {
  assert.ok(parseImportJSON('not json').error);
  assert.ok(parseImportJSON('{"kind":"other"}').error);
  assert.ok(parseImportJSON(JSON.stringify({ kind: 'gin-rummy-counter.v2', store: {} })).error);
});

test('round-trip preserves players and games, lands on home', () => {
  const { store } = parseImportJSON(exportStoreJSON(sampleStore()));
  assert.equal(store.players.length, 2);
  assert.equal(store.games.length, 1);
  assert.equal(store.activeGameId, null);
  assert.equal(store.view, 'home');
});

test('BUG 2: longGin hands survive import', () => {
  const { store } = parseImportJSON(exportStoreJSON(sampleStore()));
  assert.equal(store.games[0].hands[0].type, 'longGin');
});

test('BUG 3: per-game rules snapshot survives import', () => {
  const { store } = parseImportJSON(exportStoreJSON(sampleStore()));
  assert.equal(store.games[0].rules.ginBonus, 40);
  assert.equal(store.games[0].rules.target, 100);
});

test('BUG 3: store-level rules survive import', () => {
  const { store } = parseImportJSON(exportStoreJSON(sampleStore()));
  assert.equal(store.rules.target, 150);
});

test('games without rules fall back to legacy rules', () => {
  const s = sampleStore();
  delete s.games[0].rules;
  const { store } = parseImportJSON(exportStoreJSON(s));
  assert.deepEqual(store.games[0].rules, { ...LEGACY_RULES });
});

test('imported rules are sanitized and clamped to stepper bounds', () => {
  const s = sampleStore();
  s.games[0].rules = { target: 10, ginBonus: 'abc', gameBonus: 9999 };
  const { store } = parseImportJSON(exportStoreJSON(s));
  assert.equal(store.games[0].rules.target, 50);       // clamped up
  assert.equal(store.games[0].rules.ginBonus, 25);     // non-numeric → legacy fallback
  assert.equal(store.games[0].rules.gameBonus, 250);   // clamped down
});
```

- [ ] **Step 2: Run to verify the bug tests fail**

Run: `node --test test/unit/backup.test.js`
Expected: the three BUG tests + fallback/clamp tests FAIL (`longGin` becomes `knock`; `rules` undefined); the reject/round-trip tests PASS.

- [ ] **Step 3: Fix `parseImportJSON` in `src/state.js`**

Add near `DEFAULT_RULES`:

```js
// Stepper bounds from the Rules editor — used to clamp imported values.
const RULE_BOUNDS = {
  target: [50, 500], ginBonus: [0, 100], longGinBonus: [0, 100],
  undercutBonus: [0, 100], boxBonus: [0, 50], gameBonus: [0, 250], shutoutBonus: [0, 300],
};

// Sanitize a rules object field-by-field over a fallback set. Non-numeric
// values keep the fallback; numeric ones are clamped to the stepper bounds.
function cleanRules(r, fallback) {
  const out = { ...fallback };
  if (!r || typeof r !== 'object') return out;
  for (const k of Object.keys(RULE_BOUNDS)) {
    const v = Number(r[k]);
    if (Number.isFinite(v)) out[k] = Math.min(RULE_BOUNDS[k][1], Math.max(RULE_BOUNDS[k][0], v));
  }
  return out;
}
```

In `parseImportJSON`'s `clean` object:
1. After the `theme:` line add: `rules: cleanRules(s.rules, DEFAULT_RULES),`
2. In the hand mapping, change the type whitelist to: `type: ['knock','gin','longGin','undercut'].includes(h.type) ? h.type : 'knock',`
3. In the game mapping (after `winner:` line) add: `rules: cleanRules(g.rules, LEGACY_RULES),`

Add `RULE_BOUNDS` to the `export { … }` list.

- [ ] **Step 4: Run to verify all pass**

Run: `node --test test/unit/backup.test.js` — Expected: all PASS. Then `npm test` — Expected: all suites still PASS.

- [ ] **Step 5: Commit**

```bash
git add src/state.js test/unit/backup.test.js
git commit -m "Fix import dropping longGin hands and rules snapshots"
```

---

### Task 7: Persistence & v1-migration unit tests

**Files:**
- Test: `test/unit/persistence.test.js`

**Interfaces:**
- Consumes: `loadStore`, `saveStore`, `initialStore`, `migrateFromV1`, `STORAGE_KEY`, `LEGACY_KEY`, `LEGACY_RULES` from `src/state.js`.

- [ ] **Step 1: Write the tests** (Node has no `localStorage`; stub it on `globalThis` per test)

```js
// test/unit/persistence.test.js
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  loadStore, saveStore, initialStore, migrateFromV1,
  STORAGE_KEY, LEGACY_KEY, LEGACY_RULES,
} from '../../src/state.js';

let mem;
beforeEach(() => {
  mem = new Map();
  globalThis.localStorage = {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => mem.set(k, String(v)),
    removeItem: (k) => mem.delete(k),
  };
});
afterEach(() => { delete globalThis.localStorage; });

test('loadStore returns initial store when empty', () => {
  assert.deepEqual(loadStore(), initialStore());
});

test('saveStore then loadStore round-trips', () => {
  const s = { ...initialStore(), theme: 'dark' };
  saveStore(s);
  assert.equal(loadStore().theme, 'dark');
});

test('loadStore backfills LEGACY_RULES onto pre-rules games', () => {
  const s = initialStore();
  s.games = [{ id: 'g1', p0Id: 'a', p1Id: 'b', scores: [0, 0], boxes: [0, 0], hands: [], deal: 1, dealerStart: 0, phase: 'playing', winner: null, createdAt: 1, updatedAt: 1 }];
  mem.set(STORAGE_KEY, JSON.stringify(s));
  assert.deepEqual(loadStore().games[0].rules, { ...LEGACY_RULES });
});

test('v1 store migrates to one v2 game with legacy rules', () => {
  const v1 = {
    players: ['Mira', 'Theo'], scores: [10, 20], boxes: [1, 1],
    hands: [{ id: 'h1', deal: 1, type: 'knock', winner: 0, points: 10, totalThisHand: 10 }],
    deal: 2, dealerStart: 0, phase: 'playing', winner: null, theme: 'light',
  };
  mem.set(LEGACY_KEY, JSON.stringify(v1));
  const s = loadStore();
  assert.equal(s.version, 2);
  assert.equal(s.players.length, 2);
  assert.equal(s.games.length, 1);
  assert.deepEqual(s.games[0].scores, [10, 20]);
  assert.equal(s.games[0].rules.undercutBonus, 10);
  assert.equal(s.activeGameId, s.games[0].id);
  assert.equal(mem.has(LEGACY_KEY), false);          // legacy key removed
  assert.equal(mem.has(STORAGE_KEY), true);          // migrated store persisted
});

test('migrateFromV1 without players yields initial store', () => {
  assert.deepEqual(migrateFromV1({}), initialStore());
});
```

- [ ] **Step 2: Run and verify all pass**

Run: `node --test test/unit/persistence.test.js` — Expected: all PASS.

- [ ] **Step 3: Commit**

```bash
git add test/unit/persistence.test.js
git commit -m "Add persistence and v1 migration tests"
```

---

### Task 8: Behavior-flow tests (state layer)

**Files:**
- Test: `test/behavior/flows.test.js`

**Interfaces:**
- Consumes: Task 2 exports.

- [ ] **Step 1: Write the tests**

```js
// test/behavior/flows.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  newGame, applyHandToGame, undoLastHand, editHandInGame, deleteHandInGame,
  summaryForGame, applyRulesToGame, DEFAULT_RULES,
} from '../../src/state.js';

test('full game night: score, undo, edit, finish, tally', () => {
  let g = newGame('a', 'b');
  g = applyHandToGame(g, { type: 'knock', winner: 0, points: 20 });
  g = applyHandToGame(g, { type: 'gin', winner: 1, points: 30 });   // b 55
  g = applyHandToGame(g, { type: 'knock', winner: 0, points: 90 }); // a 110 → finished
  assert.equal(g.phase, 'finished');
  assert.equal(g.winner, 0);

  g = undoLastHand(g);                                             // "wait, that wasn't right"
  assert.equal(g.phase, 'playing');
  assert.deepEqual(g.scores, [20, 55]);

  g = editHandInGame(g, g.hands[1].id, { type: 'knock' });         // gin → knock: 55 → 30
  assert.deepEqual(g.scores, [20, 30]);

  g = applyHandToGame(g, { type: 'gin', winner: 1, points: 98 });  // b 30+123=153 → finished
  assert.equal(g.winner, 1);
  const s = summaryForGame(g);
  assert.deepEqual(s.finals, [20 + 25, 153 + 100 + 2 * 25]);       // [45, 303]
});

test('deleting the winning hand reopens the game', () => {
  let g = newGame('a', 'b');
  g = applyHandToGame(g, { type: 'knock', winner: 1, points: 40 });
  g = applyHandToGame(g, { type: 'gin', winner: 0, points: 98 });  // finished
  g = deleteHandInGame(g, g.hands[1].id);
  assert.equal(g.phase, 'playing');
  assert.deepEqual(g.scores, [0, 40]);
  assert.equal(g.deal, 2);
});

test('mid-game bonus change rescores history without ending the game', () => {
  let g = applyHandToGame(newGame('a', 'b'), { type: 'undercut', winner: 1, points: 10 }); // 35
  g = applyRulesToGame(g, { ...DEFAULT_RULES, undercutBonus: 50 });
  assert.deepEqual(g.scores, [0, 60]);
  assert.equal(g.phase, 'playing');
});
```

- [ ] **Step 2: Run and verify all pass**

Run: `npm test` — Expected: every unit + behavior suite PASSES.

- [ ] **Step 3: Commit**

```bash
git add test/behavior/flows.test.js
git commit -m "Add behavior-flow tests over the state layer"
```

---

### Task 9: Port i18n + tests

**Files:**
- Create: `src/i18n.js` (from `handoff/i18n.jsx` via the Port recipe — no JSX inside)
- Test: `test/unit/i18n.test.js`

**Interfaces:**
- Produces: `LANGUAGES`, `dict`, `romanize`, `resolveLocale(setting)`, `makeT(locale)`, `LocaleContext`, `useT`, `pluralRu` exported from `src/i18n.js`.

- [ ] **Step 1: Write the failing test**

```js
// test/unit/i18n.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dict, resolveLocale, makeT, pluralRu, LANGUAGES } from '../../src/i18n.js';

test('resolveLocale honours explicit supported codes and falls back to en', () => {
  assert.equal(resolveLocale('de'), 'de');
  assert.equal(resolveLocale('xx'), 'en');
});

test('makeT translates, falls back to English, then to the raw key', () => {
  const t = makeT('de');
  assert.equal(t('newGame'), 'Neues Spiel');
  assert.equal(makeT('en')('newGame'), 'New Game');
  assert.equal(t('definitely-not-a-key'), 'definitely-not-a-key');
});

test('function entries receive arguments', () => {
  const t = makeT('en');
  assert.match(t('nHands', 1), /1 hand$/);
  assert.match(t('nHands', 2), /2 hands$/);
});

test('pluralRu picks one/few/many buckets', () => {
  assert.equal(pluralRu(1, 'one', 'few', 'many'), 'one');
  assert.equal(pluralRu(2, 'one', 'few', 'many'), 'few');
  assert.equal(pluralRu(5, 'one', 'few', 'many'), 'many');
  assert.equal(pluralRu(11, 'one', 'few', 'many'), 'many');
});

test('every locale key exists in the English dictionary', () => {
  const en = new Set(Object.keys(dict.en));
  for (const { code } of LANGUAGES) {
    for (const key of Object.keys(dict[code])) {
      assert.ok(en.has(key), `dict.${code}.${key} missing from dict.en`);
    }
  }
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test test/unit/i18n.test.js` — Expected: FAIL, module not found.

- [ ] **Step 3: Port the module**

```bash
cp handoff/i18n.jsx src/i18n.js
```

In `src/i18n.js`: add `import React from 'react';` as the first line; replace the trailing `Object.assign(window, { … });` with:

```js
export { LANGUAGES, dict, romanize, resolveLocale, makeT, LocaleContext, useT, pluralRu };
```

If `resolveLocale` reads `navigator.languages` unguarded and a test errors in Node, wrap that read as `(typeof navigator !== 'undefined' ? navigator.languages : []) || []` — no other changes.

- [ ] **Step 4: Run to verify it passes**

Run: `node --test test/unit/i18n.test.js` — Expected: all PASS. (If `nHands` assertions mismatch the actual English copy, read `dict.en.nHands` in the ported file and fix the regexes to match its real output — the dictionary is the source of truth.)

- [ ] **Step 5: Commit**

```bash
git add src/i18n.js test/unit/i18n.test.js
git commit -m "Port i18n module with dictionary and locale tests"
```

---

### Task 10: Port UI, build pipeline, smoke e2e

**Files:**
- Create: `src/ui.jsx`, `src/app.jsx`, `src/screens-home.jsx`, `src/screens-setup.jsx`, `src/screens-game.jsx`, `src/screens-sheet.jsx`, `src/screens-winner.jsx`, `src/screens-stats.jsx`, `src/styles.css`, `src/main.jsx`, `build.mjs`, `public/index.html`, `playwright.config.js`
- Test: `e2e/smoke.spec.js`

**Interfaces:**
- Consumes: everything exported by `src/state.js` and `src/i18n.js`.
- Produces: `npm run build` → `dist/` (app.js, index.html, styles.css); each screens file exports the names from its old `Object.assign(window, …)` call; `src/ui.jsx` exports `BrassRule`, `Suit`, `Crest`, `Pip`, `haptic`.

- [ ] **Step 1: Copy and transform the eight UI files** (Port recipe). Known cross-module imports — add these, then let the smoke test surface any stragglers:

| File | Imports from |
|---|---|
| `ui.jsx` | `react` |
| `screens-home.jsx` | `react`; `./i18n.js` (`useT`); `./ui.jsx` (atoms, `haptic`); `./state.js` (`DEFAULT_RULES`, `APP_VERSION`, `findPlayer`/`gamePlayers` as used); `./screens-sheet.jsx` (`Sheet`, `ThemePicker`, `LanguagePicker`, `RulesEditor`, `MenuDivider` as used) |
| `screens-setup.jsx` | `react`; `./i18n.js`; `./ui.jsx` |
| `screens-game.jsx` | `react`; `./i18n.js` (`useT`, `romanize`); `./ui.jsx`; `./state.js` (`TARGET_SCORE`, `dealerOf`, `gamePlayers` as used); `./screens-sheet.jsx` (`ScoreSheet`, `MenuSheet`, `EditHandSheet`) |
| `screens-sheet.jsx` | `react`; `./i18n.js` (`useT`, `LANGUAGES`); `./ui.jsx` (`haptic`, atoms); `./state.js` (`DEFAULT_RULES`) |
| `screens-winner.jsx` | `react`; `./i18n.js`; `./ui.jsx` (`Crest`, `haptic`); `./state.js` (`gamePlayers`) |
| `screens-stats.jsx` | `react`; `./i18n.js`; `./ui.jsx`; `./state.js` (`computeStats`, `computeHeadToHead`, `findPlayer` as used) |
| `app.jsx` | `react`; `./i18n.js` (`resolveLocale`, `makeT`, `LocaleContext`); `./state.js` (all helpers it calls); the five screen modules |

Copy `handoff/styles.css` → `src/styles.css` unchanged (the Google Fonts `@import` is replaced in Task 14).

- [ ] **Step 2: Write `src/main.jsx`** (the prototype's desktop letterbox `Shell` from the HTML file is intentionally dropped — phones are the target; the app renders full-viewport)

```jsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app.jsx';

createRoot(document.getElementById('root')).render(<App />);

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
```

- [ ] **Step 3: Write `build.mjs` and `public/index.html`**

```js
// build.mjs
import { build } from 'esbuild';
import { cpSync, rmSync } from 'node:fs';

rmSync('dist', { recursive: true, force: true });
await build({
  entryPoints: ['src/main.jsx'],
  bundle: true,
  minify: true,
  jsx: 'automatic',
  outfile: 'dist/app.js',
  logLevel: 'info',
});
cpSync('public', 'dist', { recursive: true });
cpSync('src/styles.css', 'dist/styles.css');
```

```html
<!-- public/index.html -->
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#1a1612">
  <link rel="manifest" href="manifest.json">
  <link rel="apple-touch-icon" href="icons/icon-192.png">
  <link rel="stylesheet" href="styles.css">
  <title>Gin Rummy</title>
</head>
<body>
  <div id="root"></div>
  <script src="app.js"></script>
</body>
</html>
```

(`sw.js`, `manifest.json`, icons, fonts arrive in Task 14 — the SW registration failing quietly until then is fine.)

- [ ] **Step 4: Build**

Run: `npm run build` — Expected: `dist/app.js`, `dist/index.html`, `dist/styles.css` produced, no esbuild errors. Import-resolution errors here mean a typo'd path; fix and rebuild.

- [ ] **Step 5: Write `playwright.config.js` and the smoke test**

```js
// playwright.config.js
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  use: { ...devices['Pixel 5'], baseURL: 'http://127.0.0.1:4173' },
  webServer: {
    command: 'npx esbuild --servedir=dist --serve=127.0.0.1:4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: true,
  },
});
```

```js
// e2e/smoke.spec.js
import { test, expect } from '@playwright/test';

// Visits every screen; any missing import in the port throws a runtime
// ReferenceError which this test surfaces via pageerror.
test('all screens render without runtime errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto('/');
  await expect(page.getByText('Gin Rummy')).toBeVisible();          // home masthead

  await page.getByRole('button', { name: 'Statistics' }).click();   // stats (empty state)
  await page.goBack().catch(() => {});
  await page.goto('/');

  await page.getByRole('button', { name: 'New Game' }).click();     // setup
  await page.getByPlaceholder('Type a name…').nth(0).fill('Mira');
  await page.getByPlaceholder('Type a name…').nth(1).fill('Theo');
  await page.getByRole('button', { name: 'Deal the Cards' }).click(); // game

  await page.getByRole('button', { name: 'Score this Hand' }).click(); // ScoreSheet step 1
  await page.getByRole('button', { name: 'Mira' }).click();            // step 2 (outcomes render)
  await expect(page.getByRole('button', { name: 'Gin', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Knock', exact: true }).click(); // step 3 (keypad)
  await expect(page.getByRole('button', { name: 'Record Hand' })).toBeVisible();

  await page.goto('/');                                             // back to home (game persists)
  await page.getByRole('button', { name: /Menu/ }).click().catch(() => {});

  expect(errors).toEqual([]);
});
```

Selector copy comes from `dict.en` in `src/i18n.js` — if a `getByRole`/`getByText` misses, check the real string/role there and in the screen component; do not weaken the pageerror assertion.

- [ ] **Step 6: Run the smoke test; fix missing imports until green**

Run: `npm run e2e -- e2e/smoke.spec.js`
Expected: PASS. Each `ReferenceError: X is not defined` in the failure output = add the missing `import { X } from './<module>'` to the file that renders it, rebuild, rerun.

- [ ] **Step 7: Verify unit tests still pass, then commit**

Run: `npm test` — Expected: PASS.

```bash
git add src/ build.mjs public/index.html playwright.config.js e2e/smoke.spec.js
git commit -m "Port UI to ES modules with esbuild build and smoke e2e"
```

---

### Task 11: E2E — full game, edit, undo

**Files:**
- Create: `e2e/helpers.js`
- Test: `e2e/game.spec.js`

**Interfaces:**
- Produces: `startGame(page, a?, b?)` and `recordHand(page, { winner, outcome, digits })` in `e2e/helpers.js` (Tasks 12–14 reuse them).

- [ ] **Step 1: Write the helpers**

```js
// e2e/helpers.js
export async function startGame(page, a = 'Mira', b = 'Theo') {
  await page.goto('/');
  await page.getByRole('button', { name: 'New Game' }).click();
  await page.getByPlaceholder('Type a name…').nth(0).fill(a);
  await page.getByPlaceholder('Type a name…').nth(1).fill(b);
  await page.getByRole('button', { name: 'Deal the Cards' }).click();
}

// outcome: 'Knock' | 'Gin' | 'Long Gin' | 'Undercut'; digits: ['9','8']
export async function recordHand(page, { winner, outcome, digits }) {
  await page.getByRole('button', { name: 'Score this Hand' }).click();
  await page.getByRole('button', { name: winner }).click();
  await page.getByRole('button', { name: outcome, exact: true }).click();
  for (const d of digits) await page.getByRole('button', { name: d, exact: true }).click();
  await page.getByRole('button', { name: 'Record Hand' }).click();
}
```

- [ ] **Step 2: Write the specs**

```js
// e2e/game.spec.js
import { test, expect } from '@playwright/test';
import { startGame, recordHand } from './helpers.js';

test('happy path: three hands to a finished game with correct tally', async ({ page }) => {
  await startGame(page);
  await recordHand(page, { winner: 'Mira', outcome: 'Knock', digits: ['2', '0'] }); // 20
  await recordHand(page, { winner: 'Theo', outcome: 'Gin', digits: ['3', '0'] });   // 55
  await expect(page.getByText('55')).toBeVisible();
  await recordHand(page, { winner: 'Mira', outcome: 'Knock', digits: ['9', '0'] }); // 110 → win
  await expect(page.getByText(/the winner/i)).toBeVisible();
  // Final tally: 110 board + 100 game + 2 boxes × 25 = 260; loser 55 + 25 = 80
  await expect(page.getByText('260')).toBeVisible();
  await expect(page.getByText('80')).toBeVisible();
});

test('editing a ledger hand updates the score', async ({ page }) => {
  await startGame(page);
  await recordHand(page, { winner: 'Mira', outcome: 'Knock', digits: ['2', '0'] });
  await page.getByText('+20').click();                       // ledger row → EditHandSheet
  await page.getByRole('button', { name: 'C', exact: true }).click();
  await page.getByRole('button', { name: '3', exact: true }).click();
  await page.getByRole('button', { name: '5', exact: true }).click();
  await page.getByRole('button', { name: 'Save Changes' }).click();
  await expect(page.getByText('35')).toBeVisible();
  await expect(page.getByText('+35')).toBeVisible();
});

test('undo removes the last hand', async ({ page }) => {
  await startGame(page);
  await recordHand(page, { winner: 'Mira', outcome: 'Knock', digits: ['2', '0'] });
  await expect(page.getByText('+20')).toBeVisible();
  await page.getByRole('button', { name: /Undo/ }).click();
  await expect(page.getByText('+20')).not.toBeVisible();
});
```

- [ ] **Step 3: Run and fix selectors until green**

Run: `npm run e2e -- e2e/game.spec.js` — Expected: 3 PASS. Ambiguous-locator failures ("resolved to 2 elements"): scope with `.first()` or a tighter role/name from the actual DOM; keep assertions unchanged.

- [ ] **Step 4: Commit**

```bash
git add e2e/helpers.js e2e/game.spec.js
git commit -m "Add e2e flows for scoring, editing, undo"
```

---

### Task 12: Bug fix 1 — lock target once hands exist

**Files:**
- Modify: `src/screens-sheet.jsx` (`Stepper`, `RulesEditor`, `MenuSheet`), `src/screens-game.jsx` (MenuSheet call, ~line 70), `src/i18n.js` (9 dictionaries)
- Test: `e2e/target-lock.spec.js`

**Interfaces:**
- Consumes: `startGame`, `recordHand` from `e2e/helpers.js`.
- Produces: `Stepper` accepts `disabled?: boolean`; `RulesEditor` accepts `lockTarget?: boolean`; `MenuSheet` accepts and forwards `lockTarget`; rules rows carry `data-testid="rule-<key>"`.

- [ ] **Step 1: Write the failing e2e test**

```js
// e2e/target-lock.spec.js
import { test, expect } from '@playwright/test';
import { startGame, recordHand } from './helpers.js';

test('target stepper is locked in-game once a hand exists', async ({ page }) => {
  await startGame(page);
  await recordHand(page, { winner: 'Mira', outcome: 'Gin', digits: ['6', '0'] }); // 85 — one −25 tap would "win"
  await page.getByRole('button', { name: /Menu/ }).click();
  const row = page.getByTestId('rule-target');
  await row.scrollIntoViewIfNeeded();
  await expect(row.getByRole('button', { name: '-' })).toBeDisabled();
  await expect(row.getByRole('button', { name: '+' })).toBeDisabled();
  await expect(row.getByText('Locked during play')).toBeVisible();
  // a bonus stepper stays editable
  await expect(page.getByTestId('rule-ginBonus').getByRole('button', { name: '+' })).toBeEnabled();
  // and the game did not end
  await expect(page.getByText(/the winner/i)).not.toBeVisible();
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run e2e -- e2e/target-lock.spec.js` — Expected: FAIL (`rule-target` testid does not exist yet).

- [ ] **Step 3: Implement**

In `src/screens-sheet.jsx`:

`Stepper` — add a `disabled` prop:

```jsx
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
  // …unchanged styles…
  // both buttons: disabled={disabled || value <= min} / {disabled || value >= max}
  // and pass that same expression to btnStyle(...)
```

`RulesEditor` — accept `lockTarget`, mark rows, guard target:

```jsx
function RulesEditor({ rules, onSet, lockTarget }) {
  // …existing r / set / resetOne…
  const reset = () => {
    haptic(8);
    onSet({ ...DEFAULT_RULES, ...(lockTarget ? { target: r.target } : {}) });
  };
```

In the `fields.map` row render:

```jsx
const locked = f.key === 'target' && !!lockTarget;
```

- Add `data-testid={'rule-' + f.key}` to the row `<div key={f.key} …>`.
- Under the label, when `locked`, render the hint (and suppress the per-field reset for a locked target — change `{modified && (` on the reset button to `{modified && !locked && (`):

```jsx
{locked && (
  <div style={{
    fontFamily: 'var(--sans)', fontSize: 10.5, fontStyle: 'italic',
    color: 'rgba(255,255,255,0.45)', marginTop: 2,
  }}>{t('targetLocked')}</div>
)}
```

- Pass `disabled={locked}` to the row's `<Stepper …>`.

`MenuSheet` — add `lockTarget` to its props destructuring and pass `lockTarget={lockTarget}` to its `<RulesEditor …>`.

In `src/screens-game.jsx` (~line 70), add to the `<MenuSheet …>` call:

```jsx
lockTarget={game.hands.length > 0}
```

(Home's `SettingsSheet` passes nothing → `lockTarget` undefined → target stays editable for new-game defaults.)

In `src/i18n.js`, add `targetLocked` to each dictionary:

```js
en: targetLocked: 'Locked during play',
de: targetLocked: 'Während des Spiels gesperrt',
ru: targetLocked: 'Заблокировано во время игры',
es: targetLocked: 'Bloqueado durante la partida',
fr: targetLocked: 'Verrouillé pendant la partie',
pt: targetLocked: 'Bloqueado durante o jogo',
it: targetLocked: 'Bloccato durante la partita',
zh: targetLocked: '对局中锁定',
ja: targetLocked: 'プレイ中はロック',
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm run e2e -- e2e/target-lock.spec.js` — Expected: PASS. Then `npm test` (i18n completeness test guards the new key) and `npm run e2e` — Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/screens-sheet.jsx src/screens-game.jsx src/i18n.js e2e/target-lock.spec.js
git commit -m "Lock target score in-game once hands exist"
```

---

### Task 13: PWA assets — manifest, icons, service worker

**Files:**
- Create: `public/manifest.json`, `public/sw.js`, `scripts/make-icons.mjs`, `public/icons/icon-192.png`, `public/icons/icon-512.png`
- Test: `e2e/offline.spec.js`

**Interfaces:**
- Consumes: `startGame` from `e2e/helpers.js`; `npm run build` from Task 10.

- [ ] **Step 1: Write `public/manifest.json`**

```json
{
  "name": "Gin Rummy",
  "short_name": "Gin Rummy",
  "description": "A pocket score pad for two-player Gin Rummy",
  "start_url": ".",
  "display": "standalone",
  "background_color": "#1a1612",
  "theme_color": "#1a1612",
  "icons": [
    { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}
```

- [ ] **Step 2: Write and run the icon generator** (reuses Playwright's Chromium — no new dependency)

```js
// scripts/make-icons.mjs
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

mkdirSync('public/icons', { recursive: true });
const html = `<body style="margin:0;width:100vw;height:100vh;display:grid;place-items:center;
  background:radial-gradient(circle at 50% 35%, #2e4636, #16241c)">
  <div style="font:700 55vh Georgia,serif;color:#c9a35c;
    text-shadow:0 1vh 3vh rgba(0,0,0,.45)">♠</div></body>`;

const browser = await chromium.launch();
for (const size of [192, 512]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(html);
  await page.screenshot({ path: `public/icons/icon-${size}.png` });
  await page.close();
}
await browser.close();
console.log('icons written');
```

Run: `npm run icons` — Expected: both PNGs exist (`file public/icons/icon-512.png` → PNG 512 x 512).

- [ ] **Step 3: Write `public/sw.js`** — cache-first with runtime caching

```js
const CACHE = 'gr-v1';
const CORE = ['./', './index.html', './app.js', './styles.css', './manifest.json'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Cache-first; successful network responses are added to the cache so
// fonts/icons requested after install also work offline.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
      }
      return res;
    }))
  );
});
```

- [ ] **Step 4: Write the failing offline test, then verify it passes after a build**

```js
// e2e/offline.spec.js
import { test, expect } from '@playwright/test';
import { startGame } from './helpers.js';

test('app loads and keeps data while offline', async ({ page, context }) => {
  await startGame(page);                       // also installs the service worker
  await page.evaluate(() => navigator.serviceWorker.ready);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Score this Hand' })).toBeVisible();
  await context.setOffline(false);
});
```

Run: `npm run e2e -- e2e/offline.spec.js` — Expected: PASS (the `npm run e2e` script rebuilds `dist/` first, picking up sw.js/manifest/icons).

- [ ] **Step 5: Commit**

```bash
git add public/manifest.json public/sw.js scripts/make-icons.mjs public/icons e2e/offline.spec.js
git commit -m "Add PWA manifest, icons, and offline service worker"
```

---

### Task 14: Bundle fonts locally

**Files:**
- Create: `public/fonts/*.woff2`
- Modify: `src/styles.css` (replace the Google Fonts `@import` with `@font-face`)

**Interfaces:**
- Consumes: the `--serif`/`--sans` font stacks already defined in `src/styles.css`.

- [ ] **Step 1: Download woff2 subsets** (latin + latin-ext + cyrillic; CJK locales use system-font fallback by design)

```bash
mkdir -p public/fonts
curl -L -o /tmp/cg.zip "https://gwfh.mranftl.com/api/fonts/cormorant-garamond?download=zip&subsets=latin,latin-ext,cyrillic&formats=woff2&variants=500,500italic,600,600italic"
curl -L -o /tmp/dm.zip "https://gwfh.mranftl.com/api/fonts/dm-sans?download=zip&subsets=latin,latin-ext&formats=woff2&variants=regular,500,600,700"
unzip -o /tmp/cg.zip -d public/fonts
unzip -o /tmp/dm.zip -d public/fonts
ls public/fonts
```

Expected: eight `.woff2` files. (If the gwfh API is unreachable, download the same variants from https://fonts.google.com and subset locally — any woff2 source is fine; filenames just need to match Step 2.)

- [ ] **Step 2: Replace the `@import` in `src/styles.css`**

Delete the `@import url('https://fonts.googleapis.com/…')` line. In its place add one `@font-face` per downloaded file, adjusting `src` filenames to what `ls public/fonts` actually shows:

```css
@font-face { font-family: 'Cormorant Garamond'; src: url('fonts/cormorant-garamond-v31-latin_latin-ext_cyrillic-500.woff2') format('woff2'); font-weight: 500; font-style: normal; font-display: swap; }
@font-face { font-family: 'Cormorant Garamond'; src: url('fonts/cormorant-garamond-v31-latin_latin-ext_cyrillic-500italic.woff2') format('woff2'); font-weight: 500; font-style: italic; font-display: swap; }
@font-face { font-family: 'Cormorant Garamond'; src: url('fonts/cormorant-garamond-v31-latin_latin-ext_cyrillic-600.woff2') format('woff2'); font-weight: 600; font-style: normal; font-display: swap; }
@font-face { font-family: 'Cormorant Garamond'; src: url('fonts/cormorant-garamond-v31-latin_latin-ext_cyrillic-600italic.woff2') format('woff2'); font-weight: 600; font-style: italic; font-display: swap; }
@font-face { font-family: 'DM Sans'; src: url('fonts/dm-sans-v16-latin_latin-ext-regular.woff2') format('woff2'); font-weight: 400; font-style: normal; font-display: swap; }
@font-face { font-family: 'DM Sans'; src: url('fonts/dm-sans-v16-latin_latin-ext-500.woff2') format('woff2'); font-weight: 500; font-style: normal; font-display: swap; }
@font-face { font-family: 'DM Sans'; src: url('fonts/dm-sans-v16-latin_latin-ext-600.woff2') format('woff2'); font-weight: 600; font-style: normal; font-display: swap; }
@font-face { font-family: 'DM Sans'; src: url('fonts/dm-sans-v16-latin_latin-ext-700.woff2') format('woff2'); font-weight: 700; font-style: normal; font-display: swap; }
```

- [ ] **Step 3: Verify no external requests remain, full suite green**

```bash
npm run build
grep -rn "googleapis\|unpkg\|https://" dist/index.html dist/styles.css ; echo "exit=$?"
```
Expected: `exit=1` (no matches).

Run: `npm test && npm run e2e` — Expected: everything PASSES. Load `http://127.0.0.1:4173` in a browser and confirm serif/sans fonts render (not Georgia fallback) in both themes.

- [ ] **Step 4: Commit**

```bash
git add public/fonts src/styles.css
git commit -m "Bundle Cormorant Garamond and DM Sans locally"
```

---

## Done criteria

- `npm test` — all unit + behavior suites pass.
- `npm run e2e` — smoke, game flows, target-lock regression, offline all pass.
- `dist/` is fully static and self-contained (no external URLs), installable as a PWA on Android and iOS.
- The three spec bugs each have a regression test: target lock (`e2e/target-lock.spec.js`), longGin import (`test/unit/backup.test.js`), rules import (`test/unit/backup.test.js`).
