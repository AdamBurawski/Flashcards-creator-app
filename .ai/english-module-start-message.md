# Wiadomość startowa — wdrożenie modułu nauki j. angielskiego

Poniższy tekst skopiuj i wklej jako pierwszą wiadomość w nowej sesji Cursor Agent.

---

Twoim zadaniem jest wdrożenie modułu nauki języka angielskiego w aplikacji Flashcards-creator-app. Moduł realizuje konwersacyjną metodę nauki (dialog nauczyciel-uczeń) z odtwarzaniem audio, rozpoznawaniem mowy, oceną odpowiedzi przez AI i feedbackiem głosowym po polsku.

Pełna specyfikacja modułu: @Flashcards-creator-app/.ai/english-module-spec.md

Realizuj etapy wdrożenia zgodnie z kolejnością opisaną w sekcji 14 specyfikacji (7 etapów). W ramach jednej iteracji realizuj maksymalnie jeden etap. Po zakończeniu etapu:
1. Podsumuj krótko co zrobiłeś.
2. Opisz plan na kolejny etap.
3. Zatrzymaj pracę i czekaj na mój feedback.

Nie przechodź do kolejnego etapu bez mojej zgody.

Kontekst istniejącego kodu, który powinieneś znać i reużywać:
- Istniejący moduł nauki fiszek (wzorce UI): @Flashcards-creator-app/src/components/learning/LearningSession.tsx @Flashcards-creator-app/src/components/learning/SpeechRecognition.tsx @Flashcards-creator-app/src/components/learning/FlashcardCard.tsx
- Typy: @Flashcards-creator-app/src/types.ts
- Istniejące migracje DB: @Flashcards-creator-app/supabase/migrations/20240608152030_initial_schema.sql @Flashcards-creator-app/supabase/migrations/20250501_collections_table.sql
- Istniejące endpointy do reużycia wzorców: @Flashcards-creator-app/src/pages/api/learn/evaluate-answer.ts @Flashcards-creator-app/src/pages/api/learn/transcribe.ts
- Próbka danych wejściowych: @Flashcards-creator-app/src/english_module/rozmowki_stage1_lessons1-9.jsonl
- Reguły projektu: @Flashcards-creator-app/.cursor/rules/shared.mdc @Flashcards-creator-app/.cursor/rules/backend.mdc @Flashcards-creator-app/.cursor/rules/astro.mdc @Flashcards-creator-app/.cursor/rules/react.mdc @Flashcards-creator-app/.cursor/rules/frontend.mdc @Flashcards-creator-app/.cursor/rules/db-supabase-migrations.mdc @Flashcards-creator-app/.cursor/rules/api-supabase-astro-init.mdc

Zasady:
- Nie zmieniaj istniejącego kodu modułu fiszek, chyba że to konieczne (np. dodanie linku w nawigacji).
- Reużywaj istniejące wzorce — styl kodu, konwencje, struktura serwisów, format odpowiedzi API.
- Komentarze w kodzie po angielsku. Komunikaty UI po polsku. Zmienne i funkcje po angielsku.
- Jeśli masz pytania lub musisz przyjąć założenia — zadaj je przed pisaniem kodu.

Zacznij od Etapu 1: Fundament (baza danych + import danych + typy TypeScript).
