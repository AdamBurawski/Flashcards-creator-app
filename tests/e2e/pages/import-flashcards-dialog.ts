import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object Model dla dialogu importu fiszek
 */
export class ImportFlashcardsDialog {
  readonly page: Page;
  readonly dialog: Locator;
  readonly generationSelect: Locator;
  readonly selectAllButton: Locator;
  readonly deselectAllButton: Locator;
  readonly flashcardsList: Locator;
  readonly closeButton: Locator;
  readonly importButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dialog = page.locator('[data-test-id="import-flashcards-dialog"]');
    this.generationSelect = page.locator('[data-test-id="generation-select"]');
    this.selectAllButton = page.locator('[data-test-id="select-all-flashcards"]');
    this.deselectAllButton = page.locator('[data-test-id="deselect-all-flashcards"]');
    this.flashcardsList = page.locator('[data-test-id="flashcards-list"]');
    this.closeButton = page.locator('[data-test-id="close-import-dialog"]');
    this.importButton = page.locator('[data-test-id="import-flashcards-button"]');
    this.errorMessage = page.locator('[data-test-id="import-error-message"]');
  }

  /**
   * Sprawdza czy dialog jest widoczny
   */
  async isVisible() {
    await expect(this.dialog).toBeVisible();
  }

  /**
   * Wybiera sesję generowania z listy rozwijanej
   * @param index Indeks sesji do wyboru (domyślnie pierwsza - 0)
   */
  async selectGeneration(index: number = 0) {
    await this.generationSelect.selectOption({ index });
  }

  /**
   * Zaznacza wszystkie fiszki
   */
  async selectAllFlashcards() {
    await this.selectAllButton.click();
  }

  /**
   * Odznacza wszystkie fiszki
   */
  async deselectAllFlashcards() {
    await this.deselectAllButton.click();
  }

  /**
   * Zaznacza konkretną fiszkę
   * @param id ID fiszki
   */
  async toggleFlashcard(id: number) {
    await this.page.locator(`[data-test-id="flashcard-checkbox-${id}"]`).click();
  }

  /**
   * Klika przycisk importu fiszek
   */
  async import() {
    await this.importButton.click();
  }

  /**
   * Zamyka dialog
   */
  async close() {
    await this.closeButton.click();
  }

  /**
   * Sprawdza czy komunikat o błędzie jest widoczny
   */
  async verifyError() {
    await expect(this.errorMessage).toBeVisible();
  }

  /**
   * Sprawdza czy lista fiszek zawiera elementy
   */
  async verifyFlashcardsExist() {
    await expect(this.flashcardsList).toBeVisible();
    const flashcardItems = this.page.locator('[data-test-id^="flashcard-item-"]');
    const count = await flashcardItems.count();
    expect(count).toBeGreaterThan(0);
  }
} 