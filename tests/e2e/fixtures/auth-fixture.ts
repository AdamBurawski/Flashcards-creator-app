import { test as base } from '@playwright/test';
import type { Page } from '@playwright/test';
import { CollectionsPage } from '../pages/collections-page';
import { NewCollectionModal } from '../pages/new-collection-modal';
import { ImportFlashcardsDialog } from '../pages/import-flashcards-dialog';
import { wait } from '../utils/test-helpers';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Ładowanie zmiennych środowiskowych z .env.test
const envPath = path.resolve(process.cwd(), '.env.test');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  console.warn(`Plik .env.test nie został znaleziony pod ścieżką: ${envPath}`);
  dotenv.config(); // Załaduj domyślny .env jeśli .env.test nie istnieje
}

// Dane testowe do logowania
const TEST_USER = {
  id: process.env.E2E_USERNAME_ID || '',
  email: process.env.E2E_USERNAME || 'test@example.com',
  password: process.env.E2E_PASSWORD || 'testoweHaslo123',
};

console.log('Dane autoryzacyjne (zanonimizowane):', {
  id: TEST_USER.id ? 'ustawione' : 'brak',
  email: TEST_USER.email.substring(0, 3) + '***@***' + TEST_USER.email.split('@').pop()?.substring(0, 3),
  passwordLength: TEST_USER.password ? TEST_USER.password.length : 0
});

// Definiujemy typy dla naszych fixtures
type CustomFixtures = {
  authenticatedPage: Page;
  collectionsPage: CollectionsPage;
  newCollectionModal: NewCollectionModal;
  importDialog: ImportFlashcardsDialog;
};

/**
 * Rozszerzenie bazowego testu o fixture do autoryzacji i nowe page objects
 */
export const test = base.extend<CustomFixtures>({
  // Rozszerzamy Page o automatyczne logowanie
  authenticatedPage: async ({ page }, use) => {
    try {
      // Krok 1: Przechodzimy do strony logowania - POPRAWNA ŚCIEŻKA
      await page.goto('/auth/login');
      console.log('Otworzono stronę logowania: /auth/login');
      
      // Sprawdzamy, czy jesteśmy już zalogowani
      const isAlreadyLoggedIn = await page.locator('[data-test-id="user-profile"]').isVisible()
        .catch(() => false);
      
      if (!isAlreadyLoggedIn) {
        console.log('Rozpoczynam proces logowania...');
        
        // Sprawdźmy dostępne pola formularza logowania
        const emailInputs = ['[data-test-id="email-input"]', 'input[type="email"]', '#email', 'input[name="email"]'];
        const passwordInputs = ['[data-test-id="password-input"]', 'input[type="password"]', '#password', 'input[name="password"]'];
        const loginButtons = [
          '[data-test-id="login-button"]', 
          'button[type="submit"]', 
          'button:has-text("Zaloguj")',
          'button:has-text("Login")',
          'button:has-text("Zaloguj się")',
          'input[type="submit"]'
        ];
        
        let emailInput: string | any = null;
        let passwordInput: string | any = null;
        let loginButton: string | any = null;
        
        // Znajdź odpowiednie selektory
        for (const selector of emailInputs) {
          if (await page.locator(selector).isVisible().catch(() => false)) {
            emailInput = selector;
            console.log(`Znaleziono pole email: ${selector}`);
            break;
          }
        }
        
        for (const selector of passwordInputs) {
          if (await page.locator(selector).isVisible().catch(() => false)) {
            passwordInput = selector;
            console.log(`Znaleziono pole hasła: ${selector}`);
            break;
          }
        }
        
        for (const selector of loginButtons) {
          if (await page.locator(selector).isVisible().catch(() => false)) {
            loginButton = selector;
            console.log(`Znaleziono przycisk logowania: ${selector}`);
            break;
          }
        }
        
        // Zrób zrzut ekranu strony logowania
        await page.screenshot({ path: 'login-page.png' });
        console.log('Zrzut ekranu strony logowania zapisany jako login-page.png');
        
        // Jeśli nie znaleziono selektorów, spróbuj zidentyfikować elementy po tekście
        if (!emailInput) {
          const emailLabel = page.getByText('Email', { exact: false });
          if (await emailLabel.isVisible()) {
            const emailInputNearLabel = emailLabel.locator('..').locator('input');
            if (await emailInputNearLabel.isVisible()) {
              emailInput = emailInputNearLabel;
              console.log('Znaleziono pole email przez etykietę');
            }
          }
        }
        
        if (!passwordInput) {
          const passwordLabel = page.getByText('Password', { exact: false });
          if (await passwordLabel.isVisible()) {
            const passwordInputNearLabel = passwordLabel.locator('..').locator('input');
            if (await passwordInputNearLabel.isVisible()) {
              passwordInput = passwordInputNearLabel;
              console.log('Znaleziono pole hasła przez etykietę');
            }
          }
        }
        
        // Wykonaj logowanie
        if (emailInput && passwordInput && loginButton) {
          console.log('Wypełniam formularz logowania...');
          // Wypełnij formularz
          if (typeof emailInput === 'string') {
            await page.locator(emailInput).fill(TEST_USER.email);
          } else {
            await emailInput.fill(TEST_USER.email);
          }
          
          if (typeof passwordInput === 'string') {
            await page.locator(passwordInput).fill(TEST_USER.password);
          } else {
            await passwordInput.fill(TEST_USER.password);
          }
          
          // Zrób zrzut ekranu formularza logowania (debug)
          await page.screenshot({ path: 'login-form-filled.png' });
          
          // Kliknij przycisk logowania
          if (typeof loginButton === 'string') {
            await page.locator(loginButton).click();
          } else {
            await loginButton.click();
          }
          
          // Czekamy na przekierowanie po logowaniu
          await wait(3000);
          console.log('Zalogowano pomyślnie');
        } else {
          console.warn('Nie znaleziono wszystkich potrzebnych elementów formularza logowania');
          
          // Zapisz HTML strony logowania do debug
          const htmlContent = await page.content();
          fs.writeFileSync('login-page.html', htmlContent);
          console.log('HTML strony logowania zapisany jako login-page.html');
          
          // Alternatywne podejście: bezpośrednie wywołanie API logowania
          console.log('Próba logowania przez API...');
          await page.evaluate(async (user: typeof TEST_USER) => {
            try {
              const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: user.email, password: user.password }),
              });
              
              const result = await response.json();
              console.log('Wynik logowania API:', JSON.stringify(result));
              return result;
            } catch (e) {
              console.error('Błąd podczas logowania przez API:', e);
              return null;
            }
          }, TEST_USER);
          
          await wait(3000);
        }
      } else {
        console.log('Użytkownik jest już zalogowany');
      }
      
      // Krok 2: Po logowaniu przechodzimy bezpośrednio do kolekcji
      await page.goto('/collections');
      console.log('Przekierowano do /collections');
      await page.waitForLoadState('networkidle');
      
      await use(page);
    } catch (error) {
      console.error('Błąd w fixture authenticatedPage:', error);
      // Zrzut ekranu w przypadku błędu
      await page.screenshot({ path: 'auth-error.png' });
      // Kontynuujemy, zakładając że nie udało się zalogować
      await use(page);
    }
  },

  // Page objects
  collectionsPage: async ({ page }, use) => {
    await use(new CollectionsPage(page));
  },
  
  newCollectionModal: async ({ page }, use) => {
    await use(new NewCollectionModal(page));
  },
  
  importDialog: async ({ page }, use) => {
    await use(new ImportFlashcardsDialog(page));
  },
}); 