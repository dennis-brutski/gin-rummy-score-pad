import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  newGame, applyHandToGame, undoLastHand, recomputeGame,
  editHandInGame, deleteHandInGame, dealerOf, newPlayer, applyRulesToGame,
} from '../../src/state.js';

const played = () => {
  let g = newGame('a', 'b');
  g = applyHandToGame(g, { type: 'knock', winner: 0, points: 20 });
  g = applyHandToGame(g, { type: 'gin', winner: 1, points: 30 });   // b: 50
  g = applyHandToGame(g, { type: 'knock', winner: 0, points: 15 }); // a: 35
  return g;
};

test('undo reverts last hand, scores, boxes, deal', () => {
  const g = undoLastHand(played());
  assert.deepEqual(g.scores, [20, 50]);
  assert.deepEqual(g.boxes, [1, 1]);
  assert.equal(g.hands.length, 2);
  assert.equal(g.deal, 3);
});

test('undo on empty game is a no-op', () => {
  const g = newGame('a', 'b');
  assert.equal(undoLastHand(g), g);
});

test('undo after game end returns to playing', () => {
  let g = applyHandToGame(newGame('a', 'b'), { type: 'gin', winner: 0, points: 98 }); // 123, finished
  assert.equal(g.phase, 'finished');
  g = undoLastHand(g);
  assert.equal(g.phase, 'playing');
  assert.equal(g.winner, null);
  assert.deepEqual(g.scores, [0, 0]);
});

test('recomputeGame reproduces incremental totals', () => {
  const g = played();
  const r = recomputeGame(g);
  assert.deepEqual(r.scores, g.scores);
  assert.deepEqual(r.boxes, g.boxes);
  assert.equal(r.deal, g.deal);
  assert.equal(r.phase, g.phase);
});

test('editHandInGame rederives total and recomputes', () => {
  const g = played();
  const h = g.hands[1]; // gin 30 → 55
  const e = editHandInGame(g, h.id, { type: 'knock' });
  assert.equal(e.hands[1].totalThisHand, 30);
  assert.equal(e.hands[1].edited, true);
  assert.deepEqual(e.scores, [35, 30]);
});

test('edit can finish a playing game', () => {
  const g = played(); // [35, 55]
  const e = editHandInGame(g, g.hands[2].id, { points: 98 }); // a: 20+98=118
  assert.equal(e.phase, 'finished');
  assert.equal(e.winner, 0);
});

test('edit can un-finish a finished game', () => {
  let g = applyHandToGame(newGame('a', 'b'), { type: 'gin', winner: 0, points: 98 });
  g = editHandInGame(g, g.hands[0].id, { points: 10 }); // 35 < 100
  assert.equal(g.phase, 'playing');
  assert.equal(g.winner, null);
});

test('deleteHandInGame renumbers deals and recomputes', () => {
  const g = played();
  const d = deleteHandInGame(g, g.hands[1].id);
  assert.equal(d.hands.length, 2);
  assert.deepEqual(d.hands.map((h) => h.deal), [1, 2]);
  assert.deepEqual(d.scores, [35, 0]);
  assert.equal(d.deal, 3);
});

test('dealerOf alternates from dealerStart', () => {
  const g = { ...newGame('a', 'b'), dealerStart: 0, deal: 1 };
  assert.equal(dealerOf(g), 0);
  assert.equal(dealerOf({ ...g, deal: 2 }), 1);
  assert.equal(dealerOf({ ...g, deal: 3 }), 0);
});

test('newPlayer caps the name at 24 characters', () => {
  assert.equal(newPlayer('  ' + 'x'.repeat(30) + '  ').name, 'x'.repeat(24));
  assert.equal(newPlayer('Mira').name, 'Mira');
});

const tiedAt60 = () => {
  let g = newGame('a', 'b');
  g = applyHandToGame(g, { type: 'knock', winner: 0, points: 60 });
  g = applyHandToGame(g, { type: 'knock', winner: 1, points: 60 });
  return g;
};

test('a tie at or over the target does not finish the game', () => {
  const g = applyRulesToGame(tiedAt60(), { target: 50 });
  assert.deepEqual(g.scores, [60, 60]);
  assert.equal(g.phase, 'playing');
  assert.equal(g.winner, null);
});

test('a scoreless hand on a tie over the target keeps the game going', () => {
  let g = applyRulesToGame(tiedAt60(), { target: 50 });
  g = applyHandToGame(g, { type: 'knock', winner: 1, points: 0 });
  assert.deepEqual(g.scores, [60, 60]);
  assert.equal(g.phase, 'playing');
  assert.equal(g.winner, null);
});

test('the next scoring hand after a tie decides the game', () => {
  let g = applyRulesToGame(tiedAt60(), { target: 50 });
  g = applyHandToGame(g, { type: 'knock', winner: 0, points: 5 });
  assert.equal(g.phase, 'finished');
  assert.equal(g.winner, 0);
});
