// test/unit/scoring.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, applyHandToGame, LEGACY_RULES, DEFAULT_RULES } from '../../src/state.js';

const fresh = () => newGame('a', 'b');

test('knock scores raw points, no bonus', () => {
  const g = applyHandToGame(fresh(), { type: 'knock', winner: 0, points: 10 });
  assert.deepEqual(g.scores, [10, 0]);
  assert.deepEqual(g.boxes, [1, 0]);
  assert.equal(g.hands[0].totalThisHand, 10);
  assert.equal(g.hands[0].deal, 1);
  assert.equal(g.deal, 2);
  assert.equal(g.phase, 'playing');
  assert.equal(g.winner, null);
});

test('gin adds ginBonus (20)', () => {
  const g = applyHandToGame(fresh(), { type: 'gin', winner: 0, points: 20 });
  assert.equal(g.hands[0].totalThisHand, 40);
  assert.deepEqual(g.scores, [40, 0]);
});

test('longGin adds longGinBonus (25)', () => {
  const g = applyHandToGame(fresh(), { type: 'longGin', winner: 1, points: 20 });
  assert.equal(g.hands[0].totalThisHand, 45);
  assert.deepEqual(g.scores, [0, 45]);
});

test('undercut adds undercutBonus (10)', () => {
  const g = applyHandToGame(fresh(), { type: 'undercut', winner: 1, points: 15 });
  assert.equal(g.hands[0].totalThisHand, 25);
});

test('legacy rules use undercut +10', () => {
  const g = applyHandToGame(newGame('a', 'b', LEGACY_RULES), { type: 'undercut', winner: 0, points: 15 });
  assert.equal(g.hands[0].totalThisHand, 25);
});

test('custom ginBonus is honoured', () => {
  const g = applyHandToGame(newGame('a', 'b', { ...DEFAULT_RULES, ginBonus: 50 }), { type: 'gin', winner: 0, points: 20 });
  assert.equal(g.hands[0].totalThisHand, 70);
});

test('game finishes at >= target with higher scorer as winner', () => {
  let g = fresh();
  g = applyHandToGame(g, { type: 'knock', winner: 0, points: 98 });
  assert.equal(g.phase, 'playing');
  g = applyHandToGame(g, { type: 'knock', winner: 1, points: 50 });
  g = applyHandToGame(g, { type: 'knock', winner: 0, points: 10 }); // 108
  assert.equal(g.phase, 'finished');
  assert.equal(g.winner, 0);
  assert.deepEqual(g.scores, [108, 50]);
});

test('99 points does not finish', () => {
  const g = applyHandToGame(fresh(), { type: 'knock', winner: 0, points: 99 });
  assert.equal(g.phase, 'playing');
});
