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
