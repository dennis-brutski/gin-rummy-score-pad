// test/unit/stats.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  newGame, applyHandToGame, computeStats, computeHeadToHead, renamePlayerInStore,
} from '../../src/state.js';

const P = (id, name) => ({ id, name, createdAt: 1 });

// Finished game where p0 wins with a longGin and a knock; p1 wins one undercut.
function finishedGame(p0 = 'pa', p1 = 'pb', createdAt = 1) {
  let g = { ...newGame(p0, p1), createdAt };
  g = applyHandToGame(g, { type: 'longGin', winner: 0, points: 40 }); // 65
  g = applyHandToGame(g, { type: 'undercut', winner: 1, points: 10 }); // 35
  g = applyHandToGame(g, { type: 'knock', winner: 0, points: 50 });   // 115, finished
  return g;
}

test('computeStats counts wins, hands, gins, undercuts, biggest hand', () => {
  const store = { players: [P('pa', 'A'), P('pb', 'B')], games: [finishedGame()] };
  const s = computeStats(store);
  assert.equal(s.pa.wins, 1);
  assert.equal(s.pa.gamesPlayed, 1);
  assert.equal(s.pa.handsWon, 2);
  assert.equal(s.pa.handsPlayed, 3);
  assert.equal(s.pa.gins, 1);       // longGin counts as a gin
  assert.equal(s.pa.longGins, 1);
  assert.equal(s.pa.knocks, 1);
  assert.equal(s.pa.biggestHand, 65);
  assert.equal(s.pb.wins, 0);
  assert.equal(s.pb.undercuts, 1);
});

test('in-progress games count hands but not wins', () => {
  const g = applyHandToGame(newGame('pa', 'pb'), { type: 'knock', winner: 0, points: 5 });
  const s = computeStats({ players: [P('pa', 'A'), P('pb', 'B')], games: [g] });
  assert.equal(s.pa.gamesPlayed, 0);
  assert.equal(s.pa.handsWon, 1);
});

test('currentStreak counts consecutive recent wins', () => {
  const store = {
    players: [P('pa', 'A'), P('pb', 'B')],
    games: [finishedGame('pa', 'pb', 1), finishedGame('pa', 'pb', 2), finishedGame('pb', 'pa', 3)],
  };
  const s = computeStats(store);
  // most recent game (createdAt 3): p0='pb' wins → pb streak 1, pa streak broken
  assert.equal(s.pb.currentStreak, 1);
  assert.equal(s.pa.currentStreak, 0);
});

test('computeHeadToHead tallies pairs with id-sorted key', () => {
  const store = {
    players: [P('pa', 'A'), P('pb', 'B')],
    games: [finishedGame('pa', 'pb', 1), finishedGame('pb', 'pa', 2)],
  };
  const h = computeHeadToHead(store);
  const e = h['pa|pb'];
  assert.equal(e.total, 2);
  assert.deepEqual(e.wins, [1, 1]); // each won one as p0
});

test('renamePlayerInStore trims, caps at 24 chars, rejects empty', () => {
  const store = { players: [P('pa', 'A')], games: [] };
  assert.equal(renamePlayerInStore(store, 'pa', '  New Name  ').players[0].name, 'New Name');
  assert.equal(renamePlayerInStore(store, 'pa', 'x'.repeat(40)).players[0].name.length, 24);
  assert.equal(renamePlayerInStore(store, 'pa', '   ').players[0].name, 'A');
});
