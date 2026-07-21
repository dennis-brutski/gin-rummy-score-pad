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
