import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dict, resolveLocale, makeT, pluralRu, LANGUAGES } from '../../src/i18n.js';

test('resolveLocale honours explicit supported codes and falls back to en', () => {
  assert.equal(resolveLocale('de'), 'de');
  assert.equal(resolveLocale('xx'), 'en');
});

test('makeT translates, falls back to English, then to the raw key', () => {
  const t = makeT('de');
  assert.equal(t('newGame'), 'Neues Spiel');
  assert.equal(makeT('en')('newGame'), 'New Game');
  assert.equal(t('definitely-not-a-key'), 'definitely-not-a-key');
});

test('function entries receive arguments', () => {
  const t = makeT('en');
  assert.match(t('nHands', 1), /1 hand$/);
  assert.match(t('nHands', 2), /2 hands$/);
});

test('pluralRu picks one/few/many buckets', () => {
  assert.equal(pluralRu(1, 'one', 'few', 'many'), 'one');
  assert.equal(pluralRu(2, 'one', 'few', 'many'), 'few');
  assert.equal(pluralRu(5, 'one', 'few', 'many'), 'many');
  assert.equal(pluralRu(11, 'one', 'few', 'many'), 'many');
});

test('every locale key exists in the English dictionary', () => {
  const en = new Set(Object.keys(dict.en));
  for (const { code } of LANGUAGES) {
    for (const key of Object.keys(dict[code])) {
      assert.ok(en.has(key), `dict.${code}.${key} missing from dict.en`);
    }
  }
});
