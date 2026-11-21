import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, applyHandToGame, undoLastHand } from '../../src/state.js';

test('undo stays finished when the remaining hands are still over the target', () => {
  let g = newGame('a', 'b');                                         // target 100
  g = applyHandToGame(g, { type: 'knock', winner: 0, points: 110 }); // a: 110, finished
  g = applyHandToGame(g, { type: 'knock', winner: 1, points: 5 });   // b: 5
  g = undoLastHand(g);
  assert.deepEqual(g.scores, [110, 0]);
  assert.deepEqual(g.boxes, [1, 0]);
  assert.equal(g.hands.length, 1);
  assert.equal(g.deal, 2);
  assert.equal(g.phase, 'finished');
  assert.equal(g.winner, 0);
});
