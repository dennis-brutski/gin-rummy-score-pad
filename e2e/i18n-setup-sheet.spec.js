import { test, expect } from '@playwright/test';

// The winner eyebrow on the score sheet and the roster remove button's
// tooltip used to be hard-coded English; in German they must be German.
test.use({ locale: 'de-DE' });

test('roster remove button tooltip is translated', async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('gr-counter.v2', JSON.stringify({
      players: [{ id: 'p_ana', name: 'Ana', createdAt: 1 }],
      games: [], view: 'home', activeGameId: null,
    }));
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Neues Spiel' }).click();
  await page.getByRole('button', { name: 'Verwalten' }).click();

  const remove = page.getByTitle('Aus der Liste entfernen');
  await expect(remove).toBeVisible();
  await remove.click();
  await expect(page.getByTitle('Zum Entfernen erneut tippen')).toBeVisible();
});

test('score sheet winner eyebrow is translated', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Neues Spiel' }).click();
  await page.getByPlaceholder('Name eingeben…').nth(0).fill('Mira');
  await page.getByPlaceholder('Name eingeben…').nth(1).fill('Theo');
  await page.getByRole('button', { name: 'Karten geben' }).click();
  await page.getByRole('button', { name: 'Runde eintragen' }).click();

  await expect(page.getByText('Sieger', { exact: true })).toHaveCount(2);
  await expect(page.getByText('Winner', { exact: true })).toHaveCount(0);
});
