import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  use: { ...devices['Pixel 5'], baseURL: 'http://127.0.0.1:4173' },
  webServer: {
    command: 'npx esbuild --servedir=dist --serve=127.0.0.1:4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: true,
  },
});
