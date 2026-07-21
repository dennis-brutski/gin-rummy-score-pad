import { test, expect } from '@playwright/test';
import { startGame, recordHand } from './helpers.js';

test('happy path: three hands to a finished game with correct tally', async ({ page }) => {
  await startGame(page);
  await recordHand(page, { winner: 'Mira', outcome: 'Knock', digits: ['2', '0'] }); // 20
  await recordHand(page, { winner: 'Theo', outcome: 'Gin', digits: ['3', '0'] });   // 55
  // "55" also matches the ledger row's "+55" and running-total "(55)" buttons;
  // .first() resolves to the scoreboard total (exact "55" div), keeping the
  // asserted value unchanged.
  await expect(page.getByText('55').first()).toBeVisible();
  await recordHand(page, { winner: 'Mira', outcome: 'Knock', digits: ['9', '0'] }); // 110 → win
  await expect(page.getByText(/the winner/i)).toBeVisible();
  // Final tally: 110 board + 100 game + 2 boxes × 25 = 260; loser 55 + 25 = 80
  await expect(page.getByText('260').first()).toBeVisible();
  await expect(page.getByText('80').first()).toBeVisible();
});

test('editing a ledger hand updates the score', async ({ page }) => {
  await startGame(page);
  await recordHand(page, { winner: 'Mira', outcome: 'Knock', digits: ['2', '0'] });
  await page.getByText('+20').click();                       // ledger row → EditHandSheet
  await page.getByRole('button', { name: 'C', exact: true }).click();
  await page.getByRole('button', { name: '3', exact: true }).click();
  await page.getByRole('button', { name: '5', exact: true }).click();
  await page.getByRole('button', { name: 'Save Changes' }).click();
  // "35" also matches the ledger row's "+35" and running-total "(35)" buttons;
  // .first() resolves to the scoreboard total (exact "35" div).
  await expect(page.getByText('35').first()).toBeVisible();
  await expect(page.getByText('+35')).toBeVisible();
});

test('undo removes the last hand', async ({ page }) => {
  await startGame(page);
  await recordHand(page, { winner: 'Mira', outcome: 'Knock', digits: ['2', '0'] });
  await expect(page.getByText('+20')).toBeVisible();
  await page.getByRole('button', { name: /Undo/ }).click();
  await expect(page.getByText('+20')).not.toBeVisible();
});
