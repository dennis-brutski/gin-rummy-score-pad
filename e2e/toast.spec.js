import { test, expect } from '@playwright/test';

// Each toast stays up for 2.8 s. A second toast shown before the first one
// expires must get its full time, not be hidden by the first toast's timer.
test('a second toast stays up its full time after a quick first one', async ({ page }) => {
  await page.clock.install();
  await page.goto('/');

  const fileInput = page.locator('input[type="file"]');
  const pick = (name, text) => fileInput.setInputFiles({
    name, mimeType: 'application/json', buffer: Buffer.from(text),
  });

  await pick('broken.json', 'not json');
  const first = page.getByText("That doesn't look like a valid backup file.");
  await expect(first).toBeVisible();

  await page.clock.runFor(1500);
  await pick('other.json', '{}');
  const second = page.getByText("This file isn't a Gin Rummy Counter backup.");
  await expect(second).toBeVisible();

  // 2 s after the second toast: past the first toast's 2.8 s, within the second's.
  await page.clock.runFor(2000);
  await expect(second).toBeVisible();

  await page.clock.runFor(1000);
  await expect(second).toBeHidden();
});
