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
  g = applyHandToGame(g, { type: 'gin', winner: 1, points: 30 });   // b 50
  g = applyHandToGame(g, { type: 'knock', winner: 0, points: 90 }); // a 110 → finished
  assert.equal(g.phase, 'finished');
  assert.equal(g.winner, 0);

  g = undoLastHand(g);                                             // "wait, that wasn't right"
  assert.equal(g.phase, 'playing');
  assert.deepEqual(g.scores, [20, 50]);

  g = editHandInGame(g, g.hands[1].id, { type: 'knock' });         // gin → knock: 50 → 30
  assert.deepEqual(g.scores, [20, 30]);

  g = applyHandToGame(g, { type: 'gin', winner: 1, points: 98 });  // b 30+118=148 → finished
  assert.equal(g.winner, 1);
  const s = summaryForGame(g);
  assert.deepEqual(s.finals, [20 + 20, 148 + 100 + 2 * 20]);       // [40, 288]
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
  let g = applyHandToGame(newGame('a', 'b'), { type: 'undercut', winner: 1, points: 10 }); // 20
  g = applyRulesToGame(g, { ...DEFAULT_RULES, undercutBonus: 50 });
  assert.deepEqual(g.scores, [0, 60]);
  assert.equal(g.phase, 'playing');
});
