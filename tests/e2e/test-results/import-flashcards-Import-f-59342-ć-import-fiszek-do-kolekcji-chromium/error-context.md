# Test info

- Name: Import fiszek >> powinien umożliwić import fiszek do kolekcji
- Location: /Volumes/Develop/Kursy/Kurs 10xDevs/Flashcards-Creator-App/Flashcards-creator-app/tests/e2e/import-flashcards.spec.ts:6:3

# Error details

```
Error: Timed out 5000ms waiting for expect(locator).toBeVisible()

Locator: locator('[data-test-id="import-flashcards-dialog"]')
Expected: visible
Received: <element(s) not found>
Call log:
  - expect.toBeVisible with timeout 5000ms
  - waiting for locator('[data-test-id="import-flashcards-dialog"]')

    at ImportFlashcardsDialog.isVisible (/Volumes/Develop/Kursy/Kurs 10xDevs/Flashcards-Creator-App/Flashcards-creator-app/tests/e2e/pages/import-flashcards-dialog.ts:33:31)
    at /Volumes/Develop/Kursy/Kurs 10xDevs/Flashcards-Creator-App/Flashcards-creator-app/tests/e2e/import-flashcards.spec.ts:24:24
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
    - link "Kolekcje":
      - /url: /collections
    - button "Wyloguj"
- main:
  - link "Flashcards Creator":
    - /url: /
    - heading "Flashcards Creator" [level=2]
  - paragraph: Zaloguj się, aby uzyskać dostęp do swojego konta
  - heading "Zaloguj się do swojego konta" [level=1]
  - text: Adres email
  - textbox "Adres email"
  - paragraph: Email jest wymagany
  - text: Hasło
  - textbox "Hasło"
  - paragraph: Hasło jest wymagane
  - checkbox "Zapamiętaj mnie"
  - text: Zapamiętaj mnie
  - link "Zapomniałeś hasła?":
    - /url: /auth/forgot-password
  - button "Zaloguj się"
  - text: Nie masz jeszcze konta?
  - link "Zarejestruj się":
    - /url: /auth/register?returnUrl=%2Fcollections
```

# Test source

```ts
   1 | import { Page, Locator, expect } from '@playwright/test';
   2 |
   3 | /**
   4 |  * Page Object Model dla dialogu importu fiszek
   5 |  */
   6 | export class ImportFlashcardsDialog {
   7 |   readonly page: Page;
   8 |   readonly dialog: Locator;
   9 |   readonly generationSelect: Locator;
  10 |   readonly selectAllButton: Locator;
  11 |   readonly deselectAllButton: Locator;
  12 |   readonly flashcardsList: Locator;
  13 |   readonly closeButton: Locator;
  14 |   readonly importButton: Locator;
  15 |   readonly errorMessage: Locator;
  16 |
  17 |   constructor(page: Page) {
  18 |     this.page = page;
  19 |     this.dialog = page.locator('[data-test-id="import-flashcards-dialog"]');
  20 |     this.generationSelect = page.locator('[data-test-id="generation-select"]');
  21 |     this.selectAllButton = page.locator('[data-test-id="select-all-flashcards"]');
  22 |     this.deselectAllButton = page.locator('[data-test-id="deselect-all-flashcards"]');
  23 |     this.flashcardsList = page.locator('[data-test-id="flashcards-list"]');
  24 |     this.closeButton = page.locator('[data-test-id="close-import-dialog"]');
  25 |     this.importButton = page.locator('[data-test-id="import-flashcards-button"]');
  26 |     this.errorMessage = page.locator('[data-test-id="import-error-message"]');
  27 |   }
  28 |
  29 |   /**
  30 |    * Sprawdza czy dialog jest widoczny
  31 |    */
  32 |   async isVisible() {
> 33 |     await expect(this.dialog).toBeVisible();
     |                               ^ Error: Timed out 5000ms waiting for expect(locator).toBeVisible()
  34 |   }
  35 |
  36 |   /**
  37 |    * Wybiera sesję generowania z listy rozwijanej
  38 |    * @param index Indeks sesji do wyboru (domyślnie pierwsza - 0)
  39 |    */
  40 |   async selectGeneration(index: number = 0) {
  41 |     await this.generationSelect.selectOption({ index });
  42 |   }
  43 |
  44 |   /**
  45 |    * Zaznacza wszystkie fiszki
  46 |    */
  47 |   async selectAllFlashcards() {
  48 |     await this.selectAllButton.click();
  49 |   }
  50 |
  51 |   /**
  52 |    * Odznacza wszystkie fiszki
  53 |    */
  54 |   async deselectAllFlashcards() {
  55 |     await this.deselectAllButton.click();
  56 |   }
  57 |
  58 |   /**
  59 |    * Zaznacza konkretną fiszkę
  60 |    * @param id ID fiszki
  61 |    */
  62 |   async toggleFlashcard(id: number) {
  63 |     await this.page.locator(`[data-test-id="flashcard-checkbox-${id}"]`).click();
  64 |   }
  65 |
  66 |   /**
  67 |    * Klika przycisk importu fiszek
  68 |    */
  69 |   async import() {
  70 |     await this.importButton.click();
  71 |   }
  72 |
  73 |   /**
  74 |    * Zamyka dialog
  75 |    */
  76 |   async close() {
  77 |     await this.closeButton.click();
  78 |   }
  79 |
  80 |   /**
  81 |    * Sprawdza czy komunikat o błędzie jest widoczny
  82 |    */
  83 |   async verifyError() {
  84 |     await expect(this.errorMessage).toBeVisible();
  85 |   }
  86 |
  87 |   /**
  88 |    * Sprawdza czy lista fiszek zawiera elementy
  89 |    */
  90 |   async verifyFlashcardsExist() {
  91 |     await expect(this.flashcardsList).toBeVisible();
  92 |     const flashcardItems = this.page.locator('[data-test-id^="flashcard-item-"]');
  93 |     const count = await flashcardItems.count();
  94 |     expect(count).toBeGreaterThan(0);
  95 |   }
  96 | } 
```