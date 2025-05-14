# Plan Implementacji Funkcjonalności: Interaktywna Sesja Nauki Fiszki (POST /learn/session)

## 1. Przegląd Funkcjonalności

Celem jest stworzenie interaktywnej sesji nauki dla użytkownika, która pozwoli na przeglądanie fiszek z wybranej kolekcji, odpowiadanie na pytania (za pomocą głosu, lub klawiatury), otrzymywanie oceny (docelowo przez LLM) i śledzenie postępów w ramach sesji. Strona nauki będzie działać w trybie pełnoekranowym.

## 2. Architektura Ogólna

Funkcjonalność będzie wymagała zmian zarówno po stronie frontendu (nowy komponent React, routing), jak i backendu (nowe endpointy API).

**Frontend (React w Astro):**

- Komponent pełnoekranowej sesji nauki (`LearningSession.tsx`).
- Logika zarządzania stanem sesji (aktualna fiszka, odpowiedzi, punktacja, stany ładowania).
- Integracja z API przeglądarki do nagrywania audio (SpeechRecognition API) lub bezpośrednio z API Whisper.
- Okno do wpisywania odpowiedzi
- Animacje (obracanie karty, zmiana tła).
- Routing w Astro do strony sesji nauki (np. `/learn/collection/{collectionId}`).

**Backend (Astro API Endpoints):**

- `GET /api/collections/{collectionId}/learn`: Endpoint do pobrania fiszek z danej kolekcji, przygotowanych do sesji nauki (w losowej kolejności).
- `POST /api/learn/evaluate-answer` (opcjonalnie, jeśli ocena LLM ma być po stronie serwera): Endpoint do przesłania pytania, oryginalnej odpowiedzi z fiszki i odpowiedzi użytkownika (transkrybowanej) w celu uzyskania oceny od LLM (gpt-4o-mini).

## 3. Szczegóły Implementacji Frontend (`src/components/learning/LearningSession.tsx`)

### 3.1. Struktura Komponentu i Stan

- Główny komponent `LearningSession` zarządzający całą sesją.
- Stany:
  - `currentFlashcardIndex`: Indeks aktualnie wyświetlanej fiszki.
  - `flashcards`: Tablica fiszek do nauczenia się w tej sesji.
  - `sessionScore`: Obiekt przechowujący liczbę poprawnych odpowiedzi i łączną liczbę pytań (np. `{ correct: 0, total: 0 }`).
  - `isRecording`: Boolean wskazujący, czy trwa nagrywanie odpowiedzi.
  - `userTranscript`: Tekstowa transkrypcja odpowiedzi użytkownika.
  - `isEvaluating`: Boolean wskazujący, czy trwa ocena odpowiedzi.
  - `evaluationResult`: Wynik oceny (np. `true` dla poprawnej, `false` dla błędnej).
  - `showAnswer`: Boolean kontrolujący, czy pokazać odpowiedź na fiszce.
  - `backgroundColor`: Aktualny losowy kolor tła.
  - `isLoading`: Boolean dla ogólnego stanu ładowania danych sesji.
  - `error`: Przechowywanie ewentualnych błędów.

### 3.2. Przepływ Użytkownika i Funkcje

1.  **Inicjalizacja Sesji:**
    - Po przejściu na stronę `/learn/collection/{collectionId}`, komponent pobiera fiszki używając `GET /api/collections/{collectionId}/learn`.
    - Ustawia pierwszą fiszkę i losowy kolor tła.
    - Inicjalizuje licznik punktów (np. 0/liczba fiszek).
2.  **Wyświetlanie Pytania:**
    - Pełnoekranowy widok z pytaniem (front fiszki) na środku (białe tło czarny tekst, border-radius: 30px, 1/3 szerokości ekranu, 400px wysokości).
    - Przycisk "Nagraj odpowiedź" (lub ikona mikrofonu).
    - Wyświetlanie licznika punktów (np. "1/5").
3.  **Nagrywanie i Transkrypcja Odpowiedzi (Docelowo):**
    - Po kliknięciu "Nagraj odpowiedź":
      - Prośba o dostęp do mikrofonu (jeśli jeszcze nie udzielono).
      - Rozpoczęcie nagrywania (wizualny wskaźnik).
      - Zakończenie nagrywania (automatycznie po chwili ciszy lub przez użytkownika).
      - Wysyłanie audio do API Whisper (bezpośrednio z klienta lub przez backend proxy, aby ukryć klucz API) lub użycie SpeechRecognition API przeglądarki.
      - Aktualizacja stanu `userTranscript` po otrzymaniu transkrypcji.
      - Wyświetlenie transkrypcji pod pytaniem.
