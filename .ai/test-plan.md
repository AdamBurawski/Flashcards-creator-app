# Plan Testów Aplikacji Flashcards Creator

## 1. Wprowadzenie

### 1.1. Cel Planu Testów

Celem niniejszego planu testów jest zapewnienie wysokiej jakości aplikacji Flashcards Creator poprzez systematyczne weryfikowanie jej funkcjonalności, wydajności, bezpieczeństwa i użyteczności. Plan definiuje strategię testowania, zakres, zasoby, harmonogram oraz procesy związane z testowaniem na wszystkich etapach rozwoju aplikacji. Głównym celem jest identyfikacja i eliminacja błędów przed wdrożeniem produkcyjnym, zapewniając użytkownikom stabilne i niezawodne narzędzie do tworzenia i nauki fiszek.

### 1.2. Zakres Planu Testów

Plan obejmuje testowanie wszystkich komponentów i warstw aplikacji Flashcards Creator:

- **Frontend:**
  - Interfejs użytkownika (UI) zbudowany w Astro, React (z Shadcn/ui) i Tailwind CSS.
  - Logika komponentów React i Astro.
  - Routing i nawigacja w aplikacji (Astro routing).
  - Interakcje użytkownika i walidacja formularzy.
  - Responsywność (RWD) na różnych urządzeniach i przeglądarkach.
  - Dostępność (Accessibility - a11y).
- **Backend (API Endpoints):**
  - Punkty końcowe API stworzone w Astro (`/src/pages/api`).
  - Logika biznesowa i walidacja danych po stronie serwera.
  - Obsługa żądań HTTP (GET, POST, PUT, DELETE).
- **Integracje:**
  - Integracja z Supabase (Baza danych PostgreSQL, Autentykacja, Row Level Security - RLS).
  - Integracja z API OpenRouter.ai do generowania fiszek.
- **Bezpieczeństwo:**
  - Autentykacja i autoryzacja użytkowników.
  - Walidacja danych wejściowych.
  - Ochrona przed typowymi atakami webowymi (XSS, CSRF - w zakresie możliwości Astro/frameworka).
  - Bezpieczeństwo konfiguracji Supabase i kluczy API.
- **Wydajność:**
  - Czas odpowiedzi API.
  - Czas ładowania stron frontendowych.
  - Wydajność generowania fiszek przez AI.

**Funkcjonalności poza zakresem (jeśli dotyczy):**

- _Należy tutaj wymienić ewentualne funkcjonalności, które świadomie nie są objęte tym planem testów._

## 2. Strategie Testowania

Przyjęta zostanie wielopoziomowa strategia testowania, aby zapewnić kompleksowe pokrycie aplikacji:

### 2.1. Testy Jednostkowe (Unit Tests)

- **Cel:** Weryfikacja poprawności działania izolowanych fragmentów kodu (funkcje, komponenty, moduły).
- **Zakres:**
  - Funkcje pomocnicze w `src/lib`.
  - Logika komponentów React (`src/components/**/*.tsx`) - renderowanie, obsługa propsów, stanu, zdarzeń.
  - Logika komponentów Astro (`src/components/**/*.astro`).
  - Logika endpointów API (`src/pages/api/**/*.ts`) - bez zależności zewnętrznych (mockowanie Supabase/OpenRouter).
- **Narzędzia:** Vitest/Jest, React Testing Library, Astro Testing Utilities (jeśli dostępne/potrzebne).
- **Odpowiedzialność:** Deweloperzy.

### 2.2. Testy Integracyjne (Integration Tests)

- **Cel:** Weryfikacja poprawności współpracy między różnymi modułami/komponentami aplikacji.
- **Zakres:**
  - Interakcje między komponentami React/Astro na frontendzie (np. formularz -> lista).
  - Przepływ danych między frontendem a API (np. wysłanie formularza, odebranie danych).
  - Integracja endpointów API z rzeczywistą (testową) instancją Supabase (CRUD, Auth).
  - Integracja z API OpenRouter.ai (kontrolowane testy z uwzględnieniem limitów/kosztów lub dokładne mockowanie).
