# Prompt wdrożeniowy — Moduł Nauki Języka Angielskiego

Twoim zadaniem jest wdrożenie modułu nauki języka angielskiego w aplikacji Flashcards-creator-app. Moduł realizuje konwersacyjną metodę nauki (dialog nauczyciel-uczeń) z odtwarzaniem audio, rozpoznawaniem mowy, oceną odpowiedzi przez AI i feedbackiem głosowym po polsku. Twoim celem jest stworzenie solidnej, dobrze zorganizowanej implementacji, która zawiera odpowiednią walidację, obsługę błędów i podąża za wszystkimi krokami opisanymi w planie.

Najpierw dokładnie przejrzyj dostarczone materiały:

<implementation_plan>
@english-module-spec.md
</implementation_plan>

<existing_learning_module>
@src/components/learning/LearningSession.tsx
@src/components/learning/SpeechRecognition.tsx
@src/components/learning/FlashcardCard.tsx
</existing_learning_module>

<types>
@src/types.ts
</types>

<database_schema>
@supabase/migrations/20240608152030_initial_schema.sql
@supabase/migrations/20250501_collections_table.sql
</database_schema>

<existing_api_endpoints>
@src/pages/api/learn/evaluate-answer.ts
@src/pages/api/learn/transcribe.ts
@src/pages/api/collections/[id]/learn.ts
</existing_api_endpoints>

<implementation_rules>
@shared.mdc
@backend.mdc
@astro.mdc
@react.mdc
@frontend.mdc
@db-supabase-migrations.mdc
@api-supabase-astro-init.mdc
</implementation_rules>

<sample_data>
@src/english_module/rozmowki_stage1_lessons1-9.jsonl
</sample_data>

<implementation_approach>
Realizuj etapy wdrożenia zgodnie z kolejnością opisaną w sekcji 14 planu implementacji (Etapy Wdrożenia). W ramach jednej iteracji realizuj maksymalnie jeden etap (1 z 7). Po zakończeniu etapu:
1. Podsumuj krótko co zrobiłeś.
2. Opisz plan na kolejny etap.
3. Zatrzymaj pracę i czekaj na mój feedback.

Nie przechodź do kolejnego etapu bez mojej zgody.
</implementation_approach>

## Instrukcje wdrożenia

Wykonaj następujące kroki, realizując każdy etap planu:

### 1. Analiza przed implementacją (wykonaj na początku każdego etapu)
- Przeczytaj sekcję planu dotyczącą bieżącego etapu.
- Zidentyfikuj pliki do utworzenia/modyfikacji.
- Sprawdź istniejący kod, który możesz reużyć (szczególnie: istniejący moduł nauki fiszek, endpoint transkrypcji, endpoint oceny odpowiedzi).
- Zwróć uwagę na zależności od wcześniejszych etapów.

### 2. Baza danych (Etap 1)
- Utwórz migrację SQL w `supabase/migrations/` z konwencją nazewnictwa zgodną z istniejącymi plikami.
- Reużyj istniejącą funkcję `public.handle_updated_at()` do triggerów `updated_at`.
- Zaimplementuj polityki RLS zgodnie ze specyfikacją.
- Utwórz typy TypeScript w `src/types/english.ts` (nie w głównym `types.ts` — osobny plik dla modułu).
- Utwórz skrypt importu JSONL (`scripts/import-english-dialogues.ts`).

### 3. Backend API (Etap 2)
- Utwórz endpointy w `src/pages/api/english/`.
- Utwórz serwis `src/lib/services/english.service.ts`.
- Stosuj walidację Zod dla wszystkich danych wejściowych.
- Stosuj odpowiednie kody HTTP (200, 201, 400, 401, 404, 500, 502, 503).
- Reużyj wzorce z istniejących endpointów (autoryzacja, obsługa błędów, format odpowiedzi).

### 4. Frontend — nawigacja (Etap 3)
- Dodaj strony Astro w `src/pages/english/`.
- Dodaj komponenty React w `src/components/english/`.
- Zmodyfikuj `Header.astro` — dodaj link „Angielski".
- Dodaj trasy do protected routes w middleware.

### 5. Frontend — sesja lekcyjna (Etap 4)
- Zaimplementuj `EnglishLessonSession.tsx` jako główny komponent z maszyną stanów (phases: teacher_speaking → student_turn → evaluating → feedback → summary).
- Wzoruj się na `LearningSession.tsx` (pastelowe tła, paski postępu, podsumowanie), ale dostosuj do konwersacyjnego flow.
- Zaimplementuj komponenty podrzędne: `TeacherBubble`, `StudentAnswerInput`, `FeedbackDisplay`, `LessonSummary`, `AudioPlayer`.
- Reużyj `SpeechRecognition.tsx` do nagrywania odpowiedzi (skonfiguruj language: "en").

### 6. Integracja audio (Etap 5)
- Skonfiguruj Supabase Storage (bucket `english-audio`).
- Utwórz `src/lib/services/elevenlabs.service.ts`.
- Utwórz skrypt generowania audio nauczyciela z dialogów (offline).
- Zintegruj odtwarzanie pre-generated audio w `TeacherBubble` i `AudioPlayer`.

### 7. Integracja AI (Etap 6)
- Utwórz `src/lib/services/english-evaluator.service.ts` (exact match + LLM fallback).
- Zaimplementuj endpoint `POST /api/english/evaluate` z pełnym flow: walidacja → exact match → LLM → TTS feedbacku.
- Użyj promptu LLM ze specyfikacji (sekcja 5.4) — zachęcający, delikatny, po polsku.
- Zintegruj ElevenLabs real-time TTS (model `eleven_multilingual_v2`) do feedbacku głosowego.

### 8. Dopracowanie (Etap 7)
- Obsługa błędów (frontend + backend) zgodnie z tabelami w sekcji 12 specyfikacji.
- Rate limiting na endpoint evaluate.
- Testy.
- Dopracowanie UI/UX.

## Zasady ogólne

- **Nie zmieniaj istniejącego kodu** modułu fiszek, chyba że jest to konieczne (np. dodanie linku w nawigacji).
- **Reużywaj istniejące wzorce** — styl kodu, konwencje nazewnictwa, struktura serwisów, format odpowiedzi API.
- **Komentarze w kodzie** pisz po angielsku.
- **Komunikaty UI** pisz po polsku.
- **Zmienne i nazwy funkcji** zawsze po angielsku.
- **Testuj edge case'y**: brak audio, timeout API, pusta odpowiedź, brak mikrofonu.
- Jeśli musisz przyjąć założenia lub masz pytania — zadaj je przed pisaniem kodu.