4.  **Ocena Odpowiedzi (Docelowo przez LLM):**
    - Po uzyskaniu transkrypcji, następuje automatyczna ocena.
    - Wysyłanie `pytania`, `oczekiwanej odpowiedzi` i `userTranscript` do `POST /api/learn/evaluate-answer`
    - animacja ładowania odpowiedzi
    - Ustawienie `isEvaluating` na `true`.
    - Po otrzymaniu oceny:
      - Aktualizacja `evaluationResult`.
      - Aktualizacja `sessionScore`.
      - Ustawienie `showAnswer` na `true`.
5.  **Pokazanie Odpowiedzi i Wyniku:**
    - Animacja "obrotu karty".
    - Wyświetlenie poprawnej odpowiedzi (back fiszki).
    - Zmiana tła karty na zielone (poprawna odpowiedź) lub czerwone (błędna odpowiedź).
    - Przycisk "Następne pytanie".
6.  **Następne Pytanie:**
    - Po kliknięciu "Następne pytanie":
      - Przejście do kolejnej fiszki (`currentFlashcardIndex + 1`).
      - Reset stanów `userTranscript`, `evaluationResult`, `showAnswer`.
      - Ustawienie nowego losowego koloru tła.
7.  **Zakończenie Sesji:**
    - Po przejściu przez wszystkie fiszki, wyświetlenie podsumowania (np. "Zdobyłeś 4/5 punktów!").
    - Przyciski "Ucz się ponownie tej kolekcji" lub "Wróć do kolekcji".

### 3.3. Interfejs Użytkownika (UI)

- Minimalistyczny, pełnoekranowy design skupiający uwagę na fiszce.
- Duża, czytelna czcionka dla pytania i odpowiedzi.
- Jasne wizualne wskaźniki (nagrywanie, ładowanie, poprawność odpowiedzi).
- Płynne animacje.

### 3.4. MVP Rozważania dla Frontendu

- **MVP1:** Brak nagrywania i LLM. Użytkownik widzi pytanie, wpisuje odpowiedź, klika "Zatwierdź odpowiedź", następuje wyświetlenie poprawnej odpowiedzi (back fiszki, aktualizacja licznika). Ręczne przejście do następnego pytania. Losowe tło i animacja obrotu karty.
- **MVP2:** Dodanie nagrywania głosu i transkrypcji (np. przez Whisper). Transkrypcja wyświetlana, odpowiedź wysyłana do LLM do automatycznej oceny. Następuje wyświetlenie poprawnej odpowiedzi (back fiszki, aktualizacja licznika). Ręczne przejście do następnego pytania. Losowe tło i animacja obrotu karty.

## 4. Szczegóły Implementacji Backend (Astro API Endpoints)

### 4.1. `GET /api/collections/{collectionId}/learn`

- **Cel:** Pobranie fiszek dla sesji nauki z określonej kolekcji.
- **Parametry URL:** `collectionId` (ID kolekcji).
- **Autoryzacja:** Wymagane uwierzytelnienie użytkownika. Użytkownik musi być właścicielem kolekcji i mieć do niej dostęp.
- **Logika:**
  1.  Pobranie wszystkich fiszek należących do `collectionId` i `user_id`.
  2.  Opcjonalnie: Zastosowanie logiki wyboru/kolejności fiszek (losowy).
  3.  Zwrócenie tablicy obiektów fiszek (np. `id`, `front`, `back`).
- **Odpowiedź Sukces (200 OK):**
  ```json
  {
    "flashcards": [
      { "id": 1, "front": "Pytanie 1", "back": "Odpowiedź 1" },
      { "id": 2, "front": "Pytanie 2", "back": "Odpowiedź 2" }
      // ...
    ]
  }
  ```
- **Odpowiedzi Błędów:**
  - `401 Unauthorized`: Użytkownik niezalogowany.
  - `403 Forbidden`: Użytkownik nie ma dostępu do kolekcji.
  - `404 Not Found`: Kolekcja nie istnieje.
  - `500 Internal Server Error`.

### 4.2. `POST /api/learn/evaluate-answer` (Opcjonalny/Docelowy)

- **Cel:** Ocena odpowiedzi użytkownika przez LLM.
- **Autoryzacja:** Wymagane uwierzytelnienie użytkownika.
- **Request Body (JSON):**
  ```json
  {
    "questionText": "Tekst pytania z fiszki (front)",
    "expectedAnswerText": "Tekst oczekiwanej odpowiedzi z fiszki (back)",
    "userAnswerText": "Transkrypcja odpowiedzi użytkownika"
  }
  ```