- **Narzędzia:** Vitest/Jest, React Testing Library, Supertest (dla API), Playwright/Cypress (dla integracji frontend-backend).
- **Odpowiedzialność:** Deweloperzy, Testerzy.

### 2.3. Testy End-to-End (E2E Tests)

- **Cel:** Weryfikacja kompletnych przepływów użytkownika w aplikacji, symulując rzeczywiste interakcje w przeglądarce.
- **Zakres:** Kluczowe ścieżki użytkownika:
  - Rejestracja i logowanie.
  - Tworzenie nowego zestawu fiszek (ręcznie).
  - Generowanie fiszek za pomocą AI (od wprowadzenia tematu do zapisania fiszek).
  - Przeglądanie i edycja zestawu fiszek.
  - Usuwanie fiszek i zestawów.
  - Rozpoczynanie i prowadzenie sesji nauki.
- **Narzędzia:** Playwright lub Cypress.
- **Odpowiedzialność:** Testerzy, Deweloperzy (wsparcie).

### 2.4. Testy Manualne i Eksploracyjne

- **Cel:** Wykrywanie błędów trudnych do zautomatyzowania, ocena użyteczności (UX) i weryfikacja przypadków brzegowych.
- **Zakres:** Cała aplikacja, ze szczególnym uwzględnieniem nowych funkcjonalności i zmian. Testowanie "na wyczucie", próby "złamania" aplikacji.
- **Odpowiedzialność:** Testerzy.

### 2.5. Testy Wizualnej Regresji (Opcjonalnie)

- **Cel:** Wykrywanie niezamierzonych zmian w wyglądzie interfejsu użytkownika.
- **Narzędzia:** Percy, Chromatic, Playwright (z porównywaniem screenshotów).
- **Odpowiedzialność:** Testerzy/Frontend Deweloperzy.

### 2.6. Testy Dostępności (Accessibility Tests - a11y)

- **Cel:** Zapewnienie, że aplikacja jest użyteczna dla osób z niepełnosprawnościami.
- **Narzędzia:** Axe-core (zintegrowane z Playwright/Cypress lub jako rozszerzenie przeglądarki), manualna weryfikacja (np. nawigacja klawiaturą, kontrast).
- **Odpowiedzialność:** Testerzy, Frontend Deweloperzy.

### 2.7. Testy Responsywności (RWD)

- **Cel:** Sprawdzenie poprawnego wyświetlania i działania aplikacji na różnych rozmiarach ekranów (desktop, tablet, mobile).
- **Narzędzia:** Narzędzia deweloperskie przeglądarki, Playwright/Cypress (ustawianie viewportu).
- **Odpowiedzialność:** Testerzy, Frontend Deweloperzy.

## 3. Przypadki Testowe (Przykłady)

_Poniżej znajdują się przykładowe przypadki testowe. Pełna lista powinna być rozwijana w osobnym dokumencie lub systemie zarządzania testami (np. TestRail, Xray for Jira)._

**Format:**

- **ID:** Unikalny identyfikator testu (np. AUTH-001)
- **Tytuł:** Krótki opis testowanej funkcjonalności.
- **Warunki wstępne:** Stan systemu wymagany przed rozpoczęciem testu.
- **Kroki:** Sekwencja czynności do wykonania.
- **Oczekiwany rezultat:** Spodziewany stan systemu/interfejsu po wykonaniu kroków.
- **Priorytet:** Krytyczny, Wysoki, Średni, Niski.
- **Kryteria akceptacji:** Warunki, które muszą być spełnione, aby test został uznany za zaliczony.

---

