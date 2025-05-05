import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object dla strony głównej 
 * Implementacja wzorca Page Object do testów E2E
 */
export class HomePage {
  readonly page: Page;
  readonly heading: Locator;
  readonly createFlashcardButton: Locator;
  readonly flashcardsList: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { level: 1 });
    this.createFlashcardButton = page.getByRole('button', { name: /utwórz fiszkę/i });
    this.flashcardsList = page.getByTestId('flashcards-list');
  }

  /**
   * Nawigacja do strony głównej
   */
  async goto() {
    await this.page.goto('/');
  }

  /**
   * Sprawdzenie, czy strona główna została załadowana
   */
  async expectLoaded() {
    await expect(this.heading).toBeVisible();
    await expect(this.page).toHaveTitle(/Flashcards Creator/);
  }

  /**
   * Kliknięcie przycisku tworzenia nowej fiszki
   */
  async clickCreateFlashcard() {
    await this.createFlashcardButton.click();
  }

  /**
   * Oczekiwanie na wyświetlenie listy fiszek
   */
  async waitForFlashcardsList() {
    await expect(this.flashcardsList).toBeVisible();
  }

  /**
   * Sprawdzenie zrzutu ekranu strony głównej
   */
  async verifyScreenshot() {
    await expect(this.page).toHaveScreenshot('home-page.png');
  }
} 