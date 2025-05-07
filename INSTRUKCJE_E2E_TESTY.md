# Instrukcje dotyczące testów E2E z Playwright

## Przygotowanie projektu do testów E2E

W ramach przygotowania projektu do testów E2E dodano atrybuty `data-test-id` do następujących komponentów:

### 1. NewCollectionButton.tsx

- `data-test-id="new-collection-button"` - przycisk tworzenia nowej kolekcji
- `data-test-id="new-collection-modal"` - modal tworzenia nowej kolekcji
- `data-test-id="collection-name-input"` - pole z nazwą kolekcji
- `data-test-id="collection-description-input"` - pole z opisem kolekcji
- `data-test-id="create-collection-button"` - przycisk zapisu kolekcji
- `data-test-id="success-message"` - komunikat o powodzeniu
- `data-test-id="error-message"` - komunikat o błędzie
- `data-test-id="cancel-button"` - przycisk anulowania

### 2. ImportFlashcardsDialog.tsx

- `data-test-id="import-flashcards-dialog"` - dialog importu fiszek
- `data-test-id="import-error-message"` - komunikat o błędzie w dialogu importu
- `data-test-id="generation-select"` - wybór sesji generowania
- `data-test-id="select-all-flashcards"` - przycisk zaznaczenia wszystkich fiszek
- `data-test-id="deselect-all-flashcards"` - przycisk odznaczenia wszystkich fiszek
- `data-test-id="flashcards-list"` - lista fiszek do importu
- `data-test-id="flashcard-item-${id}"` - element listy fiszek
- `data-test-id="flashcard-checkbox-${id}"` - checkbox wyboru fiszki
- `data-test-id="close-import-dialog"` - przycisk zamykania dialogu importu
- `data-test-id="import-flashcards-button"` - przycisk importu fiszek

### 3. Elementy potrzebne dla autoryzacji

- `data-test-id="email-input"` - pole wprowadzania emaila
- `data-test-id="password-input"` - pole wprowadzania hasła
- `data-test-id="login-button"` - przycisk logowania
- `data-test-id="user-profile"` - element profilu zalogowanego użytkownika

## Do dodania w innych komponentach

Poniższe elementy muszą zostać dodane do istniejących komponentów, aby testy E2E mogły działać poprawnie:

### 1. Komponent listy kolekcji

- `data-test-id="collection-item"` - element listy kolekcji (dla każdej kolekcji)
- `data-test-id="collection-name"` - element z nazwą kolekcji (dla każdej kolekcji)

## Struktura testów E2E - Page Object Model (POM)

Testy wykorzystują wzorzec Page Object Model (POM), który poprawia ich utrzymywalność poprzez enkapsulację interfejsu użytkownika w dedykowanych klasach. Struktura testów:

### Klasy Page Object

1. **CollectionsPage** (`tests/e2e/pages/collections-page.ts`)

   - Obsługa strony z listą kolekcji
   - Metody do przechodzenia do strony kolekcji, klikania w przycisk nowej kolekcji, weryfikacji kolekcji

2. **NewCollectionModal** (`tests/e2e/pages/new-collection-modal.ts`)

   - Obsługa modalu tworzenia nowej kolekcji
   - Metody do wypełniania formularza, tworzenia kolekcji, weryfikacji błędów/sukcesów

3. **ImportFlashcardsDialog** (`tests/e2e/pages/import-flashcards-dialog.ts`)
   - Obsługa dialogu importu fiszek
   - Metody do wyboru sesji, zaznaczania fiszek, importowania

### Funkcje pomocnicze

Plik `tests/e2e/utils/test-helpers.ts` zawiera funkcje pomocnicze:

1. **generateUniqueName** - generuje unikalną nazwę dla testu

   ```typescript
   const nazwaKolekcji = generateUniqueName("Kolekcja");
   ```

2. **wait** - asynchroniczna funkcja opóźniająca

   ```typescript
   await wait(2000); // czeka 2 sekundy
   ```

3. **retry** - funkcja ponawiająca operację w przypadku niepowodzenia
   ```typescript
   await retry(async () => await page.click("#element"), { maxAttempts: 5 });
   ```

### Fixtures

Fixture autoryzacji (`tests/e2e/fixtures/auth-fixture.ts`) rozszerza standardowy test Playwright o:

- Automatyczne logowanie przed testami - z obsługą zarówno UI jak i API
- Wstrzykiwanie obiektów Page Object do testów

**Uwaga**: Fixture autoryzacji użyje danych logowania z zmiennych środowiskowych `E2E_USERNAME`, `E2E_PASSWORD` i `E2E_USERNAME_ID` z pliku `.env.test` lub domyślnych wartości testowych.

### Konfiguracja Playwright

Plik `tests/e2e/playwright.config.ts` zawiera konfigurację dla testów E2E:

- Ustawienie tylko przeglądarki Chrome/Chromium
- Konfiguracja nagrywania wideo, zrzutów ekranu i śledzenia
- Ustawienie timeoutów i innych parametrów

## Scenariusze testowe

### 1. Tworzenie nowej kolekcji

Test przeprowadza następujący scenariusz:

1. Przejście do strony z kolekcjami
2. Kliknięcie przycisku "Nowa kolekcja"
3. Wypełnienie formularza nowej kolekcji
4. Zapisanie kolekcji
5. Weryfikacja komunikatu o powodzeniu
6. Zamknięcie dialogu importu fiszek
7. Weryfikacja, czy nowa kolekcja pojawia się na liście

Dodatkowo scenariusz negatywny:

- Próba utworzenia kolekcji bez nazwy
- Weryfikacja komunikatu o błędzie

### 2. Import fiszek

Test przeprowadza następujący scenariusz:

1. Przejście do strony z kolekcjami
2. Utworzenie nowej kolekcji
3. Przejście do dialogu importu fiszek
4. Wybór sesji generowania
5. Zaznaczenie fiszek do importu
6. Import fiszek
7. Weryfikacja, czy kolekcja została utworzona

## Uruchomienie testów

Aby uruchomić testy E2E, należy wykonać następujące kroki:

1. Upewnij się, że serwer aplikacji jest uruchomiony
2. Opcjonalnie: Skonfiguruj plik `.env.test` z danymi testowego użytkownika:
   ```
   E2E_USERNAME=twoj_test@example.com
   E2E_PASSWORD=twoje_haslo_testowe
   E2E_USERNAME_ID=id_uzytkownika_testowego
   ```
3. Uruchom testy za pomocą komendy:

```bash
npx playwright test --config=tests/e2e/playwright.config.ts
```

Lub konkretny test:

```bash
npx playwright test tests/e2e/create-collection.spec.ts --config=tests/e2e/playwright.config.ts
```

### Przydatne komendy Playwright

```bash
# Uruchomienie testów w trybie UI
npx playwright test --ui --config=tests/e2e/playwright.config.ts

# Uruchomienie testów z debuggerem
npx playwright test --debug --config=tests/e2e/playwright.config.ts

# Wygenerowanie kodu testów
npx playwright codegen http://localhost:3000

# Uruchomienie testów z raportowaniem HTML
npx playwright test --reporter=html --config=tests/e2e/playwright.config.ts
```