**ID:** AUTH-001
**Tytuł:** Pomyślne logowanie zarejestrowanego użytkownika
**Warunki wstępne:** Użytkownik `test@example.com` z hasłem `password123` istnieje w bazie Supabase. Użytkownik nie jest zalogowany.
**Kroki:**

1.  Otwórz stronę logowania (`/login`).
2.  Wprowadź `test@example.com` w polu "Email".
3.  Wprowadź `password123` w polu "Hasło".
4.  Kliknij przycisk "Zaloguj się".
    **Oczekiwany rezultat:** Użytkownik zostaje przekierowany na stronę główną (np. `/dashboard`). Widoczny jest interfejs zalogowanego użytkownika (np. email w nagłówku, przycisk "Wyloguj").
    **Priorytet:** Krytyczny
    **Kryteria akceptacji:** Użytkownik może uzyskać dostęp do chronionych zasobów aplikacji. Sesja użytkownika jest poprawnie utworzona.

---

**ID:** AUTH-002
**Tytuł:** Nieudane logowanie przy błędnym haśle
**Warunki wstępne:** Użytkownik `test@example.com` istnieje w bazie Supabase. Użytkownik nie jest zalogowany.
**Kroki:**

1.  Otwórz stronę logowania (`/login`).
2.  Wprowadź `test@example.com` w polu "Email".
3.  Wprowadź `wrongpassword` w polu "Hasło".
4.  Kliknij przycisk "Zaloguj się".
    **Oczekiwany rezultat:** Użytkownik pozostaje na stronie logowania. Wyświetlany jest komunikat błędu informujący o nieprawidłowych danych logowania (np. "Nieprawidłowy email lub hasło").
    **Priorytet:** Wysoki
    **Kryteria akceptacji:** Aplikacja nie pozwala na logowanie z błędnymi danymi. Informacja zwrotna dla użytkownika jest czytelna.

---

**ID:** SET-001
**Tytuł:** Tworzenie nowego zestawu fiszek
**Warunki wstępne:** Użytkownik jest zalogowany.
**Kroki:**

1.  Przejdź do widoku tworzenia nowego zestawu (np. klikając przycisk "Nowy zestaw").
2.  Wprowadź nazwę zestawu, np. "Stolice Europy".
3.  Wprowadź opis (opcjonalnie), np. "Fiszki do nauki stolic państw europejskich".
4.  Kliknij przycisk "Zapisz" lub "Utwórz zestaw".
    **Oczekiwany rezultat:** Użytkownik zostaje przekierowany do widoku nowo utworzonego zestawu lub do listy zestawów. Nowy zestaw "Stolice Europy" jest widoczny na liście zestawów użytkownika. W bazie danych Supabase pojawia się nowy rekord w tabeli `sets` powiązany z ID użytkownika.
    **Priorytet:** Krytyczny
    **Kryteria akceptacji:** Użytkownik może tworzyć nowe zestawy fiszek. Dane są poprawnie zapisywane w bazie danych.

---

**ID:** AI-GEN-001
**Tytuł:** Pomyślne wygenerowanie fiszek za pomocą AI
**Warunki wstępne:** Użytkownik jest zalogowany. Użytkownik znajduje się w widoku zestawu fiszek lub specjalnym widoku generowania AI. Klucz API OpenRouter jest poprawnie skonfigurowany i aktywny.
**Kroki:**

1.  Wprowadź temat lub tekst źródłowy do wygenerowania fiszek, np. "Podstawowe definicje z zakresu programowania obiektowego".
2.  Wybierz (jeśli dotyczy) model AI lub ustawienia generowania.
3.  Kliknij przycisk "Generuj fiszki".
4.  Poczekaj na zakończenie procesu generowania (powinien być widoczny wskaźnik postępu).
    **Oczekiwany rezultat:** Wygenerowane fiszki (pytanie/odpowiedź) są wyświetlane użytkownikowi do przeglądu. Nie wystąpiły błędy komunikacji z API OpenRouter. Użytkownik ma możliwość zapisania wygenerowanych fiszek w bieżącym zestawie.
    **Priorytet:** Wysoki
    **Kryteria akceptacji:** Integracja z OpenRouter działa poprawnie. Fiszki są generowane zgodnie z oczekiwaniami (format, treść). Użytkownik otrzymuje informację zwrotną o statusie generowania.

