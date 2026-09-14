// Regenerates the README screenshots in docs/screenshots/ — `npm run screenshots`.
// Plays a short demo game against the built dist/ using the e2e helpers.
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { chromium, devices } from '@playwright/test';
import { startGame, recordHand } from '../e2e/helpers.js';

const OUT = 'docs/screenshots';
const BASE = 'http://127.0.0.1:4174';
mkdirSync(OUT, { recursive: true });

// esbuild's serve mode exits when stdin closes, so keep it piped.
const server = spawn('npx', ['esbuild', '--servedir=dist', '--serve=127.0.0.1:4174'], { stdio: ['pipe', 'ignore', 'ignore'] });
let browser;

try {
  for (let i = 0; ; i++) {
    try { if ((await fetch(BASE)).ok) break; } catch {}
    if (i > 50) throw new Error('dev server did not start');
    await new Promise((r) => setTimeout(r, 200));
  }

  browser = await chromium.launch();
  const context = await browser.newContext({
    // ponytail: 1× keeps the committed PNGs small; bump for crisper retina shots.
    ...devices['Pixel 5'], deviceScaleFactor: 1, baseURL: BASE, locale: 'en-US', colorScheme: 'dark',
  });
  const page = await context.newPage();
  // Let sheet animations settle before capturing.
  const shot = async (name) => {
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${OUT}/${name}.png` });
  };

  await startGame(page, 'Dennis', 'Theo');
  await recordHand(page, { winner: 'Dennis', outcome: 'Knock', digits: ['2', '3'] });
  await recordHand(page, { winner: 'Theo', outcome: 'Gin', digits: ['3', '1'] });
  await recordHand(page, { winner: 'Dennis', outcome: 'Undercut', digits: ['1', '2'] });
  await shot('game');

  await page.getByRole('button', { name: 'Score this Hand' }).click();
  await page.getByRole('button', { name: 'Dennis' }).click();
  await shot('outcome');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();

  await page.getByRole('button', { name: /Menu/ }).click();
  await page.getByTestId('rule-target').scrollIntoViewIfNeeded();
  await shot('rules');
  await page.getByRole('button', { name: 'Done', exact: true }).click();

  await recordHand(page, { winner: 'Dennis', outcome: 'Knock', digits: ['7', '0'] }); // Dennis passes 100
  await shot('winner');

  await page.getByRole('button', { name: /Home/ }).first().click();
  await startGame(page, 'Ada', 'Jonas'); // typing an existing name would add a duplicate player
  await recordHand(page, { winner: 'Ada', outcome: 'Gin', digits: ['1', '8'] });
  await page.getByRole('button', { name: /Menu/ }).click();
  await page.getByRole('button', { name: /Back to games/ }).click();
  await shot('home');

  await page.getByRole('button', { name: 'Statistics' }).click();
  await shot('stats');
} finally {
  await browser?.close();
  server.kill();
}
