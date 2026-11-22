// test/unit/hand-validity.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isValidHand, MAX_HAND_POINTS, handTotal, DEFAULT_RULES } from '../../src/state.js';

test('MAX_HAND_POINTS is 98', () => {
  assert.equal(MAX_HAND_POINTS, 98);
});

test('a knock of 0 is invalid', () => {
  assert.equal(isValidHand('knock', 0), false);
});

test('a gin of 0 is valid', () => {
  assert.equal(isValidHand('gin', 0), true);
});

test('a long gin of 0 is invalid', () => {
  assert.equal(isValidHand('longGin', 0), false);
});

test('an undercut of 5 is valid', () => {
  assert.equal(isValidHand('undercut', 5), true);
});

test('98 points is valid', () => {
  assert.equal(isValidHand('knock', 98), true);
  assert.equal(isValidHand('gin', 98), true);
});

test('99 points is invalid', () => {
  assert.equal(isValidHand('knock', 99), false);
  assert.equal(isValidHand('gin', 99), false);
});

test('-1 points is invalid', () => {
  assert.equal(isValidHand('knock', -1), false);
  assert.equal(isValidHand('gin', -1), false);
});

test('handTotal is exported and adds the bonus for the type', () => {
  const r = { ...DEFAULT_RULES, ginBonus: 25, longGinBonus: 31, undercutBonus: 15 };
  assert.equal(handTotal(r, 'knock', 10), 10);
  assert.equal(handTotal(r, 'gin', 10), 35);
  assert.equal(handTotal(r, 'longGin', 10), 41);
  assert.equal(handTotal(r, 'undercut', 10), 25);
});