---

**ID:** AI-GEN-003
**Tytuł:** Obsługa błędu podczas generowania fiszek przez AI (np. błąd API)
**Warunki wstępne:** Użytkownik jest zalogowany. Klucz API OpenRouter jest nieprawidłowy, nieaktywny lub występuje problem z usługą OpenRouter.
**Kroki:**

1.  Wprowadź temat do wygenerowania fiszek.
2.  Kliknij przycisk "Generuj fiszki".
3.  Poczekaj na próbę komunikacji z API.
    **Oczekiwany rezultat:** Aplikacja wyświetla czytelny komunikat błędu informujący o problemie z generowaniem fiszek (np. "Wystąpił błąd podczas komunikacji z usługą AI. Spróbuj ponownie później."). Proces generowania zostaje przerwany. Aplikacja pozostaje stabilna.
    **Priorytet:** Średni
    **Kryteria akceptacji:** Aplikacja poprawnie obsługuje błędy pochodzące z zewnętrznego API. Użytkownik jest informowany o problemie.

---

**ID:** LEARN-001
**Tytuł:** Rozpoczęcie i przeglądanie fiszek w sesji nauki
**Warunki wstępne:** Użytkownik jest zalogowany. Istnieje zestaw fiszek zawierający co najmniej jedną fiszkę (np. "Polska" / "Warszawa").
**Kroki:**

1.  Przejdź do widoku zestawu fiszek "Stolice Europy".
2.  Kliknij przycisk "Rozpocznij naukę".
3.  Wyświetlana jest pierwsza strona fiszki (np. "Polska").
4.  Kliknij fiszkę lub przycisk "Pokaż odpowiedź".
5.  Wyświetlana jest druga strona fiszki (np. "Warszawa").
6.  Kliknij przycisk "Następna" lub oznacz fiszkę jako "umiem"/"nie umiem".
    **Oczekiwany rezultat:** Użytkownik może płynnie przechodzić przez kolejne fiszki w zestawie. Interfejs nauki działa zgodnie z oczekiwaniami (pokazywanie/ukrywanie odpowiedzi, nawigacja).
    **Priorytet:** Krytyczny
    **Kryteria akceptacji:** Podstawowa funkcjonalność nauki działa poprawnie. Użytkownik może przeglądać obie strony fiszki.

---

_(Należy dodać więcej przypadków testowych pokrywających m.in.: edycję/usuwanie fiszek i zestawów, walidację formularzy, paginację (jeśli istnieje), wyszukiwanie/filtrowanie zestawów, obsługę różnych typów treści na fiszkach, działanie na różnych przeglądarkach, responsywność, przypadki brzegowe)._

### 3.1. Przykładowe Dane Testowe

- **Użytkownicy:**
  - `tester.glowny@example.com` / `Password123!` (użytkownik z pełnymi uprawnieniami)
  - `tester.nowy@example.com` / `Password123!` (użytkownik do testowania procesu onboardingu)
  - `tester.bez.zestawow@example.com` / `Password123!` (użytkownik bez żadnych zestawów)
- **Teksty do generowania AI:**
  - Krótki tekst: "Fotosynteza"
  - Dłuższy tekst: "Opisz kluczowe wydarzenia II Wojny Światowej w Europie."
  - Tekst potencjalnie problematyczny: (np. bardzo długi, zawierający nietypowe znaki)
- **Dane fiszek:**
  - Proste: Pytanie: `2+2`, Odpowiedź: `4`
  - Z formatowaniem (jeśli wspierane): Pytanie: `Co oznacza **HTML**?`, Odpowiedź: `*HyperText Markup Language*`
  - Puste/Niekompletne: Pytanie: `Test`, Odpowiedź: `` (pusta)

