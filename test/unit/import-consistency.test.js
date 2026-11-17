// test/unit/import-consistency.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  newPlayer, parseImportJSON, DEFAULT_RULES, summaryForGame,
} from '../../src/state.js';

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
