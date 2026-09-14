import { test, expect } from '@playwright/test';
import { startGame, recordHand } from './helpers.js';

test('happy path: three hands to a finished game with correct tally', async ({ page }) => {
  await startGame(page);
  await recordHand(page, { winner: 'Mira', outcome: 'Knock', digits: ['2', '0'] }); // 20
  await recordHand(page, { winner: 'Theo', outcome: 'Gin', digits: ['3', '0'] });   // 50
  // "50" also matches the ledger row's "+50" and running-total "(50)" buttons;
  // .first() resolves to the scoreboard total (exact "50" div), keeping the
  // asserted value unchanged.
  await expect(page.getByText('50').first()).toBeVisible();
  await recordHand(page, { winner: 'Mira', outcome: 'Knock', digits: ['9', '0'] }); // 110 → win
  await expect(page.getByText(/the winner/i)).toBeVisible();
  // Final tally: 110 board + 100 game + 2 boxes × 20 = 250; loser 50 + 20 = 70
  await expect(page.getByText('250').first()).toBeVisible();
  await expect(page.getByText('70').first()).toBeVisible();
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
