// test/unit/rules-schema.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_RULES, LEGACY_RULES, RULE_BOUNDS, withDefaultRules } from '../../src/state.js';

test('RULE_BOUNDS covers every Rule with a min, max and step', () => {
  assert.deepEqual(Object.keys(RULE_BOUNDS).sort(), Object.keys(DEFAULT_RULES).sort());
  for (const [k, b] of Object.entries(RULE_BOUNDS)) {
    for (const f of ['min', 'max', 'step']) {
      assert.ok(Number.isFinite(b[f]), `${k}.${f}`);
    }
    assert.ok(b.min < b.max && b.step > 0, k);
  }
});

for (const [name, set] of [['DEFAULT_RULES', DEFAULT_RULES], ['LEGACY_RULES', LEGACY_RULES]]) {
  test(`every ${name} value lies inside its bounds and on its step`, () => {
    for (const [k, v] of Object.entries(set)) {
      const { min, max, step } = RULE_BOUNDS[k];
      assert.ok(v >= min && v <= max, `${k}=${v} outside [${min}, ${max}]`);
      assert.equal((v - min) % step, 0, `${k}=${v} not on step ${step}`);
    }
  });
}

test('withDefaultRules(undefined) is the defaults', () => {
  assert.deepEqual(withDefaultRules(undefined), DEFAULT_RULES);
});

test('withDefaultRules overrides only the given Rules', () => {
  assert.deepEqual(withDefaultRules({ ginBonus: 30 }), { ...DEFAULT_RULES, ginBonus: 30 });
});

test('withDefaultRules returns a new object', () => {
  assert.notEqual(withDefaultRules(undefined), DEFAULT_RULES);
});
