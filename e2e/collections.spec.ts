import { test, expect } from "@playwright/test";
import { LoginPage } from "./page-objects/LoginPage";
import { CollectionsPage } from "./page-objects/CollectionsPage";

// Pobierz dane logowania z zmiennych środowiskowych
const E2E_USERNAME = process.env.E2E_USERNAME || "test@wp.pl";
const E2E_PASSWORD = process.env.E2E_PASSWORD || "test123";

// Test dla zarządzania kolekcjami
test.describe("Collections Management", () => {
  let loginPage: LoginPage;
  let collectionsPage: CollectionsPage;

  test.beforeEach(async ({ page }) => {
    // Inicjalizacja Page Objects
    loginPage = new LoginPage(page);
    collectionsPage = new CollectionsPage(page);
  });

  test("should create a new collection", async ({ page }) => {
    // Logowanie użytkownika
    await loginPage.goto();
    await loginPage.login(E2E_USERNAME, E2E_PASSWORD);

    // Poczekaj na przekierowanie po zalogowaniu
    await page.waitForURL("/collections");
    await collectionsPage.expectLoaded();

    // Tworzenie nowej kolekcji
    await collectionsPage.openCreateCollectionForm();
    await collectionsPage.fillCollectionForm("Test Collection", "This is a test collection created by Playwright");
    await collectionsPage.saveCollection();

    // Dłuższe oczekiwanie na aktualizację DOM
    console.log("Czekam 5 sekund na aktualizację DOM po utworzeniu kolekcji...");
    await page.waitForTimeout(5000);

    // Sprawdź czy utworzono kolekcję
    await collectionsPage.expectCollectionExists("Test Collection");
  });

  test("should show error when creating collection with empty name", async ({ page }) => {
    // Logowanie użytkownika
    await loginPage.goto();
    await loginPage.login(E2E_USERNAME, E2E_PASSWORD);

    // Poczekaj na przekierowanie po zalogowaniu
    await page.waitForURL("/collections");
    await collectionsPage.expectLoaded();

    // Próba utworzenia kolekcji bez nazwy
    await collectionsPage.openCreateCollectionForm();
    await collectionsPage.fillCollectionForm("", "Description without name");
    await collectionsPage.saveCollection();

    // Sprawdź czy pojawił się komunikat o błędzie
    await collectionsPage.expectFormError();
  });
});
