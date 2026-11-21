import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dict, LANGUAGES } from '../../src/i18n.js';

test('roster remove tooltips exist in every locale', () => {
  for (const { code } of LANGUAGES) {
    for (const key of ['removeFromRoster', 'tapAgainToRemove']) {
      assert.equal(typeof dict[code][key], 'string', `dict.${code}.${key}`);
      assert.ok(dict[code][key].length > 0, `dict.${code}.${key} is empty`);
    }
  }
});
