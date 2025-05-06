import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object dla strony logowania
 * Implementacja wzorca Page Object do testów E2E
 */
export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly registerLink: Locator;
  readonly forgotPasswordLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('input[name="email"]');
    this.passwordInput = page.locator('input[name="password"]');
    this.submitButton = page.locator('button[type="submit"]');
    this.errorMessage = page.locator('[data-test-id="login-error"]');
    this.registerLink = page.locator('a[href="/auth/register"]');
    this.forgotPasswordLink = page.locator('a[href="/auth/forgot-password"]');
  }

  /**
   * Nawigacja do strony logowania
   */
  async goto() {
    await this.page.goto('/auth/login');
  }

  /**
   * Sprawdzenie, czy strona logowania została załadowana
   */
  async expectLoaded() {
    await expect(this.emailInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.submitButton).toBeVisible();
  }

  /**
   * Logowanie z podanymi danymi
   */
  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  /**
   * Sprawdzenie, czy pojawił się komunikat o błędzie
   */
  async expectErrorMessage() {
    await expect(this.errorMessage).toBeVisible();
  }

  /**
   * Przejście do strony rejestracji
   */
  async goToRegister() {
    await this.registerLink.click();
  }

  /**
   * Przejście do strony odzyskiwania hasła
   */
  async goToForgotPassword() {
    await this.forgotPasswordLink.click();
  }
} 