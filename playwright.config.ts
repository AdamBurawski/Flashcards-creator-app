import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });

/**
 * Konfiguracja Playwright dla testów e2e
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  // Uruchamianie tylko w Chromium, zgodnie z wytycznymi
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Serwer deweloperski, który będzie uruchamiany podczas testów
  webServer: {
    command: 'npm run dev -- --env-file .env.test',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    env: {
      ...process.env, // Przekazuje wszystkie zmienne środowiskowe
      ASTRO_ENV: 'test', // Możesz dodać dodatkowe zmienne
    },
    stdout: 'pipe',
    stderr: 'pipe',
  },
}); 