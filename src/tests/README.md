# Struktura testów w projekcie Flashcards Creator App

## Testy jednostkowe (Vitest)

Testy jednostkowe znajdują się w katalogu `src/tests` i są zorganizowane według testowanych elementów:

- `/components` - testy komponentów React
- `/hooks` - testy hooków React
- `/lib` - testy pomocniczych funkcji i serwisów
- `/setup` - pliki konfiguracyjne dla środowiska testowego

### Konwencje nazewnictwa

- Pliki testów powinny mieć nazwę odpowiadającą testowanemu plikowi z sufiksem `.test.ts` lub `.test.tsx`
- Przykład: `FlashcardList.tsx` → `FlashcardList.test.tsx`

### Uruchamianie testów

```bash
# Uruchomienie wszystkich testów jednostkowych
npm test

# Uruchomienie testów w trybie watch
npm run test:watch

# Uruchomienie testów z interfejsem użytkownika
npm run test:ui

# Sprawdzenie pokrycia kodu testami
npm run test:coverage
```

## Testy end-to-end (Playwright)

Testy E2E znajdują się w katalogu `/e2e` i są zorganizowane następująco:

- `/page-objects` - klasy implementujące wzorzec Page Object dla stron aplikacji
- `/fixtures` - dane testowe i wspólne funkcje pomocnicze
- `*.spec.ts` - pliki zawierające testy scenariuszowe

### Konwencje nazewnictwa

- Pliki testów powinny mieć nazwę opisującą testowaną funkcjonalność z sufiksem `.spec.ts`
- Przykład: `home.spec.ts`, `flashcard-creation.spec.ts`

### Uruchamianie testów E2E

```bash
# Uruchomienie wszystkich testów E2E
npm run test:e2e

# Uruchomienie testów E2E z interfejsem użytkownika
npm run test:e2e:ui

# Generowanie testów na podstawie interakcji z przeglądarką
npm run test:e2e:codegen
```

## Najlepsze praktyki

### Dla testów jednostkowych

- Używaj `vi.fn()` dla funkcji mockujących
- Korzystaj z `vi.spyOn()` do monitorowania istniejących funkcji
- Używaj `vi.mock()` do mockowania modułów
- Organizuj testy w bloki `describe` z opisowymi nazwami
- Pisz testy zgodnie ze wzorcem Arrange-Act-Assert

### Dla testów E2E

- Korzystaj z wzorca Page Object dla lepszej organizacji kodu
- Używaj lokatorów opartych o role i atrybuty testowe
- Wykorzystuj zrzuty ekranu do porównań wizualnych
- Testuj zarówno pozytywne, jak i negatywne scenariusze
- Unikaj zależności między testami - każdy test powinien działać niezależnie
