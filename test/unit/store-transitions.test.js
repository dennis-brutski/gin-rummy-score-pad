import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_RULES, initialStore, newPlayer, newGame, applyHandToGame,
  startGameInStore, playAgainInStore, deletePlayerInStore,
  deleteGameInStore, updateActiveGame, setDefaultRulesInStore,
} from '../../src/state.js';

const customRules = { ...DEFAULT_RULES, target: 250, ginBonus: 25 };

test('starting a game with two new names adds two players and an active game with store.rules', () => {
  const s0 = { ...initialStore(), rules: customRules };
  const s = startGameInStore(s0, { name: 'Ann' }, { name: 'Bob' });
  assert.deepEqual(s.players.map((p) => p.name), ['Ann', 'Bob']);
  assert.equal(s.games.length, 1);
  const g = s.games[0];
  assert.equal(s.activeGameId, g.id);
  assert.equal(s.view, 'game');
  assert.equal(g.p0Id, s.players[0].id);
  assert.equal(g.p1Id, s.players[1].id);
  assert.deepEqual(g.rules, customRules);
  assert.equal(s0.players.length, 0, 'input store is not mutated');
});

test('starting a game with an existing player id adds no player for that entry', () => {
  const ann = newPlayer('Ann');
  const s0 = { ...initialStore(), players: [ann] };
  const s = startGameInStore(s0, { id: ann.id, name: 'Ann' }, { name: 'Bob' });
  assert.equal(s.players.length, 2);
  assert.equal(s.players[0], ann);
  assert.equal(s.players[1].name, 'Bob');
  assert.equal(s.games[0].p0Id, ann.id);
  assert.equal(s.games[0].p1Id, s.players[1].id);
});

test('playAgainInStore copies the current game rules and players, not store.rules', () => {
  const gameRules = { ...DEFAULT_RULES, target: 150 };
  const cur = newGame('a', 'b', gameRules);
  const s0 = { ...initialStore(), rules: customRules, games: [cur], activeGameId: cur.id, view: 'game' };
  const s = playAgainInStore(s0);
  assert.equal(s.games.length, 2);
  const g = s.games[1];
  assert.notEqual(g.id, cur.id);
  assert.equal(s.activeGameId, g.id);
  assert.equal(s.view, 'game');
  assert.equal(g.p0Id, 'a');
  assert.equal(g.p1Id, 'b');
  assert.deepEqual(g.rules, gameRules);
});

test('playAgainInStore with no active game goes home', () => {
  const s0 = { ...initialStore(), activeGameId: 'g_missing', view: 'game' };
  const s = playAgainInStore(s0);
  assert.equal(s.view, 'home');
  assert.equal(s.activeGameId, null);
  assert.equal(s.games.length, 0);
});

test('deletePlayerInStore keeps a player who is in a game', () => {
  const a = newPlayer('Ann'), b = newPlayer('Bob');
  const s0 = { ...initialStore(), players: [a, b], games: [newGame('x', b.id)] };
  assert.equal(deletePlayerInStore(s0, b.id), s0);
});

test('deletePlayerInStore removes an unused player', () => {
  const a = newPlayer('Ann'), b = newPlayer('Bob');
  const s0 = { ...initialStore(), players: [a, b], games: [newGame(a.id, 'x')] };
  const s = deletePlayerInStore(s0, b.id);
  assert.deepEqual(s.players, [a]);
});

test('deleteGameInStore clears activeGameId when the active game is deleted', () => {
  const g1 = newGame('a', 'b'), g2 = newGame('a', 'b');
  const s0 = { ...initialStore(), games: [g1, g2], activeGameId: g1.id };
  const s = deleteGameInStore(s0, g1.id);
  assert.deepEqual(s.games, [g2]);
  assert.equal(s.activeGameId, null);
});

test('deleteGameInStore keeps activeGameId when another game is deleted', () => {
  const g1 = newGame('a', 'b'), g2 = newGame('a', 'b');
  const s0 = { ...initialStore(), games: [g1, g2], activeGameId: g1.id };
  const s = deleteGameInStore(s0, g2.id);
  assert.deepEqual(s.games, [g1]);
  assert.equal(s.activeGameId, g1.id);
});

test('updateActiveGame changes only the active game', () => {
  const g1 = newGame('a', 'b'), g2 = newGame('a', 'b');
  const s0 = { ...initialStore(), games: [g1, g2], activeGameId: g2.id };
  const s = updateActiveGame(s0, (g) => applyHandToGame(g, { type: 'knock', winner: 0, points: 12 }));
  assert.equal(s.games[0], g1);
  assert.deepEqual(s.games[1].scores, [12, 0]);
  assert.deepEqual(g2.scores, [0, 0], 'input game is not mutated');
});

test('setDefaultRulesInStore merges over DEFAULT_RULES', () => {
  const s0 = { ...initialStore(), rules: customRules };
  const s = setDefaultRulesInStore(s0, { target: 300 });
  assert.deepEqual(s.rules, { ...DEFAULT_RULES, target: 300 });
});