## 4. Testowanie Wydajnościowe

### 4.1. Cele

- Ocena czasu odpowiedzi aplikacji pod obciążeniem.
- Identyfikacja wąskich gardeł wydajnościowych.
- Zapewnienie stabilności aplikacji przy oczekiwanym ruchu użytkowników.
- Pomiar wydajności kluczowych operacji (ładowanie stron, zapytania API, generowanie AI).

### 4.2. Scenariusze Testowe

- **Test obciążeniowy API:** Symulacja N jednoczesnych użytkowników wykonujących typowe akcje (logowanie, pobieranie listy zestawów, pobieranie fiszek z zestawu, tworzenie nowej fiszki) przez określony czas.
- **Test ładowania strony:** Pomiar kluczowych metryk Web Vitals (LCP, FCP, TTI, CLS) dla strony głównej, strony logowania, widoku listy zestawów i widoku nauki.
- **Test warunków skrajnych (Stress Test):** Stopniowe zwiększanie obciążenia API aż do momentu awarii, aby określić maksymalną przepustowość systemu.
- **Test wydajności generowania AI:** Pomiar czasu potrzebnego na wygenerowanie fiszek dla różnych rozmiarów tekstów wejściowych i potencjalnie różnych modeli AI (jeśli wybór jest możliwy).

### 4.3. Metryki do Monitorowania

- **Backend (API):**
  - Średni i maksymalny czas odpowiedzi (ms).
  - Przepustowość (requests per second/minute).
  - Wskaźnik błędów (%).
  - Zużycie zasobów serwera (CPU, RAM) - jeśli możliwe do monitorowania w środowisku testowym/produkcyjnym.
- **Frontend:**
  - Largest Contentful Paint (LCP).
  - First Contentful Paint (FCP).
  - Time to Interactive (TTI).
  - Cumulative Layout Shift (CLS).
  - Rozmiar zasobów (JS, CSS, obrazy).
- **Generowanie AI:**
  - Średni czas generowania fiszek (w sekundach) w zależności od wejścia.

### 4.4. Narzędzia

- k6 (preferowane dla testów API ze względu na JavaScript/TypeScript).
- Apache JMeter.
- Playwright (do pomiaru metryk frontendowych).
- Narzędzia deweloperskie przeglądarki (Lighthouse, Performance tab).
- Narzędzia monitoringu Supabase (jeśli dostępne).

## 5. Testowanie Bezpieczeństwa

### 5.1. Cele

- Identyfikacja i eliminacja podatności bezpieczeństwa.
- Zapewnienie poufności, integralności i dostępności danych użytkowników.
- Weryfikacja mechanizmów autentykacji i autoryzacji.

### 5.2. Obszary Testowania

- **Autentykacja i Zarządzanie Sesją:**
  - Weryfikacja procesu logowania i rejestracji (np. brak możliwości enumeracji użytkowników).
  - Testowanie mechanizmów resetowania hasła (jeśli istnieją).
  - Sprawdzenie czasu życia sesji i mechanizmów jej odświeżania/unieważniania (Supabase Auth).
  - Testowanie ochrony przed atakami typu brute-force na formularz logowania (rate limiting).
- **Autoryzacja:**
  - Weryfikacja ochrony tras (Astro middleware) - czy niezalogowany użytkownik może dostać się do chronionych stron?
  - Testowanie dostępu do danych - czy użytkownik A może odczytać/modyfikować dane użytkownika B? (Kluczowe jest testowanie polityk RLS w Supabase).
