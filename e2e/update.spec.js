import { test, expect } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { startGame } from './helpers.js';

const SW = 'dist/sw.js';

test('a new deploy shows an update toast and reloads into it', async ({ page }) => {
  await startGame(page);
  await page.waitForFunction(() => navigator.serviceWorker.controller);

  const original = readFileSync(SW, 'utf8');
  expect(original).toMatch(/const CACHE = 'gr-[0-9a-f]{12}'/); // build.mjs stamped a version
  try {
    // Simulate a deploy: a new build changes the cache name inside sw.js.
    writeFileSync(SW, original.replace(/const CACHE = '[^']*'/, "const CACHE = 'gr-test-update'"));
    await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update());

    await expect(page.getByText('New version available')).toBeVisible();
    await Promise.all([
      page.waitForEvent('framenavigated'),
      page.getByRole('button', { name: 'Reload' }).click(),
    ]);

    await expect(page.getByRole('button', { name: 'Score this Hand' })).toBeVisible(); // game survived
    await expect(page.getByText('New version available')).not.toBeVisible();
    expect(await page.evaluate(() => caches.keys())).toEqual(['gr-test-update']);
  } finally {
    writeFileSync(SW, original);
  }
});
