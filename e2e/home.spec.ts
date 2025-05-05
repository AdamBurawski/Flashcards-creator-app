import { test, expect } from '@playwright/test';
import { HomePage } from './page-objects/HomePage';

test.describe('Strona główna', () => {
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    await homePage.goto();
  });

  test('powinna wyświetlić stronę główną z tytułem', async () => {
    await homePage.expectLoaded();
  });

  test('powinna pozwolić na przejście do tworzenia nowej fiszki', async () => {
    await homePage.clickCreateFlashcard();
    // Tutaj możemy dodać sprawdzenie, czy jesteśmy na stronie tworzenia fiszki
    // np. await expect(page).toHaveURL(/.*\/create/);
  });

  test('powinna wyświetlić listę fiszek, jeśli istnieją', async () => {
    // Zakładamy, że lista fiszek jest widoczna na stronie głównej
    await homePage.waitForFlashcardsList();
  });

  // Test z porównaniem wizualnym
  test('powinna być zgodna z oczekiwanym wyglądem', async () => {
    // Pierwszy raz test nie przejdzie, bo nie ma wzorca
    // Po pierwszym uruchomieniu należy zatwierdzić wygenerowany zrzut jako wzorzec
    await homePage.verifyScreenshot();
  });
}); 