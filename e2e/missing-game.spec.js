import { test, expect } from '@playwright/test';

// A stored view of 'game' whose activeGameId points at no game must land on
// Home, without React complaining about state updates during render.
test('a missing active game redirects to Home without React errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });

  await page.addInitScript(() => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('gr-counter.v2', JSON.stringify({
      players: [], games: [], view: 'game', activeGameId: 'no-such-game',
    }));
  });
  await page.goto('/');

  await expect(page.getByRole('button', { name: 'New Game' })).toBeVisible();
  await expect.poll(() => page.evaluate(() =>
    JSON.parse(localStorage.getItem('gr-counter.v2')))).toMatchObject({ view: 'home', activeGameId: null });
  expect(errors).toEqual([]);
});
