+--------------------------------------------------+
| |
| STRUKTURA KOMPONENTÓW I ZALEŻNOŚCI |
| |
+--------------------------------------------------+

1. GŁÓWNE KOMPONENTY

---

src/components/
├── auth/
│ ├── LoginForm.tsx <- Formularz logowania
│ ├── RegisterForm.tsx <- Formularz rejestracji
│ ├── AuthCheck.tsx <- Weryfikacja autoryzacji
│ ├── AuthMenu.tsx <- Menu autoryzacji
│ ├── LogoutButton.tsx <- Przycisk wylogowania
│ ├── RequireAuth.tsx <- Komponent wymagający autoryzacji
│ ├── ResetPasswordForm.tsx <- Formularz resetu hasła
│ └── ForgotPasswordForm.tsx <- Formularz odzyskiwania hasła
│
├── collections/
│ ├── ImportFlashcardsDialog.tsx <- Dialog importu fiszek
│ ├── NewCollectionButton.tsx <- Przycisk nowej kolekcji
│ ├── CollectionDetails.tsx <- Szczegóły kolekcji
│ ├── FlashcardItem.tsx <- Element fiszki w kolekcji
│ └── CollectionsList.tsx <- Lista kolekcji
│
├── ui/ <- Komponenty Shadcn/ui
│ ├── avatar.tsx
│ ├── button.tsx
│ └── card.tsx
│
├── AuthMenu.tsx <- Menu autoryzacji (główny)
├── AuthStatus.tsx <- Status autoryzacji
├── BulkSaveButton.tsx <- Przycisk masowego zapisu
├── ErrorNotification.tsx <- Powiadomienie o błędzie
├── FlashcardGenerationView.tsx <- Widok generowania fiszek
├── FlashcardList.tsx <- Lista fiszek
├── FlashcardListItem.tsx <- Element listy fiszek
├── Header.astro <- Nagłówek aplikacji
├── SkeletonLoader.tsx <- Loader podczas ładowania
├── SuccessNotification.tsx <- Powiadomienie o sukcesie
├── TextInputArea.tsx <- Pole tekstowe
└── Welcome.astro <- Komponent powitalny

2. HOOKI I ZARZĄDZANIE STANEM

---

src/hooks/
├── useAuth.ts <- Hook autoryzacji
└── useGenerateFlashcards.ts <- Hook generowania fiszek

3. USŁUGI I POMOCNICZE FUNKCJE

---

src/lib/
├── ai.service.ts <- Serwis integracji z AI
├── date-helpers.ts <- Funkcje pomocnicze dla dat
├── error-logger.service.ts <- Serwis logowania błędów
├── flashcard.service.ts <- Serwis obsługi fiszek
├── generation.service.ts <- Serwis generowania fiszek
├── openrouter.service.ts <- Serwis OpenRouter API
└── utils.ts <- Funkcje pomocnicze

4. TYPY I DEFINICJE DANYCH

---

src/types.ts <- Wspólne typy i interfejsy:

- FlashcardDto <- DTO fiszki
- FlashcardCreateDto <- DTO tworzenia fiszki
- FlashcardsCreateCommand <- Komenda tworzenia fiszek
- GenerateFlashcardsCommand <- Komenda generowania fiszek
- FlashcardProposalDto <- DTO propozycji fiszki
- GenerationCreateResponseDto <- DTO odpowiedzi generowania
- Source ("ai-full", "ai-edited", "manual")

5. DOSTĘP DO BAZY DANYCH

---

src/db/
├── database.types.ts <- Typy bazy danych
└── supabase.client.ts <- Klient Supabase

6. GŁÓWNE PRZEPŁYWY DANYCH

---

1. Autoryzacja:
   [UI/AuthMenu] <-> [hooks/useAuth] <-> [API/auth] <-> [DB/Supabase]

2. Generowanie fiszek:
   [TextInputArea] -> [FlashcardGenerationView] ->
   [useGenerateFlashcards] -> [generation.service] ->
   [API] -> [FlashcardList] -> [FlashcardListItem]

3. Zapis fiszek:
   [BulkSaveButton] -> [flashcard.service] -> [API] -> [DB/Supabase]

4. Kolekcje:
   [CollectionsList] <-> [API/collections] <-> [DB/Supabase] <->
   [CollectionDetails] <-> [FlashcardItem]
