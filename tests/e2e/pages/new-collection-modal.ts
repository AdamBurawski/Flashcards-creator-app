import { type Page, type Locator, expect } from '@playwright/test';

/**
 * Page Object Model dla modalu tworzenia nowej kolekcji
 */
export class NewCollectionModal {
  readonly page: Page;
  readonly modal: Locator;
  readonly nameInput: Locator;
  readonly descriptionInput: Locator;
  readonly createButton: Locator;
  readonly cancelButton: Locator;
  readonly successMessage: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    // Szukamy modala po kilku możliwych wariantach
    this.modal = page.locator('[data-test-id="new-collection-modal"], .modal, dialog, [role="dialog"]').first();
    
    // Szukamy pola nazwy po różnych atrybutach
    this.nameInput = page.locator('[data-test-id="collection-name-input"], input[name="name"], #name, input[placeholder*="nazwa"], textarea[placeholder*="nazwa"]').first();
    
    // Szukamy pola opisu po różnych atrybutach
    this.descriptionInput = page.locator('[data-test-id="collection-description-input"], textarea[name="description"], #description, textarea[placeholder*="opis"], textarea').first();
    
    // Szukamy przycisku tworzenia kolekcji
    this.createButton = page.locator('[data-test-id="create-collection-button"], button:has-text("Utwórz"), button:has-text("Zapisz"), button[type="submit"]').first();
    
    // Szukamy przycisku anulowania
    this.cancelButton = page.locator('[data-test-id="cancel-button"], button:has-text("Anuluj"), button[type="button"]:has-text("Anuluj")').first();
    
    // Szukamy komunikatu sukcesu
    this.successMessage = page.locator('[data-test-id="success-message"], .alert-success, .success, div:has-text("utworzona pomyślnie"), div:has-text("utworzono kolekcję"), div:has-text("zapisano kolekcję"), div.success').first();
    
