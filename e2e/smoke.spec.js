import { test, expect } from '@playwright/test';

// Visits every screen; any missing import in the port throws a runtime
// ReferenceError which this test surfaces via pageerror.
test('all screens render without runtime errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto('/');
  await expect(page.getByText('Gin Rummy')).toBeVisible();          // home masthead

  await page.getByRole('button', { name: 'Statistics' }).click();   // stats (empty state)
  // store.view persists to localStorage on every change (state.js loadStore
  // honors a saved view verbatim), so a browser-history goBack + reload
  // re-enters Stats rather than Home; use the screen's own back control.
  await page.getByRole('button', { name: /Home/ }).click();
  await page.goto('/');

  await page.getByRole('button', { name: 'New Game' }).click();     // setup
  await page.getByPlaceholder('Type a name…').nth(0).fill('Mira');
  await page.getByPlaceholder('Type a name…').nth(1).fill('Theo');
  await page.getByRole('button', { name: 'Deal the Cards' }).click(); // game

  await page.getByRole('button', { name: 'Score this Hand' }).click(); // ScoreSheet step 1
  await page.getByRole('button', { name: 'Mira' }).click();            // step 2 (outcomes render)
  // OutcomeCard buttons render ornament+label+blurb+chevron as one
  // accessible name (e.g. "♠ Gin Went out with zero deadwood. +25 bonus. ›"),
  // so an exact "Gin"/"Knock" name never matches; match a unique substring.
  await expect(page.getByRole('button', { name: /♠ Gin/ })).toBeVisible();
  await page.getByRole('button', { name: /♣ Knock/ }).click(); // step 3 (keypad)
  await expect(page.getByRole('button', { name: 'Record Hand' })).toBeVisible();

  await page.goto('/');                                             // back to home (game persists)
  await page.getByRole('button', { name: /Menu/ }).click().catch(() => {});

  expect(errors).toEqual([]);
});
