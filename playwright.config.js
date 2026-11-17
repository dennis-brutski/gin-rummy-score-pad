import { defineConfig, devices } from '@playwright/test';

// E2E_PORT lets several checkouts run the suite at once (the software factory
// sets it); with it set, a server already on that port is never reused.
const port = process.env.E2E_PORT || 4173;
const url = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: 'e2e',
  use: {
    ...devices['Pixel 5'],
    baseURL: url,
    // Chromium cannot nest its own sandbox inside the factory's agent sandbox.
    launchOptions: { args: process.env.PW_CHROMIUM_NO_SANDBOX ? ['--no-sandbox'] : [] },
  },
  webServer: {
    command: `npx esbuild --servedir=dist --serve=127.0.0.1:${port}`,
    url,
    reuseExistingServer: !process.env.E2E_PORT,
  },
});