- **Walidacja Danych Wejściowych:**
  - Testowanie formularzy i endpointów API pod kątem podatności na Cross-Site Scripting (XSS) - wstrzykiwanie skryptów w pola tekstowe (nazwa zestawu, treść fiszki).
  - Testowanie pod kątem potencjalnych ataków typu SQL Injection (Supabase ORM/SDK zazwyczaj zapewnia ochronę, ale warto sprawdzić niestandardowe zapytania, jeśli istnieją).
  - Sprawdzenie walidacji typów i formatów danych po stronie serwera.
- **Bezpieczeństwo API:**
  - Ochrona kluczy API (Supabase, OpenRouter) - czy nie są eksponowane po stronie klienta? Czy są bezpiecznie przechowywane na serwerze?
  - Weryfikacja, czy endpointy API odpowiednio walidują przychodzące żądania i uprawnienia.
  - Testowanie mechanizmów rate limiting dla API (jeśli zaimplementowane).
- **Bezpieczeństwo Konfiguracji:**
  - Przegląd konfiguracji Supabase (polityki RLS, ustawienia autentykacji).
  - Sprawdzenie nagłówków HTTP związanych z bezpieczeństwem (CSP, HSTS, X-Frame-Options itp.) - konfigurowane na poziomie hostingu/Astro.
- **Bezpieczeństwo Zależności:**
  - Regularne skanowanie zależności projektu (`npm audit`, `yarn audit`) w poszukiwaniu znanych podatności.

### 5.3. Narzędzia

- OWASP ZAP (Zed Attack Proxy) lub Burp Suite (do skanowania i manualnej penetracji).
- Narzędzia deweloperskie przeglądarki (do inspekcji żądań/odpowiedzi, nagłówków).
- Skanery zależności (`npm audit`).
- Manualna inspekcja kodu i konfiguracji.
- Dokumentacja Supabase dotycząca bezpieczeństwa.

## 6. Harmonogram i Zasoby

_Poniższe estymacje są przykładowe i wymagają dostosowania do realiów projektu, rozmiaru zespołu i dostępnego czasu._

| Faza / Rodzaj Testów                     | Estymowany Czas (dni robocze / sprint)                           | Zasoby                                                    | Odpowiedzialność      |
| :--------------------------------------- | :--------------------------------------------------------------- | :-------------------------------------------------------- | :-------------------- |
| **Planowanie i Przygotowanie**           | 2-3 dni                                                          | Senior Tester, Tech Lead                                  | Senior Tester         |
| **Testy Jednostkowe**                    | Ciągłe (w trakcie developmentu)                                  | Deweloperzy, Środowisko CI                                | Deweloperzy           |
| **Testy Integracyjne**                   | 3-5 dni na sprint (zależnie od zmian)                            | Deweloperzy, Testerzy, Środowisko testowe                 | Deweloperzy, Testerzy |
| **Testy E2E (Automatyzacja)**            | 5-10 dni (początkowa konfiguracja) + 1-2 dni/sprint (utrzymanie) | Testerzy (automatyzujący), Narzędzia (Playwright/Cypress) | Testerzy              |
| **Testy Manualne/Eksploracyjne**         | 2-3 dni na sprint                                                | Testerzy                                                  | Testerzy              |
| **Testy Wydajnościowe**                  | 3-5 dni (przed kluczowymi wdrożeniami)                           | Testerzy, Narzędzia (k6), Środowisko testowe              | Testerzy              |
| **Testy Bezpieczeństwa**                 | 3-5 dni (przed kluczowymi wdrożeniami) + przeglądy ciągłe        | Testerzy (z wiedzą sec), Narzędzia (ZAP), Deweloperzy     | Testerzy, Deweloperzy |
| **Testy Regresji**                       | 1-3 dni (przed każdym wdrożeniem)                                | Testerzy, Zautomatyzowane testy                           | Testerzy              |
| **Testy Akceptacyjne Użytkownika (UAT)** | Zależne od klienta/PO                                            | Product Owner / Klient / Wybrani użytkownicy              | Product Owner         |

**Potrzebne zasoby:**

