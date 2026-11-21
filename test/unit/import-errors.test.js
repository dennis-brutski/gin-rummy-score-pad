// test/unit/import-errors.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseImportJSON } from '../../src/state.js';

test('invalid JSON returns the importInvalidJson key', () => {
  assert.equal(parseImportJSON('not json').error, 'importInvalidJson');
});

test('a file that is not our backup returns the importBadFormat key', () => {
  assert.equal(parseImportJSON('{"kind":"other"}').error, 'importBadFormat');
});

test('a backup without players or games returns the importMissing key', () => {
  const text = JSON.stringify({ kind: 'gin-rummy-counter.v2', store: {} });
  assert.equal(parseImportJSON(text).error, 'importMissing');
});
