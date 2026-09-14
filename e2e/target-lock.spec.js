import { test, expect } from '@playwright/test';
import { startGame, recordHand } from './helpers.js';

test('target stepper is locked in-game once a hand exists', async ({ page }) => {
  await startGame(page);
  await recordHand(page, { winner: 'Mira', outcome: 'Gin', digits: ['6', '0'] }); // 80 — one −25 tap would "win"
  await page.getByRole('button', { name: /Menu/ }).click();
  const row = page.getByTestId('rule-target');
  await row.scrollIntoViewIfNeeded();
  await expect(row.getByRole('button', { name: '-' })).toBeDisabled();
  await expect(row.getByRole('button', { name: '+' })).toBeDisabled();
  await expect(row.getByText('Locked during play')).toBeVisible();
  // a bonus stepper stays editable
  await expect(page.getByTestId('rule-ginBonus').getByRole('button', { name: '+' })).toBeEnabled();
  // and the game did not end
  await expect(page.getByText(/the winner/i)).not.toBeVisible();
});