- **Ludzkie:** Minimum 1 Tester (preferowany z doświadczeniem w automatyzacji i bezpieczeństwie), Deweloperzy (do pisania testów jednostkowych i wsparcia).
- **Narzędzia:** System zarządzania testami (opcjonalnie), Narzędzia do automatyzacji (Vitest/Jest, Playwright/Cypress, k6), Narzędzia do testów bezpieczeństwa (OWASP ZAP), System kontroli wersji (Git), Platforma CI/CD (GitHub Actions).
- **Środowiska:**
  - Środowisko deweloperskie (lokalne).
  - Środowisko testowe/staging (odizolowane, ze zresetowaną bazą danych Supabase, skonfigurowanymi kluczami API do testów).
  - Środowisko produkcyjne.

## 7. Raportowanie Błędów i Proces Naprawy

### 7.1. Narzędzie do Śledzenia Błędów

Zalecane jest użycie dedykowanego narzędzia, np.:

- GitHub Issues (jeśli repozytorium jest na GitHubie).
- Jira.
- Inne narzędzie typu Bug Tracking System.

### 7.2. Cykl Życia Błędu

1.  **Zgłoszenie (Open/New):** Tester (lub inny członek zespołu) znajduje błąd i tworzy zgłoszenie w systemie śledzenia.
2.  **Analiza (Triage/Analysis):** Lead/Manager projektu lub wyznaczona osoba analizuje zgłoszenie, określa priorytet, ważność (severity) i przypisuje je do odpowiedniego dewelopera. Błąd może zostać odrzucony (Rejected) jeśli jest nieprawidłowy, zduplikowany lub działa zgodnie z projektem.
3.  **Naprawa (In Progress/Fixing):** Deweloper pracuje nad rozwiązaniem problemu.
4.  **Gotowe do Testów (Resolved/Fixed):** Deweloper oznacza błąd jako naprawiony i wdraża poprawkę na środowisko testowe.
5.  **Weryfikacja (Testing/Verification):** Tester sprawdza, czy błąd został poprawnie naprawiony na środowisku testowym.
6.  **Zamknięcie (Closed):** Jeśli weryfikacja przebiegła pomyślnie, tester zamyka zgłoszenie.
7.  **Ponowne Otwarcie (Reopened):** Jeśli błąd nadal występuje lub poprawka wprowadziła inne problemy, tester ponownie otwiera zgłoszenie, dodając odpowiedni komentarz.

### 7.3. Szablon Zgłoszenia Błędu

Każde zgłoszenie błędu powinno zawierać co najmniej:

- **Tytuł:** Krótki, zwięzły opis problemu.
- **Opis:** Szczegółowy opis błędu.
- **Kroki do Reprodukcji:** Numerowana lista kroków pozwalająca jednoznacznie odtworzyć błąd.
- **Oczekiwany Rezultat:** Jak aplikacja powinna się zachować.
- **Aktualny Rezultat:** Jak aplikacja zachowuje się w rzeczywistości.
- **Środowisko:** Gdzie błąd wystąpił (np. Przeglądarka Chrome 125, Windows 11, Środowisko Staging).
- **Priorytet:** (np. Krytyczny, Wysoki, Średni, Niski) - jak pilna jest naprawa.
- **Ważność (Severity):** (np. Blocker, Critical, Major, Minor, Trivial) - jak duży wpływ ma błąd na działanie aplikacji.
- **Załączniki:** Screenshoty, nagrania wideo, logi z konsoli przeglądarki lub serwera.
- **Przypisany:** Osoba odpowiedzialna za naprawę.
- **Wersja aplikacji:** (Jeśli dotyczy).

---

_Ten plan testów stanowi ramy dla procesu zapewnienia jakości aplikacji Flashcards Creator. Powinien być traktowany jako dokument żywy, aktualizowany w miarę rozwoju aplikacji i pojawiania się nowych wymagań._
