// test/unit/load-normalize.test.js
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  loadStore, parseImportJSON, summaryForGame, initialStore,
  STORAGE_KEY, DEFAULT_RULES,
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

function store(games) {
  return {
    ...initialStore(),
    players: [{ id: 'a', name: 'Mira', createdAt: 1 }, { id: 'b', name: 'Theo', createdAt: 1 }],
    games,
  };
}

function game(extra) {
  return {
    id: 'g1', p0Id: 'a', p1Id: 'b', createdAt: 1000, updatedAt: 123456789,
    scores: [0, 0], boxes: [0, 0], deal: 1, dealerStart: 0,
    phase: 'playing', winner: null, rules: { ...DEFAULT_RULES, target: 100 },
    hands: [], ...extra,
  };
}

test('loadStore recomputes a finished game whose winner is invalid', () => {
  const g = game({
    phase: 'finished', winner: 'x', scores: [5, 999], boxes: [0, 7], deal: 9,
    hands: [
      { id: 'h1', deal: 1, type: 'knock', winner: 1, points: 20, totalThisHand: 20 },
      { id: 'h2', deal: 2, type: 'gin',   winner: 0, points: 80, totalThisHand: 105 },
    ],
  });
  mem.set(STORAGE_KEY, JSON.stringify(store([g])));
  const loaded = loadStore().games[0];
  assert.equal(loaded.winner, 0);
  assert.notEqual(summaryForGame(loaded), null);
});

test('loadStore keeps a valid finished game as stored', () => {
  // Scored before the tie fix: stored totals differ from what the hands give.
  const g = game({
    phase: 'finished', winner: 1, scores: [100, 100], boxes: [1, 1], deal: 3,
    hands: [
      { id: 'h1', deal: 1, type: 'knock', winner: 0, points: 100, totalThisHand: 100 },
      { id: 'h2', deal: 2, type: 'knock', winner: 1, points: 100, totalThisHand: 100 },
    ],
  });
  mem.set(STORAGE_KEY, JSON.stringify(store([g])));
  const loaded = loadStore().games[0];
  assert.deepEqual(loaded.scores, [100, 100]);
  assert.deepEqual(loaded.boxes, [1, 1]);
  assert.equal(loaded.phase, 'finished');
  assert.equal(loaded.winner, 1);
});

const editedGame = () => game({
  scores: [10, 0], boxes: [1, 0], deal: 2,
  hands: [{ id: 'h1', deal: 1, type: 'knock', winner: 0, points: 10, totalThisHand: 10, edited: true }],
});

test('parseImportJSON keeps a hand\'s edited flag', () => {
  const text = JSON.stringify({ kind: 'gin-rummy-counter.v2', store: store([editedGame()]) });
  const { store: s } = parseImportJSON(text);
  assert.equal(s.games[0].hands[0].edited, true);
});

test('loadStore keeps a hand\'s edited flag', () => {
  mem.set(STORAGE_KEY, JSON.stringify(store([editedGame()])));
  assert.equal(loadStore().games[0].hands[0].edited, true);
});

test('loadStore keeps each game\'s updatedAt', () => {
  const g1 = editedGame();
  const g2 = game({ id: 'g2', updatedAt: 42, phase: 'finished', winner: 'x' });
  mem.set(STORAGE_KEY, JSON.stringify(store([g1, g2])));
  const games = loadStore().games;
  assert.equal(games[0].updatedAt, 123456789);
  assert.equal(games[1].updatedAt, 42);
});

test('loadStore keeps a game without p1Id exactly as stored', () => {
  const broken = { id: 'g_broken', p0Id: 'a', phase: 'finished', winner: 'x', junk: 1, rules: { ...DEFAULT_RULES } };
  mem.set(STORAGE_KEY, JSON.stringify(store([editedGame(), broken])));
  const games = loadStore().games;
  assert.equal(games.length, 2);
  assert.deepEqual(games[1], broken);
});
