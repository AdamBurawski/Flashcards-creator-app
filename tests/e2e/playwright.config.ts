import { type PlaywrightTestConfig, devices } from "@playwright/test";

/**
 * Konfiguracja testów e2e dla Playwright
 * @see https://playwright.dev/docs/test-configuration
 */
const config: PlaywrightTestConfig = {
  // Ustawienie katalogu testów
  testDir: "./",
  // Maksymalny czas oczekiwania na zakończenie testu
  timeout: 30000,
  // Zgłaszaj wyniki testów na bieżąco
  reporter: "html",
  // Tylko testy z adnotacją @smoke
  // grep: /@smoke/,

  // Uruchom testy w trybie równoległym
  fullyParallel: true,
  // Limit wystąpień równoległych
  workers: process.env.CI ? 1 : undefined,

  // Katalog na artefakty testów (zrzuty ekranu, śledzenie, wideo)
  outputDir: "./test-results",

  // Wspólne ustawienia dla wszystkich projektów
  use: {
    // Maksymalny czas oczekiwania na operacje
    actionTimeout: 5000,
    // Zrzut ekranu przy niepowodzeniu
    screenshot: "only-on-failure",
    // Nagrywanie wideo przy niepowodzeniu
    video: "on-first-retry",
    // Śledzenie dla debugowania
    trace: "retain-on-failure",
    // Ustawienie headless
    headless: !!process.env.CI,
    // Podstawowy URL aplikacji
    baseURL: "http://localhost:3000",
    // Wybór stałych lokalizatorów
    testIdAttribute: "data-test-id",
    // Łapanie wszystkich żądań sieciowych
    contextOptions: {
      recordHar: {
        path: "./test-results/network-logs.har",
        omitContent: true,
      },
    },
  },

  // Konfiguracja projektów testowych - tylko Chrome/Chromium
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Użyj zewnętrznych narzędzi deweloperskich
        launchOptions: { devtools: true },
      },
    },
  ],
};

export default config;
