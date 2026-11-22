import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  newGame, applyHandToGame, applyRulesToGame, recomputeGame, runningTotals,
} from '../../src/state.js';

const withoutTime = ({ updatedAt, ...rest }) => rest;

test('runningTotals gives the running score after each hand', () => {
  let g = newGame('a', 'b');                                         // gin bonus 20
  g = applyHandToGame(g, { type: 'knock', winner: 0, points: 10 });  // a: 10
  g = applyHandToGame(g, { type: 'gin',   winner: 1, points: 7 });   // b: 27
  g = applyHandToGame(g, { type: 'knock', winner: 0, points: 4 });   // a: 14
  assert.deepEqual(runningTotals(g), [[10, 0], [10, 27], [14, 27]]);
});

test('runningTotals of a game with no hands is empty', () => {
  assert.deepEqual(runningTotals(newGame('a', 'b')), []);
});

test('applyHandToGame agrees with recomputeGame, through a tie over the target', () => {
  let g = newGame('a', 'b');                                         // target 100
  for (const hand of [
    { type: 'knock', winner: 0, points: 60 },  // a: 60
    { type: 'knock', winner: 1, points: 50 },  // b: 50
    { type: 'knock', winner: 1, points: 30 },  // b: 80
  ]) {
    g = applyHandToGame(g, hand);
    assert.deepEqual(withoutTime(g), withoutTime(recomputeGame(g)));
  }
  g = applyRulesToGame(g, { ...g.rules, target: 50 });
  g = applyHandToGame(g, { type: 'knock', winner: 0, points: 20 });  // 80 : 80, over 50
  assert.equal(g.phase, 'playing');
  assert.equal(g.winner, null);
  assert.deepEqual(withoutTime(g), withoutTime(recomputeGame(g)));

  g = applyHandToGame(g, { type: 'knock', winner: 1, points: 3 });   // 80 : 83
  assert.equal(g.phase, 'finished');
  assert.equal(g.winner, 1);
  assert.deepEqual(withoutTime(g), withoutTime(recomputeGame(g)));
});