- **Logika:**
  1.  Walidacja danych wejściowych.
  2.  Skonstruowanie odpowiedniego promptu dla LLM (np. GPT-4o-mini) zawierającego pytanie, oczekiwaną odpowiedź i odpowiedź użytkownika, z prośbą o ocenę poprawności (np. zwrot `true`/`false` ).
      - _Przykład promptu_: `"Oceń, czy odpowiedź użytkownika jest poprawna w kontekście pytania i oczekiwanej odpowiedzi. Odpowiedz tylko 'true' jeśli jest zasadniczo poprawna, lub 'false' w przeciwnym razie. Pytanie: '{questionText}'. Oczekiwana odpowiedź: '{expectedAnswerText}'. Odpowiedź użytkownika: '{userAnswerText}'."`
  3.  Wysłanie zapytania do API OpenAI.
  4.  Przetworzenie odpowiedzi LLM.
- **Odpowiedź Sukces (200 OK):**
  ```json
  {
    "isCorrect": true, // lub false
    "llmFeedback": "Opcjonalny, dodatkowy komentarz od LLM" // (rzadziej używane przy prostym true/false)
  }
  ```
- **Odpowiedzi Błędów:**
  - `400 Bad Request`: Błędne dane wejściowe.
  - `401 Unauthorized`.
  - `500 Internal Server Error` (np. błąd komunikacji z API OpenAI, błąd przetwarzania).
  - `503 Service Unavailable` (jeśli API OpenAI jest niedostępne).

## 5. Względy Bezpieczeństwa

- **Klucze API:** Klucze do API OpenAI (Whisper, GPT) **nie powinny być przechowywane ani używane bezpośrednio na frontendzie**. Jeśli transkrypcja/ocena ma się odbywać przez API OpenAI, należy stworzyć backendowe endpointy proxy, które będą bezpiecznie zarządzać kluczami.
- **Autoryzacja:** Wszystkie endpointy backendowe muszą być chronione i dostępne tylko dla zalogowanych użytkowników. Należy weryfikować prawa dostępu do kolekcji.
- **Walidacja Danych:** Dane wejściowe do API (ID kolekcji, teksty odpowiedzi) powinny być walidowane.

## 6. Obsługa Błędów (Frontend i Backend)

- **Frontend:**
  - Wyświetlanie komunikatów o błędach (np. problem z pobraniem fiszek, błąd transkrypcji, błąd oceny).
  - Obsługa braku dostępu do mikrofonu.
  - Stany ładowania dla operacji asynchronicznych.
- **Backend:**
  - Zwracanie odpowiednich kodów statusu HTTP.
  - Logowanie błędów po stronie serwera.

## 7. Potencjalne Ulepszenia (Poza MVP)

- Integracja z zaawansowanym algorytmem powtórek (Spaced Repetition).
- Możliwość wyboru trybu nauki (np. tylko nowe fiszki, tylko trudne).
- Bardziej szczegółowy feedback od LLM na temat odpowiedzi.
- Historia sesji nauki i statystyki.
- Ulepszenia dostępności (WCAG).

## 8. Etapy Wdrożenia (Sugerowane MVP)

1.  **Etap 1 (Podstawowy Interfejs Nauki - MVP1):**
    - Frontend: Stworzenie komponentu `LearningSession.tsx`. Routing. Pobieranie fiszek z kolekcji (zakładając istnienie prostego API `GET /api/collections/{collectionId}/learn` zwracającego wszystkie fiszki). Wyświetlanie pytania, okno tekstowe do udzielenia odpowiedzi, animacja obrotu. Odpowiedź od LLM (true/false), aktualizujące licznik. Przejście do następnej fiszki. Losowe tło.
    - Backend: Implementacja `GET /api/collections/{collectionId}/learn` (prosta wersja).
2.  \*\*Etap 2 (Transkrypcja Whisper przez backend proxy) do nagrywania i transkrypcji odpowiedzi. Wyświetlanie transkrypcji. Odpowiedź od LLM (true/false), aktualizujące licznik. Przejście do następnej fiszki. Losowe tło.
    - Backend (Whisper): Endpoint proxy dla Whisper.
3.  **Etap 3 (Ocena przez LLM - MVP3):**
    - Frontend: Logika wysyłania danych do oceny. Obsługa stanu ładowania oceny i wyniku.
    - Backend: Implementacja `POST /api/learn/evaluate-answer` z integracją GPT-4o-mini.
4.  **Etap 4 (Dopracowanie):**
    - Ulepszenie animacji, UI/UX.
    - Obsługa błędów.
    - Testy.
