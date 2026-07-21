import { test, expect } from '@playwright/test';
import { startGame } from './helpers.js';

test('app loads and keeps data while offline', async ({ page, context }) => {
  await startGame(page);                       // also installs the service worker
  await page.evaluate(() => navigator.serviceWorker.ready);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Score this Hand' })).toBeVisible();
  await context.setOffline(false);
});
