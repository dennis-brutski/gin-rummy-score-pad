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