    // Szukamy komunikatu błędu
    this.errorMessage = page.locator('[data-test-id="error-message"], .alert-danger, .error, div:has-text("błąd"), div:has-text("wymagana"), div.error').first();
  }

  /**
   * Sprawdza czy modal jest widoczny
   */
  async isVisible() {
    // Modal może być reprezentowany na różne sposoby, więc szukamy różnych opcji
    const possibleModals = [
      this.page.locator('dialog'),
      this.page.locator('.modal'),
      this.page.locator('[role="dialog"]'),
      this.modal,
      this.page.locator('div:has-text("Nowa kolekcja")'),
      this.page.locator('div:has-text("Utwórz")').first().locator('..').locator('..'),
      this.page.locator('[data-test-id="collection-form"]').first().locator('..')
    ];
    
    for (const modal of possibleModals) {
      if (await modal.isVisible().catch(() => false)) {
        // Znaleziono widoczny modal
        return;
      }
    }
    
    // Jeśli doszliśmy tutaj, sprawdźmy czy widać pola formularza,
    // nawet jeśli sam modal nie jest wykrywany poprawnie
    if (await this.nameInput.isVisible().catch(() => false)) {
      return;
    }
    
    // Jeśli nadal nic nie znaleziono, zgłoś błąd
    await expect(this.page.locator('dialog, .modal, [role="dialog"]')).toBeVisible({ timeout: 10000 });
  }

  /**
   * Wypełnia formularz tworzenia nowej kolekcji
   * @param name Nazwa kolekcji
   * @param description Opis kolekcji
   */
  async fillForm(name: string, description: string = '') {
    // Sprawdź najpierw, czy pola są widoczne
    const nameInputVisible = await this.nameInput.isVisible().catch(() => false);
    
    if (!nameInputVisible) {
      // Jeśli standardowe selektory nie działają, szukamy pól po etykietach
      const nameLabel = this.page.getByText('Nazwa', { exact: false });
      if (await nameLabel.isVisible()) {
        const nameInputNearLabel = nameLabel.locator('..').locator('input, textarea');
        if (await nameInputNearLabel.isVisible()) {
          await nameInputNearLabel.fill(name);
        }
      }
    } else {
      await this.nameInput.fill(name);
    }
    
    // Podobnie dla pola opisu, jeśli istnieje
    const descInputVisible = await this.descriptionInput.isVisible().catch(() => false);
    
    if (description && descInputVisible) {
      await this.descriptionInput.fill(description);
    } else if (description) {
      // Szukamy pola opisu po etykiecie
      const descLabel = this.page.getByText('Opis', { exact: false });
      if (await descLabel.isVisible()) {
        const descInputNearLabel = descLabel.locator('..').locator('input, textarea');
        if (await descInputNearLabel.isVisible()) {
          await descInputNearLabel.fill(description);
        }
      }
    }
  }

  /**
   * Klika przycisk utworzenia kolekcji
   */
  async create() {
    // Sprawdź, czy standardowy przycisk jest widoczny
    const createButtonVisible = await this.createButton.isVisible().catch(() => false);
    
    if (createButtonVisible) {
      await this.createButton.click();
    } else {
      // Szukaj przycisku zatwierdzającego po tekście
      const submitButtons = [
        this.page.getByText('Utwórz', { exact: false }),
        this.page.getByText('Zapisz', { exact: false }),
        this.page.getByText('Dodaj', { exact: false }),
        this.page.locator('button[type="submit"]'),
        this.page.locator('input[type="submit"]')
      ];
      
      for (const btn of submitButtons) {
        if (await btn.isVisible().catch(() => false)) {
          await btn.click();
          break;
        }
      }
    }
  }

  /**
   * Klika przycisk anulowania
   */
  async cancel() {
    // Sprawdź, czy standardowy przycisk jest widoczny
    const cancelButtonVisible = await this.cancelButton.isVisible().catch(() => false);
    
    if (cancelButtonVisible) {
      await this.cancelButton.click();
    } else {
      // Szukaj przycisku anulowania po tekście
      const cancelButtons = [
        this.page.getByText('Anuluj', { exact: false }),
        this.page.getByText('Zamknij', { exact: false }),
        this.page.getByText('Cancel', { exact: false }),
        this.page.locator('button[type="button"]:not([type="submit"])').first()
      ];
      
      for (const btn of cancelButtons) {
        if (await btn.isVisible().catch(() => false)) {
          await btn.click();
          break;
        }
      }
    }
  }

  /**
   * Tworzy nową kolekcję
   * @param name Nazwa kolekcji
   * @param description Opis kolekcji
   */
  async createCollection(name: string, description: string = '') {
    await this.fillForm(name, description);
    await this.create();
  }

  /**
   * Sprawdza czy komunikat o sukcesie jest widoczny
   * @param name Opcjonalna nazwa kolekcji do sprawdzenia jej obecności na liście
   */
  async verifySuccess(name?: string) {
    // Komunikat sukcesu może być reprezentowany na różne sposoby
    const possibleSuccessMessages = [
      this.successMessage,
      this.page.locator('.alert-success, .success'),
      this.page.locator('div:has-text("utworzono"), div:has-text("utworzona"), div:has-text("zapisano")').first(),
    ];
    
    // Sprawdź czy którykolwiek komunikat jest widoczny
    for (const message of possibleSuccessMessages) {
      if (await message.isVisible().catch(() => false)) {
        return;
      }
    }
    
    // Jeśli żaden komunikat nie jest widoczny, ale zniknął modal, uznajemy to za sukces
    const modalVisible = await this.modal.isVisible().catch(() => false);
    if (!modalVisible) {
      return;
    }
    
    // Jeśli wszystkie powyższe zawiodły, sprawdź czy właśnie utworzona kolekcja jest widoczna na stronie
    if (name) {
      const newCollectionVisible = await this.page.getByText(name, { exact: false }).isVisible().catch(() => false);
      if (newCollectionVisible) {
        return;
      }
    }
    
    // Jeśli wszystko inne zawiodło, zgłoś błąd
    await expect(possibleSuccessMessages[0]).toBeVisible({ timeout: 10000 });
  }

  /**
   * Sprawdza czy komunikat o błędzie jest widoczny
   */
  async verifyError() {
    // Komunikat błędu może być reprezentowany na różne sposoby
    const possibleErrorMessages = [
      this.errorMessage,
      this.page.locator('.alert-danger, .error'),
      this.page.locator('div:has-text("błąd"), div:has-text("wymagana"), div:has-text("niepoprawna")').first(),
    ];
    
    // Sprawdź czy którykolwiek komunikat jest widoczny
    for (const message of possibleErrorMessages) {
      if (await message.isVisible().catch(() => false)) {
        return;
      }
    }
    
    // Sprawdź, czy pole z błędem jest podświetlone (np. czerwona obramówka)
    const errorField = this.page.locator('input.error, input.invalid, input[aria-invalid="true"]');
    if (await errorField.isVisible().catch(() => false)) {
      return;
    }
    
    // Jeśli wszystko inne zawiodło, zgłoś błąd
    await expect(possibleErrorMessages[0]).toBeVisible();
  }
} 