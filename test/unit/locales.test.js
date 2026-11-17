import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LOCALE_CODES } from '../../src/state.js';
import { LANGUAGES } from '../../src/i18n.js';

test('state.js locale codes match the languages in i18n.js', () => {
  assert.deepEqual(LOCALE_CODES, LANGUAGES.map((l) => l.code));
});
