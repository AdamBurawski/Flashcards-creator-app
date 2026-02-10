import { Page, Locator, expect } from "@playwright/test";

/**
 * Page Object dla strony kolekcji
 * Implementacja wzorca Page Object do testów E2E
 */
export class CollectionsPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly createCollectionButton: Locator;
  readonly collectionsList: Locator;
  readonly collectionForm: Locator;
  readonly nameInput: Locator;
  readonly descriptionInput: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly formError: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: /kolekcje/i });
    this.createCollectionButton = page.locator('[data-test-id="collection-save-button"]');
    this.collectionsList = page.locator('[data-test-id="collections-list"]');
    this.collectionForm = page.locator('[data-test-id="collection-form"]');
    this.nameInput = page.locator('[data-test-id="collection-name-input"]');
    this.descriptionInput = page.locator('[data-test-id="collection-description-input"]');
    this.saveButton = page.locator('[data-test-id="collection-save-button"]');
    this.cancelButton = page.locator('[data-test-id="collection-cancel-button"]');
    this.formError = page.locator('[data-test-id="collection-form-error"]');
  }

  /**
   * Nawigacja do strony kolekcji
   */
  async goto() {
    await this.page.goto("/collections");
  }

  /**
   * Sprawdzenie, czy strona kolekcji została załadowana
   */
  async expectLoaded() {
    await expect(this.heading).toBeVisible();
    await expect(this.page).toHaveURL(/\/collections/);
  }

  /**
   * Otwiera formularz tworzenia nowej kolekcji
   */
  async openCreateCollectionForm() {
    await this.createCollectionButton.click();
    await this.collectionForm.waitFor();
  }

  /**
   * Wypełnia formularz kolekcji
   */
  async fillCollectionForm(name: string, description: string) {
    await this.nameInput.fill(name);
    await this.descriptionInput.fill(description);
  }

  /**
   * Zapisuje kolekcję
   */
  async saveCollection() {
    await this.saveButton.click();
  }

  /**
   * Anuluje tworzenie kolekcji
   */
  async cancelCollection() {
    await this.cancelButton.click();
  }

  /**
   * Sprawdza czy kolekcja o podanej nazwie istnieje na liście
   */
  async expectCollectionExists(name: string) {
    const collection = this.page.locator(`text=${name}`).first();
    await expect(collection).toBeVisible();
  }

  /**
   * Sprawdza czy formularz pokazuje błąd
   */
  async expectFormError() {
    await expect(this.formError).toBeVisible();
  }
}
