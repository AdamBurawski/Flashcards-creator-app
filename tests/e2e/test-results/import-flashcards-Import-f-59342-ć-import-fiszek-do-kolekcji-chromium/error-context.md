# Test info

- Name: Import fiszek >> powinien umożliwić import fiszek do kolekcji
- Location: /Volumes/Develop/Kursy/Kurs 10xDevs/Flashcards-Creator-App/Flashcards-creator-app/tests/e2e/import-flashcards.spec.ts:6:3

# Error details

```
Error: expect(received).toBeGreaterThan(expected)

Expected: > 0
Received:   0
    at CollectionsPage.verifyCollectionsExist (/Volumes/Develop/Kursy/Kurs 10xDevs/Flashcards-Creator-App/Flashcards-creator-app/tests/e2e/pages/collections-page.ts:49:19)
    at /Volumes/Develop/Kursy/Kurs 10xDevs/Flashcards-Creator-App/Flashcards-creator-app/tests/e2e/import-flashcards.spec.ts:58:5
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
- main:
  - heading "Moje kolekcje fiszek" [level=1]
  - heading "Status autentykacji" [level=2]
  - paragraph: Sprawdzanie stanu autentykacji...
  - button "Pokaż szczegóły"
  - heading "Witaj, a.burawski@wp.pl!" [level=2]
  - paragraph: Twoje kolekcje fiszek są wyświetlane poniżej.
  - heading "II Wojna Światowa" [level=3]
  - text: "0 fiszek Ostatnia aktualizacja: 7 maj 2025, 18:06"
  - link "Przeglądaj":
    - /url: /collections/3
  - link "Ucz się":
    - /url: /flashcards/learn/3
  - heading "Import 1746633972627-1381" [level=3]
  - text: 5 fiszek
  - paragraph: Kolekcja do testowania importu fiszek
  - text: "Ostatnia aktualizacja: 7 maj 2025, 18:06"
  - link "Przeglądaj":
    - /url: /collections/5
  - link "Ucz się":
    - /url: /flashcards/learn/5
  - heading "Kolekcja 1746633972683-9426" [level=3]
  - text: 0 fiszek
  - paragraph: Opis testowej kolekcji utworzonej przez test e2e
  - text: "Ostatnia aktualizacja: 7 maj 2025, 18:06"
  - link "Przeglądaj":
    - /url: /collections/4
  - link "Ucz się":
    - /url: /flashcards/learn/4
  - heading "Dinozaury" [level=3]
  - text: "4 fiszek Ostatnia aktualizacja: 6 maj 2025, 22:46"
  - link "Przeglądaj":
    - /url: /collections/2
  - link "Ucz się":
    - /url: /flashcards/learn/2
  - heading "Kościół Katolicki" [level=3]
  - text: "5 fiszek Ostatnia aktualizacja: 6 maj 2025, 22:40"
  - link "Przeglądaj":
    - /url: /collections/1
  - link "Ucz się":
    - /url: /flashcards/learn/1
  - heading "Utwórz nową kolekcję" [level=3]
  - button "+ Nowa kolekcja"
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
  31 |     await this.newCollectionButton.click();
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
> 49 |     expect(count).toBeGreaterThan(0);
     |                   ^ Error: expect(received).toBeGreaterThan(expected)
  50 |   }
  51 | } 
```