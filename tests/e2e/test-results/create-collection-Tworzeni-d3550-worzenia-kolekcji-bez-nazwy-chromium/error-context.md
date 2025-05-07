# Test info

- Name: Tworzenie nowej kolekcji >> powinno wyświetlić błąd przy próbie utworzenia kolekcji bez nazwy
- Location: /Volumes/Develop/Kursy/Kurs 10xDevs/Flashcards-Creator-App/Flashcards-creator-app/tests/e2e/create-collection.spec.ts:51:3

# Error details

```
TimeoutError: locator.click: Timeout 5000ms exceeded.
Call log:
  - waiting for locator('[data-test-id="new-collection-button"]')

    at CollectionsPage.clickNewCollection (/Volumes/Develop/Kursy/Kurs 10xDevs/Flashcards-Creator-App/Flashcards-creator-app/tests/e2e/pages/collections-page.ts:31:36)
    at /Volumes/Develop/Kursy/Kurs 10xDevs/Flashcards-Creator-App/Flashcards-creator-app/tests/e2e/create-collection.spec.ts:59:27
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
  - heading "Adamie, Witaj w flashcards-creator-app Astro Starter!" [level=1]
  - paragraph: "Ten projekt został zbudowany w oparciu o nowoczesny stack technologiczny:"
  - heading "Core" [level=2]
  - list:
    - listitem: Astro v5.5.5 - Metaframework do aplikacji webowych
    - listitem: React v19 - Biblioteka UI do komponentów interaktywnych
    - listitem: TypeScript - Typowanie statyczne
  - heading "Stylowanie" [level=2]
  - list:
    - listitem: Tailwind CSS v4 - Utility-first CSS framework
  - heading "Statyczna analiza kodu" [level=2]
  - list:
    - listitem: ESLint v9 - Lintowanie kodu
    - listitem: Prettier - Formatowanie kodu
    - listitem: Husky i Lint-staged - Automatyczna analiza kodu przed commitowaniem
  - paragraph: Starter zawiera wszystko, czego potrzebujesz do rozpoczęcia tworzenia nowoczesnych aplikacji webowych!
  - heading "Status autentykacji" [level=2]
  - paragraph: Zalogowany
  - button "Pokaż szczegóły"
```

# Test source

```ts
   1 | import { Page, Locator, expect } from '@playwright/test';
   2 |
   3 | /**
   4 |  * Page Object Model dla strony z kolekcjami
   5 |  */
   6 | export class CollectionsPage {
   7 |   readonly page: Page;
   8 |   readonly newCollectionButton: Locator;
   9 |   readonly collectionItems: Locator;
  10 |   readonly collectionNames: Locator;
  11 |
  12 |   constructor(page: Page) {
  13 |     this.page = page;
  14 |     this.newCollectionButton = page.locator('[data-test-id="new-collection-button"]');
  15 |     this.collectionItems = page.locator('[data-test-id="collection-item"]');
  16 |     this.collectionNames = page.locator('[data-test-id="collection-name"]');
  17 |   }
  18 |
  19 |   /**
  20 |    * Otwiera stronę z kolekcjami
  21 |    */
  22 |   async goto() {
  23 |     await this.page.goto('/collections');
  24 |     await this.page.waitForLoadState('networkidle');
  25 |   }
  26 |
  27 |   /**
  28 |    * Klika przycisk "Nowa kolekcja"
  29 |    */
  30 |   async clickNewCollection() {
> 31 |     await this.newCollectionButton.click();
     |                                    ^ TimeoutError: locator.click: Timeout 5000ms exceeded.
  32 |   }
  33 |
  34 |   /**
  35 |    * Sprawdza czy kolekcja o podanej nazwie istnieje na liście
  36 |    * @param name Nazwa kolekcji do sprawdzenia
  37 |    */
  38 |   async hasCollection(name: string): Promise<boolean> {
  39 |     await this.page.waitForSelector(`text=${name}`);
  40 |     const allNames = await this.collectionNames.allTextContents();
  41 |     return allNames.includes(name);
  42 |   }
  43 |
  44 |   /**
  45 |    * Weryfikuje, że istnieje przynajmniej jedna kolekcja
  46 |    */
  47 |   async verifyCollectionsExist() {
  48 |     const count = await this.collectionItems.count();
  49 |     expect(count).toBeGreaterThan(0);
  50 |   }
  51 | } 
```