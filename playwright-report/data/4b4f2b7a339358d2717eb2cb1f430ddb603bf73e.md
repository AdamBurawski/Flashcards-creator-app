# Test info

- Name: Collections Management >> should show error when creating collection with empty name
- Location: /Volumes/Develop/Kursy/Kurs 10xDevs/Flashcards-Creator-App/Flashcards-creator-app/e2e/collections.spec.ts:41:3

# Error details

```
Error: page.waitForURL: Test timeout of 30000ms exceeded.
=========================== logs ===========================
waiting for navigation to "/collections" until "load"
============================================================
    at /Volumes/Develop/Kursy/Kurs 10xDevs/Flashcards-Creator-App/Flashcards-creator-app/e2e/collections.spec.ts:47:16
```

# Page snapshot

```yaml
- banner:
  - link "Flashcards Creator":
    - /url: /
  - navigation:
    - link "Strona główna":
      - /url: /
    - link "Generowanie":
      - /url: /generate
    - link "Zaloguj":
      - /url: /auth/login
    - link "Zarejestruj":
      - /url: /auth/register
- main:
  - link "Flashcards Creator":
    - /url: /
    - heading "Flashcards Creator" [level=2]
  - paragraph: Zaloguj się, aby uzyskać dostęp do swojego konta
  - heading "Zaloguj się do swojego konta" [level=1]
  - text: Adres email
  - textbox "Adres email"
  - text: Hasło
  - textbox "Hasło"
  - checkbox "Zapamiętaj mnie"
  - text: Zapamiętaj mnie
  - link "Zapomniałeś hasła?":
    - /url: /auth/forgot-password
  - button "Zaloguj się"
  - text: Nie masz jeszcze konta?
  - link "Zarejestruj się":
    - /url: /auth/register?returnUrl=%2F
```

# Test source

```ts
   1 | import { test, expect } from '@playwright/test';
   2 | import { LoginPage } from './page-objects/LoginPage';
   3 | import { CollectionsPage } from './page-objects/CollectionsPage';
   4 |
   5 | // Pobierz dane logowania z zmiennych środowiskowych
   6 | const E2E_USERNAME = process.env.E2E_USERNAME || 'test@wp.pl';
   7 | const E2E_PASSWORD = process.env.E2E_PASSWORD || 'test123';
   8 |
   9 | // Test dla zarządzania kolekcjami
  10 | test.describe('Collections Management', () => {
  11 |   let loginPage: LoginPage;
  12 |   let collectionsPage: CollectionsPage;
  13 |
  14 |   test.beforeEach(async ({ page }) => {
  15 |     // Inicjalizacja Page Objects
  16 |     loginPage = new LoginPage(page);
  17 |     collectionsPage = new CollectionsPage(page);
  18 |   });
  19 |
  20 |   test('should create a new collection', async ({ page }) => {
  21 |     // Logowanie użytkownika
  22 |     await loginPage.goto();
  23 |     await loginPage.login(E2E_USERNAME, E2E_PASSWORD);
  24 |     
  25 |     // Poczekaj na przekierowanie po zalogowaniu
  26 |     await page.waitForURL('/collections');
  27 |     await collectionsPage.expectLoaded();
  28 |     
  29 |     // Tworzenie nowej kolekcji
  30 |     await collectionsPage.openCreateCollectionForm();
  31 |     await collectionsPage.fillCollectionForm(
  32 |       'Test Collection', 
  33 |       'This is a test collection created by Playwright'
  34 |     );
  35 |     await collectionsPage.saveCollection();
  36 |     
  37 |     // Sprawdź czy utworzono kolekcję
  38 |     await collectionsPage.expectCollectionExists('Test Collection');
  39 |   });
  40 |
  41 |   test('should show error when creating collection with empty name', async ({ page }) => {
  42 |     // Logowanie użytkownika
  43 |     await loginPage.goto();
  44 |     await loginPage.login(E2E_USERNAME, E2E_PASSWORD);
  45 |     
  46 |     // Poczekaj na przekierowanie po zalogowaniu
> 47 |     await page.waitForURL('/collections');
     |                ^ Error: page.waitForURL: Test timeout of 30000ms exceeded.
  48 |     await collectionsPage.expectLoaded();
  49 |     
  50 |     // Próba utworzenia kolekcji bez nazwy
  51 |     await collectionsPage.openCreateCollectionForm();
  52 |     await collectionsPage.fillCollectionForm('', 'Description without name');
  53 |     await collectionsPage.saveCollection();
  54 |     
  55 |     // Sprawdź czy pojawił się komunikat o błędzie
  56 |     await collectionsPage.expectFormError();
  57 |   });
  58 | });
  59 |
```