// test/unit/backup.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  initialStore, newGame, applyHandToGame, newPlayer,
  exportStoreJSON, parseImportJSON, DEFAULT_RULES, LEGACY_RULES,
  summaryForGame,
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

test('store without rules falls back to default rules', () => {
  const s = sampleStore();
  delete s.rules;
  const { store } = parseImportJSON(exportStoreJSON(s));
  assert.deepEqual(store.rules, { ...DEFAULT_RULES });
});

test('imported rules are sanitized and clamped to stepper bounds', () => {
  const s = sampleStore();
  s.games[0].rules = { target: 10, ginBonus: 'abc', gameBonus: 9999 };
  const { store } = parseImportJSON(exportStoreJSON(s));
  assert.equal(store.games[0].rules.target, 50);       // clamped up
  assert.equal(store.games[0].rules.ginBonus, 25);     // non-numeric → legacy fallback
  assert.equal(store.games[0].rules.gameBonus, 250);   // clamped down
});

test('round-trip preserves the language setting', () => {
  for (const locale of ['de', 'ja', 'auto']) {
    const { store } = parseImportJSON(exportStoreJSON({ ...sampleStore(), locale }));
    assert.equal(store.locale, locale);
  }
});

test('unknown or missing language falls back to auto on import', () => {
  for (const locale of ['xx', 42, null, undefined]) {
    const { store } = parseImportJSON(exportStoreJSON({ ...sampleStore(), locale }));
    assert.equal(store.locale, 'auto');
  }
});

// A finished game whose stored winner is invalid and whose totals disagree
// with its hands. Player 0 reached the target, so the hands say winner 0.
function inconsistentBackup() {
  const p0 = newPlayer('Mira'), p1 = newPlayer('Theo');
  return JSON.stringify({
    kind: 'gin-rummy-counter.v2',
    store: {
      players: [p0, p1],
      games: [{
        id: 'g_bad', p0Id: p0.id, p1Id: p1.id,
        createdAt: 1000, updatedAt: 123456789,
        scores: [5, 999], boxes: [0, 7], deal: 9, dealerStart: 0,
        phase: 'finished', winner: 'x',
        rules: { ...DEFAULT_RULES, target: 100 },
        hands: [
          { id: 'h1', deal: 1, type: 'knock', winner: 1, points: 20, totalThisHand: 20 },
          { id: 'h2', deal: 2, type: 'gin',   winner: 0, points: 80, totalThisHand: 105 },
        ],
      }],
    },
  });
}

test('imported game totals are re-derived from its hands', () => {
  const { store } = parseImportJSON(inconsistentBackup());
  const g = store.games[0];
  assert.equal(g.phase, 'finished');
  assert.equal(g.winner, 0);
  assert.deepEqual(g.scores, [105, 20]);
  assert.deepEqual(g.boxes, [1, 1]);
  for (const game of store.games.filter((x) => x.phase === 'finished')) {
    assert.notEqual(summaryForGame(game), null);
  }
});

test('imported game claiming finished with too few points is playing', () => {
  const backup = JSON.parse(inconsistentBackup());
  backup.store.games[0].hands.pop();
  const { store } = parseImportJSON(JSON.stringify(backup));
  assert.equal(store.games[0].phase, 'playing');
  assert.equal(store.games[0].winner, null);
  assert.deepEqual(store.games[0].scores, [0, 20]);
});

test('import keeps each game\'s updatedAt', () => {
  const { store } = parseImportJSON(inconsistentBackup());
  assert.equal(store.games[0].updatedAt, 123456789);
});
