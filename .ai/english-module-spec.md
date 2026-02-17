# Specyfikacja Modułu Nauki Języka Angielskiego

## 1. Przegląd Modułu

Moduł nauki języka angielskiego to nowy, niezależny komponent aplikacji Flashcards-creator-app. Realizuje konwersacyjną metodę nauki języka angielskiego inspirowaną metodą bezpośrednią (Callan-like): lektor prowadzi dialog z uczniem, czyta pytania, czeka na odpowiedź głosową, a następnie udziela feedbacku po polsku — zarówno tekstowo, jak i głosowo.

**Kluczowe założenia:**
- Moduł jest **osobny od modułu fiszek** — fiszki służą do testów wiedzy, moduł angielski prowadzi konwersacyjne lekcje.
- Interfejs jest **audio-first** — zaprojektowany dla dzieci klas 0-3, które mogą nie czytać; tekst jest wyświetlany równolegle jako uzupełnienie.
- Jeden widok UI dla wszystkich grup wiekowych: audio + tekst, korekta transkrypcji, wyświetlanie pisowni.
- Dane dialogów (rozmówki) są dostarczane przez właściciela aplikacji w formacie JSONL i ładowane do bazy SQL.
- Audio nauczyciela (pytania, hinty) — **pre-generowane pliki statyczne** (ElevenLabs).
- Feedback AI (korekta, pochwała) — **generowany w locie** (LLM + ElevenLabs TTS streaming).

---

## 2. Zasady Dydaktyczne Modułu

Moduł stosuje zasady metody bezpośredniej w nauczaniu języka angielskiego:

1. **Pytanie-odpowiedź**: Nauczyciel zadaje pytania, uczeń odpowiada pełnym zdaniem z tą samą strukturą gramatyczną.
2. **Powtarzanie pytania**: Każde pytanie jest czytane dwukrotnie, aby uczeń miał drugą szansę na zrozumienie.
3. **Hint (podpowiedź)**: Nauczyciel mówi początek odpowiedzi, aby „popchnąć" ucznia do natychmiastowej odpowiedzi.
4. **Korekta przez imitację**: Feedback wskazuje błąd i podaje poprawną formę (np. „Nie _come_ — _comes_").
5. **Systematyczne powtórki**: Każda lekcja częściowo wraca do materiału z poprzednich lekcji, wprowadzając nowe słownictwo.
6. **Pełne zdania**: Uczeń zawsze odpowiada pełnym zdaniem, nie jednym słowem.
7. **Szybkie tempo**: Brak długich pauz — po odpowiedzi ucznia następuje natychmiastowy feedback i przejście do kolejnej tury.

---

## 3. Architektura Techniczna

### 3.1. Stos Technologiczny

| Warstwa | Technologia | Rola |
|---------|-------------|------|
| Frontend | React 19 w Astro 5 | Komponenty sesji lekcyjnej |
| Styling | Tailwind 4 + Shadcn/ui | UI komponentów |
| Backend API | Astro API Endpoints | Endpointy REST |
| Baza danych | Supabase PostgreSQL | Dialogi, postępy, audio mapping |
| Storage | Supabase Storage | Pre-generowane pliki audio (.mp3) |
| AI — feedback | OpenRouter (GPT-4o-mini) | Generowanie tekstu feedbacku |
| TTS — nauczyciel | ElevenLabs API (pre-generated) | Pytania, hinty — pliki statyczne |
| TTS — feedback | ElevenLabs API (real-time streaming) | Feedback po polsku w locie |
| STT — uczeń | Istniejący endpoint `/api/learn/transcribe` | Transkrypcja odpowiedzi głosowej |

### 3.2. Diagram Przepływu Danych

```
┌────────────────────────────────────────────────────────────────────────┐
│                        SESJA LEKCYJNA (Frontend)                       │
│                                                                        │
│  1. Pobierz dialogi lekcji ──→ GET /api/english/lessons/{id}/dialogues │
│  2. Odtwórz audio nauczyciela ──→ Supabase Storage (.mp3)             │
│  3. Nagraj odpowiedź ucznia ──→ POST /api/learn/transcribe (STT)      │
│  4. Wyświetl transkrypcję, pozwól edytować, klik "Wyślij"             │
│  5. Oceń odpowiedź ──→ POST /api/english/evaluate                     │
│     └→ LLM generuje feedback (tekst PL)                               │
│     └→ ElevenLabs TTS streaming (audio PL) ──→ odtworzenie            │
│  6. Zapisz postęp ──→ POST /api/english/progress                      │
│  7. Następna tura lub podsumowanie                                     │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Schemat Bazy Danych (Supabase PostgreSQL)

### 4.1. Tabela `english_dialogues`

Przechowuje dane dialogów (rozmówek) zaimportowanych z plików JSONL.

```sql
CREATE TABLE english_dialogues (
  id TEXT PRIMARY KEY,                  -- np. "S1-L01-D01"
  stage SMALLINT NOT NULL,              -- Callan Stage (1-12)
  lesson SMALLINT NOT NULL,             -- numer lekcji w ramach stage'a
  level TEXT NOT NULL                   -- CEFR: "A1", "A2", "B1", "B2"
    CHECK (level IN ('A1', 'A2', 'B1', 'B2')),
  title TEXT NOT NULL,                  -- tytuł dialogu, np. "Things around me"
  tags TEXT[] NOT NULL DEFAULT '{}',    -- tagi tematyczne, np. {"objects", "can-see"}
  target_vocab TEXT[] NOT NULL DEFAULT '{}',   -- docelowe słówka
  target_structures TEXT[] NOT NULL DEFAULT '{}', -- docelowe struktury gramatyczne
  turns JSONB NOT NULL,                 -- tablica tur dialogu (szczegóły w 4.4)
  revision_from TEXT[] DEFAULT '{}',    -- ID dialogów, do których ta lekcja wraca (powtórki)
  estimated_duration_seconds INT,       -- szacowany czas trwania dialogu w sekundach
  sort_order INT NOT NULL DEFAULT 0,    -- kolejność w ramach lekcji
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indeksy
CREATE INDEX idx_english_dialogues_level ON english_dialogues(level);
CREATE INDEX idx_english_dialogues_stage_lesson ON english_dialogues(stage, lesson);
CREATE INDEX idx_english_dialogues_tags ON english_dialogues USING GIN(tags);

-- Trigger: auto-update updated_at (reużycie istniejącej funkcji z initial_schema)
CREATE TRIGGER set_english_dialogues_updated_at
  BEFORE UPDATE ON english_dialogues
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
```

### 4.2. Tabela `english_progress`

Śledzi postępy użytkownika — rekordy ukończonych dialogów.

```sql
CREATE TABLE english_progress (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dialogue_id TEXT NOT NULL REFERENCES english_dialogues(id) ON DELETE CASCADE,
  score SMALLINT NOT NULL              -- procent poprawności (0-100)
    CHECK (score >= 0 AND score <= 100),
  total_turns SMALLINT NOT NULL,       -- łączna liczba tur ucznia
  correct_turns SMALLINT NOT NULL,     -- liczba poprawnych tur
  duration_seconds INT,                -- faktyczny czas trwania sesji
  completed_at TIMESTAMPTZ DEFAULT now()
);

-- Indeksy
CREATE INDEX idx_english_progress_user ON english_progress(user_id);
CREATE INDEX idx_english_progress_user_dialogue ON english_progress(user_id, dialogue_id);
CREATE INDEX idx_english_progress_completed ON english_progress(user_id, completed_at DESC);
```

### 4.3. Tabela `english_audio_files`

Mapowanie pre-generowanych plików audio na tury dialogów.

```sql
CREATE TABLE english_audio_files (
  id BIGSERIAL PRIMARY KEY,
  dialogue_id TEXT NOT NULL REFERENCES english_dialogues(id) ON DELETE CASCADE,
  turn_index SMALLINT NOT NULL,        -- indeks tury w tablicy turns (0-based)
  audio_type TEXT NOT NULL             -- "question", "question_repeat", "hint"
    CHECK (audio_type IN ('question', 'question_repeat', 'hint')),
  audio_url TEXT NOT NULL,             -- URL w Supabase Storage
  voice_id TEXT,                       -- ID głosu ElevenLabs
  duration_ms INT,                     -- czas trwania audio w milisekundach
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(dialogue_id, turn_index, audio_type)
);

-- Indeks
CREATE INDEX idx_english_audio_dialogue ON english_audio_files(dialogue_id);
```

### 4.4. Struktura JSONB pola `turns`

Pole `turns` w tabeli `english_dialogues` zawiera tablicę obiektów JSON opisujących tury dialogu. Każda tura ma inną strukturę w zależności od roli:

**Tura nauczyciela (`role: "teacher"`):**
```json
{
  "role": "teacher",
  "text": "Look at this. What can you see?",
  "repeat": true,
  "hint": "I can see a ..."
}
```
- `text` — tekst pytania/wypowiedzi nauczyciela (EN).
- `repeat` — czy pytanie ma być powtórzone (true = czytane 2x, jak w metodzie bezpośredniej).
- `hint` — opcjonalny początek odpowiedzi, który nauczyciel mówi po powtórzeniu pytania, aby „popchnąć" ucznia.

**Tura ucznia (`role: "student"`):**
```json
{
  "role": "student",
  "text": "I can see a cup.",
  "accept": [
    "I can see a cup.",
    "I see a cup.",
    "It's a cup.",
    "A cup."
  ]
}
```
- `text` — wzorcowa (idealna) odpowiedź ucznia (EN).
- `accept` — tablica akceptowalnych wariantów odpowiedzi do użycia w ocenie hybrydowej (exact match przed wywołaniem LLM).

### 4.5. RLS (Row Level Security)

```sql
-- english_dialogues: dostępne dla wszystkich zalogowanych użytkowników (read-only)
ALTER TABLE english_dialogues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read dialogues"
  ON english_dialogues FOR SELECT
  TO authenticated
  USING (true);

-- english_progress: użytkownicy widzą tylko swoje postępy
ALTER TABLE english_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own progress"
  ON english_progress FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own progress"
  ON english_progress FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- english_audio_files: dostępne dla wszystkich zalogowanych (read-only)
ALTER TABLE english_audio_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read audio files"
  ON english_audio_files FOR SELECT
  TO authenticated
  USING (true);
```

---

## 5. Endpointy API

### 5.1. `GET /api/english/levels`

Zwraca dostępne poziomy CEFR z liczbą lekcji i postępami użytkownika.

- **Autoryzacja:** Wymagane uwierzytelnienie.
- **Odpowiedź (200):**
```json
{
  "levels": [
    {
      "level": "A1",
      "total_lessons": 9,
      "total_dialogues": 45,
      "completed_dialogues": 12,
      "completion_percent": 27
    },
    {
      "level": "A2",
      "total_lessons": 12,
      "total_dialogues": 60,
      "completed_dialogues": 0,
      "completion_percent": 0
    }
  ]
}
```

**Logika:**
1. Pobierz unikalne poziomy z `english_dialogues`.
2. Policz dialogi per poziom.
3. Dołącz (LEFT JOIN) postępy z `english_progress` dla `user_id`.
4. Oblicz procent ukończenia (dialog uznany za ukończony, jeśli istnieje wpis w `english_progress` z `score >= 50`).

### 5.2. `GET /api/english/lessons?level={level}`

Zwraca listę lekcji dla wybranego poziomu z postępami użytkownika.

- **Autoryzacja:** Wymagane uwierzytelnienie.
- **Query params:** `level` (wymagane, jedno z: `A1`, `A2`, `B1`, `B2`).
- **Odpowiedź (200):**
```json
{
  "lessons": [
    {
      "lesson": 1,
      "stage": 1,
      "level": "A1",
      "dialogues": [
        {
          "id": "S1-L01-D01",
          "title": "Things around me: What can you see?",
          "tags": ["objects", "can-see"],
          "estimated_duration_seconds": 90,
          "completed": true,
          "best_score": 100
        },
        {
          "id": "S1-L01-D02",
          "title": "Where is it? near / next to",
          "tags": ["prepositions", "where"],
          "estimated_duration_seconds": 90,
          "completed": false,
          "best_score": null
        }
      ],
      "total_dialogues": 5,
      "completed_dialogues": 1
    }
  ]
}
```

**Logika:**
1. Pobierz dialogi z `english_dialogues` WHERE `level = :level` ORDER BY `lesson`, `sort_order`.
2. LEFT JOIN z `english_progress` (najlepszy wynik per dialog) dla `user_id`.
3. Zgrupuj wyniki po numerze lekcji.

**Walidacja:**
- `level` musi być jedną z wartości: `A1`, `A2`, `B1`, `B2`. W przeciwnym razie zwróć 400.

### 5.3. `GET /api/english/lessons/{lessonId}/dialogues?level={level}&stage={stage}`

Zwraca pełne dane dialogów dla konkretnej lekcji, włącznie z turami i URL-ami audio.

- **Autoryzacja:** Wymagane uwierzytelnienie.
- **Parametry URL:** `lessonId` — numer lekcji (np. `1`).
- **Query params:** `level` (wymagane), `stage` (wymagane).
- **Odpowiedź (200):**
```json
{
  "lesson": 1,
  "stage": 1,
  "level": "A1",
  "dialogues": [
    {
      "id": "S1-L01-D01",
      "title": "Things around me: What can you see?",
      "tags": ["objects", "can-see"],
      "target_vocab": ["cup", "spoon", "plate", "glass", "see", "can"],
      "target_structures": ["What can you see?", "I can see a/an ..."],
      "estimated_duration_seconds": 90,
      "turns": [
        {
          "index": 0,
          "role": "teacher",
          "text": "Look at this. What can you see?",
          "repeat": true,
          "hint": "I can see a ...",
          "audio": {
            "question": "https://storage.supabase.co/.../teacher_turn_0.mp3",
            "question_repeat": "https://storage.supabase.co/.../teacher_turn_0_repeat.mp3",
            "hint": "https://storage.supabase.co/.../hint_turn_0.mp3"
          }
        },
        {
          "index": 1,
          "role": "student",
          "text": "I can see a cup.",
          "accept": ["I can see a cup.", "I see a cup.", "It's a cup.", "A cup."]
        },
        {
          "index": 2,
          "role": "teacher",
          "text": "Is it a glass?",
          "repeat": true,
          "hint": "No, it isn't ...",
          "audio": {
            "question": "https://storage.supabase.co/.../teacher_turn_2.mp3",
            "question_repeat": "https://storage.supabase.co/.../teacher_turn_2_repeat.mp3",
            "hint": "https://storage.supabase.co/.../hint_turn_2.mp3"
          }
        },
        {
          "index": 3,
          "role": "student",
          "text": "No, it isn't a glass. It's a cup.",
          "accept": ["No, it isn't a glass. It's a cup.", "No, it isn't. It's a cup.", "No, it's a cup."]
        }
      ]
    }
  ]
}
```

**Logika:**
1. Pobierz dialogi z `english_dialogues` WHERE `lesson = :lessonId AND level = :level AND stage = :stage` ORDER BY `sort_order`.
2. LEFT JOIN z `english_audio_files` po `dialogue_id`.
3. Złóż obiekty tur z URL-ami audio (dopasowanie po `turn_index` i `audio_type`).

### 5.4. `POST /api/english/evaluate`

Ocena odpowiedzi ucznia z generowaniem feedbacku głosowego.

- **Autoryzacja:** Wymagane uwierzytelnienie.
- **Request Body (JSON):**
```json
{
  "dialogue_id": "S1-L01-D01",
  "turn_index": 1,
  "expected_answer": "I can see a cup.",
  "accepted_answers": ["I can see a cup.", "I see a cup.", "It's a cup."],
  "user_answer": "I can see a pen.",
  "target_structures": ["What can you see?", "I can see a/an ..."],
  "context": {
    "teacher_question": "Look at this. What can you see?",
    "lesson_title": "Things around me: What can you see?"
  }
}
```

- **Odpowiedź (200):**
```json
{
  "is_correct": false,
  "feedback_text": "Prawie dobrze! Dobrze użyłeś struktury 'I can see a...', ale w tej lekcji mówimy o kubku. Posłuchaj: I can see a cup.",
  "feedback_audio_url": "data:audio/mpeg;base64,...",
  "correct_answer": "I can see a cup.",
  "correction_details": {
    "grammar_ok": true,
    "vocabulary_ok": false,
    "structure_ok": true
  }
}
```

**Logika:**
1. **Walidacja** danych wejściowych (Zod schema).
2. **Exact match** — porównaj `user_answer` (znormalizowany: lowercase, trimmed, bez podwójnych spacji) z tablicą `accepted_answers`. Jeśli jest dokładne dopasowanie → `is_correct: true`, feedback = krótka pochwała.
3. **AI evaluation (jeśli brak exact match)** — wyślij do LLM (GPT-4o-mini przez OpenRouter):

```
System prompt:
"Jesteś asystentem nauczyciela angielskiego dla polskich dzieci (wiek 6-12 lat).
Oceniasz odpowiedź ucznia na pytanie nauczyciela w dialogu konwersacyjnym.

Zasady:
- Odpowiedz w formacie JSON.
- Pole 'is_correct' (boolean): true jeśli odpowiedź jest poprawna gramatycznie i sensownie, nawet jeśli nie jest identyczna z wzorcem.
- Pole 'feedback_text' (string): krótki feedback PO POLSKU (max 2 zdania), przyjazny dla dziecka.
  - Jeśli poprawna: krótka pochwała, np. 'Świetnie!', 'Bardzo dobrze!', 'Super!'
  - Jeśli błędna: delikatna korekta wskazująca błąd i podająca poprawną formę. Np. 'Prawie! Zamiast X powiedz Y.'
- Pole 'grammar_ok' (boolean): czy gramatyka jest poprawna.
- Pole 'vocabulary_ok' (boolean): czy użyte słownictwo jest poprawne w kontekście.
- Pole 'structure_ok' (boolean): czy struktura zdania jest zgodna z ćwiczoną.
- Bądź DELIKATNY i ZACHĘCAJĄCY. To jest dziecko. Nigdy nie mów, że odpowiedź jest 'zła'. Używaj 'prawie', 'spróbuj', 'posłuchaj'."

User prompt:
"Pytanie nauczyciela: {teacher_question}
Oczekiwana odpowiedź: {expected_answer}
Ćwiczona struktura: {target_structures}
Odpowiedź ucznia: {user_answer}

Oceń odpowiedź ucznia."
```

4. **TTS feedbacku** — tekst feedbacku wyślij do ElevenLabs API (model `eleven_multilingual_v2`, streaming):
   - Głos: polski, ciepły, przyjazny (wybrany voice_id z ElevenLabs).
   - Zwróć audio jako base64-encoded data URL lub streaming response.
   - Jeśli feedback zawiera angielskie frazy (np. poprawna odpowiedź), model multilingual obsłuży przełączenie języków.

**Walidacja (Zod):**
```typescript
const evaluateSchema = z.object({
  dialogue_id: z.string().min(1),
  turn_index: z.number().int().min(0),
  expected_answer: z.string().min(1),
  accepted_answers: z.array(z.string()).min(1),
  user_answer: z.string().min(1).max(500),
  target_structures: z.array(z.string()),
  context: z.object({
    teacher_question: z.string(),
    lesson_title: z.string(),
  }),
});
```

**Obsługa błędów:**
- 400: Błędne dane wejściowe.
- 401: Brak autoryzacji.
- 500: Błąd komunikacji z LLM lub ElevenLabs.
- 503: Usługa AI niedostępna.

### 5.5. `POST /api/english/progress`

Zapisuje wynik ukończonego dialogu.

- **Autoryzacja:** Wymagane uwierzytelnienie.
- **Request Body (JSON):**
```json
{
  "dialogue_id": "S1-L01-D01",
  "total_turns": 3,
  "correct_turns": 2,
  "duration_seconds": 85
}
```

- **Odpowiedź (201):**
```json
{
  "id": 42,
  "dialogue_id": "S1-L01-D01",
  "score": 67,
  "total_turns": 3,
  "correct_turns": 2,
  "duration_seconds": 85,
  "completed_at": "2026-02-09T14:30:00Z"
}
```

**Logika:**
1. Walidacja danych wejściowych.
2. Oblicz `score` = `Math.round((correct_turns / total_turns) * 100)`.
3. INSERT do `english_progress`.
4. Zwróć zapisany rekord.

### 5.6. `GET /api/english/progress?level={level}`

Pobiera podsumowanie postępów użytkownika.

- **Autoryzacja:** Wymagane uwierzytelnienie.
- **Query params:** `level` (opcjonalne — filtruj po poziomie CEFR).
- **Odpowiedź (200):**
```json
{
  "summary": {
    "total_dialogues_completed": 15,
    "total_time_seconds": 2400,
    "average_score": 78,
    "current_streak_days": 3
  },
  "by_level": [
    {
      "level": "A1",
      "completed": 12,
      "total": 45,
      "average_score": 82
    }
  ],
  "recent_sessions": [
    {
      "dialogue_id": "S1-L01-D01",
      "title": "Things around me",
      "score": 100,
      "completed_at": "2026-02-09T14:30:00Z"
    }
  ]
}
```

---

## 6. Integracja z ElevenLabs API

### 6.1. Pre-generowanie audio nauczyciela (offline/build-time)

Audio dla tur nauczyciela jest generowane z wyprzedzeniem i przechowywane w Supabase Storage. Proces jest uruchamiany manualnie lub skryptem.

**Konfiguracja:**
- Model TTS: `eleven_multilingual_v2`
- Głos nauczyciela: angielski, neutralny akcent (np. voice_id z ElevenLabs — do wyboru: `Rachel`, `Adam` lub inny odpowiedni)
- Format wyjściowy: MP3, 64kbps
- Sample rate: 22050 Hz

**Struktura plików w Supabase Storage:**
```
english-audio/
  S1/
    L01/
      D01/
        teacher_turn_0.mp3          ← pytanie: "Look at this..."
        teacher_turn_0_repeat.mp3   ← powtórzenie pytania
        hint_turn_0.mp3             ← hint: "I can see a..."
        teacher_turn_2.mp3          ← drugie pytanie
        teacher_turn_2_repeat.mp3
        hint_turn_2.mp3
      D02/
        ...
```

**Bucket:** `english-audio` (publiczny dostęp do odczytu dla zalogowanych użytkowników).

### 6.2. Real-time TTS dla feedbacku (runtime)

Feedback po polsku jest generowany w locie. Aby zminimalizować opóźnienie, używamy streamingu.

**Flow:**
1. Backend otrzymuje tekst feedbacku z LLM.
2. Backend wywołuje ElevenLabs TTS API ze streamingiem.
3. Backend zwraca audio jako base64 data URL w odpowiedzi JSON (prostsze) LUB jako streaming response (niższe opóźnienie).

**Konfiguracja TTS dla feedbacku:**
- Model: `eleven_multilingual_v2` (obsługuje mix PL/EN)
- Głos: polski, ciepły, zachęcający (osobny voice_id od nauczyciela EN)
- Stability: 0.5 (naturalność)
- Similarity boost: 0.75

**Endpoint ElevenLabs do użycia:**
```
POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}
Headers:
  xi-api-key: {ELEVENLABS_API_KEY}
  Content-Type: application/json
Body:
  {
    "text": "Bardzo dobrze! Świetna odpowiedź!",
    "model_id": "eleven_multilingual_v2",
    "voice_settings": {
      "stability": 0.5,
      "similarity_boost": 0.75
    }
  }
```

### 6.3. Zmienne środowiskowe

Dodać do `.env`:
```
ELEVENLABS_API_KEY=...
ELEVENLABS_TEACHER_VOICE_ID=...       # głos nauczyciela (EN)
ELEVENLABS_FEEDBACK_VOICE_ID=...      # głos feedbacku (PL)
```

---

## 7. Transkrypcja Mowy Ucznia (STT)

Moduł wykorzystuje **istniejący endpoint** `/api/learn/transcribe` do transkrypcji odpowiedzi głosowej ucznia.

### 7.1. Konfiguracja dla języka angielskiego

Istniejący endpoint transkrypcji musi obsługiwać parametr języka. Jeśli obecna implementacja tego nie wspiera, należy dodać:

- **Parametr:** `language: "en"` w request body.
- **Whisper API:** parametr `language=en` wymusza transkrypcję w języku angielskim (lepsza dokładność niż autodetekcja).

### 7.2. Flow transkrypcji

1. Użytkownik klika przycisk mikrofonu → rozpoczyna nagrywanie.
2. Wizualny wskaźnik nagrywania (pulsujący mikrofon).
3. Użytkownik klika ponownie → kończy nagrywanie.
4. Audio jest wysyłane do `/api/learn/transcribe` z `language: "en"`.
5. Transkrypcja wraca i wyświetla się na ekranie.
6. Użytkownik może ręcznie poprawić transkrypcję (edycja tekstu).
7. Użytkownik klika "Wyślij" → odpowiedź trafia do `/api/english/evaluate`.

---

## 8. Struktura Komponentów Frontend

### 8.1. Nowe Strony Astro

1. **`src/pages/english/index.astro`** — strona główna modułu angielskiego: wybór poziomu CEFR.
2. **`src/pages/english/[level].astro`** — lista lekcji dla wybranego poziomu.
3. **`src/pages/english/lesson/[level]/[stage]/[lesson].astro`** — sesja lekcyjna (pełnoekranowa).

### 8.2. Nowe Komponenty React

Wszystkie komponenty umieszczane w `src/components/english/`.

#### 8.2.1. `EnglishLevelSelector.tsx`

Wyświetla dostępne poziomy CEFR z kartami postępów.

- Pobiera dane z `GET /api/english/levels`.
- Wyświetla karty per poziom (A1, A2, B1, B2) z paskiem postępu.
- Kliknięcie kieruje do `/english/{level}`.

#### 8.2.2. `EnglishLessonList.tsx`

Lista lekcji dla wybranego poziomu.

- Pobiera dane z `GET /api/english/lessons?level={level}`.
- Wyświetla lekcje z dialogami, tagami, szacowanym czasem.
- Oznacza ukończone/nieukończone dialogi (ikonka check / kłódka / w toku).
- Kliknięcie dialogu kieruje do sesji lekcyjnej.

#### 8.2.3. `EnglishLessonSession.tsx`

**Główny komponent sesji lekcyjnej** — odpowiednik `LearningSession.tsx` z modułu fiszek, ale dostosowany do konwersacyjnego flow.

**Stan komponentu:**
```typescript
interface LessonSessionState {
  dialogues: EnglishDialogue[];         // dane dialogów z API
  currentDialogueIndex: number;         // indeks aktualnego dialogu
  currentTurnIndex: number;             // indeks aktualnej tury
  phase: 'teacher_speaking' | 'student_turn' | 'evaluating' | 'feedback' | 'summary';
  userAnswer: string;                   // transkrypcja / tekst odpowiedzi
  isRecording: boolean;                 // czy trwa nagrywanie
  evaluationResult: EvaluationResult | null;
  sessionScore: { correct: number; total: number };
  isLoading: boolean;
  error: string | null;
  sessionStartTime: number;
}
```

**Flow wewnątrz komponentu (per tura):**

```
phase: 'teacher_speaking'
  → Odtwórz audio pytania nauczyciela (question.mp3)
  → Odtwórz powtórzenie (question_repeat.mp3)
  → Odtwórz hint (hint.mp3)
  → Przejdź do phase: 'student_turn'

phase: 'student_turn'
  → Wyświetl przycisk mikrofonu + pole tekstowe
  → Użytkownik nagrywa/wpisuje odpowiedź
  → Klik "Wyślij" → przejdź do phase: 'evaluating'

phase: 'evaluating'
  → Wyślij do POST /api/english/evaluate
  → Wyświetl spinner/animację oczekiwania
  → Po otrzymaniu wyniku → przejdź do phase: 'feedback'

phase: 'feedback'
  → Odtwórz audio feedbacku (z odpowiedzi API)
  → Wyświetl tekst feedbacku na ekranie
  → Wyświetl poprawną odpowiedź (jeśli błędna)
  → Przycisk "Dalej" → następna tura nauczyciela LUB następny dialog LUB summary

phase: 'summary'
  → Wyświetl podsumowanie (wynik, czas, słówka)
  → POST /api/english/progress (zapisz wynik)
  → Przyciski: "Powtórz lekcję", "Następna lekcja", "Wróć do listy"
```

#### 8.2.4. `TeacherBubble.tsx`

Wyświetla wypowiedź nauczyciela z animacją.

- Tekst pytania wyświetlany w „chmurce" czatu.
- Wizualny wskaźnik odtwarzania audio (ikonka głośnika, animacja falowa).
- Przycisk „Powtórz" (replay audio).

#### 8.2.5. `StudentAnswerInput.tsx`

Pole do udzielenia odpowiedzi przez ucznia.

- Przycisk mikrofonu (duży, wyraźny) do nagrywania.
- Pole tekstowe z transkrypcją (edytowalne).
- Przycisk „Wyślij" (duży, kolorowy).
- Stany: idle → recording (pulsujący mikrofon) → transcribing (spinner) → ready (tekst widoczny, przycisk Wyślij aktywny).

#### 8.2.6. `FeedbackDisplay.tsx`

Wyświetla feedback po ocenie.

- Ikona: zielony check (poprawna) / pomarańczowy hint (do poprawy).
- Tekst feedbacku po polsku.
- Poprawna odpowiedź (jeśli błędna) — wyróżniona wizualnie.
- Wizualny wskaźnik odtwarzania audio feedbacku.

#### 8.2.7. `LessonSummary.tsx`

Podsumowanie ukończonej lekcji/dialogu.

- Tabela wyników: poprawne/błędne tury, procent, czas.
- Lista przerobionego słownictwa (`target_vocab`).
- Przyciski nawigacyjne: „Powtórz", „Następna lekcja", „Wróć".

#### 8.2.8. `AudioPlayer.tsx`

Reużywalny komponent do odtwarzania audio.

- Przyjmuje URL audio (pre-generated) lub base64 data (real-time feedback).
- Obsługuje: play, pause, replay.
- Callback `onEnded` — informuje komponent nadrzędny o zakończeniu odtwarzania.
- Vizualny wskaźnik odtwarzania.

### 8.3. Modyfikacja Istniejących Komponentów

#### 8.3.1. Nawigacja (Header)

Dodać link do modułu angielskiego w nawigacji:
- Nowy element w `src/components/Header.astro`: link „Angielski" (lub ikona flagi UK) prowadzący do `/english`.
- Link widoczny tylko dla zalogowanych użytkowników.

#### 8.3.2. Middleware — ochrona tras

Dodać trasy modułu angielskiego do `protectedRoutes` w `src/middleware/protected-routes.ts`:
```typescript
const protectedRoutes = [
  "/collections",
  "/english",     // NOWE
  // ...
];
```

### 8.4. Stylowanie i UX

- Pastelowe, ciepłe kolory tła sesji (jak w `LearningSession` — losowy pastelowy kolor, zmiana po każdym dialogu).
- Duże, czytelne czcionki (min. 18px dla tekstu, 24px+ dla pytań).
- Duże przyciski dotykowe (min. 48x48px touch target).
- Wyraźne ikony wskaźników stanu (mikrofon, spinner, check, hint).
- Responsywność: pełnoekranowy widok na mobile i desktop.
- Animacje: płynne przejścia między turami, pulsowanie mikrofonu podczas nagrywania.

---

## 9. Typy TypeScript

Dodać do `src/types.ts` lub utworzyć dedykowany `src/types/english.ts`:

```typescript
// ============================================
// English Module Types
// ============================================

export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2';

export interface EnglishDialogue {
  id: string;
  stage: number;
  lesson: number;
  level: CEFRLevel;
  title: string;
  tags: string[];
  target_vocab: string[];
  target_structures: string[];
  turns: DialogueTurn[];
  revision_from: string[];
  estimated_duration_seconds: number;
  sort_order: number;
}

export type DialogueTurn = TeacherTurn | StudentTurn;

export interface TeacherTurn {
  index: number;
  role: 'teacher';
  text: string;
  repeat: boolean;
  hint?: string;
  audio?: {
    question: string;        // URL do .mp3
    question_repeat?: string; // URL do .mp3
    hint?: string;           // URL do .mp3
  };
}

export interface StudentTurn {
  index: number;
  role: 'student';
  text: string;              // wzorcowa odpowiedź
  accept: string[];          // akceptowalne warianty
}

export interface EvaluationResult {
  is_correct: boolean;
  feedback_text: string;
  feedback_audio_url?: string; // base64 data URL audio feedbacku
  correct_answer: string;
  correction_details: {
    grammar_ok: boolean;
    vocabulary_ok: boolean;
    structure_ok: boolean;
  };
}

export interface EnglishProgress {
  id: number;
  user_id: string;
  dialogue_id: string;
  score: number;
  total_turns: number;
  correct_turns: number;
  duration_seconds: number;
  completed_at: string;
}

export interface LevelSummary {
  level: CEFRLevel;
  total_lessons: number;
  total_dialogues: number;
  completed_dialogues: number;
  completion_percent: number;
}

export interface LessonOverview {
  lesson: number;
  stage: number;
  level: CEFRLevel;
  dialogues: DialogueOverview[];
  total_dialogues: number;
  completed_dialogues: number;
}

export interface DialogueOverview {
  id: string;
  title: string;
  tags: string[];
  estimated_duration_seconds: number;
  completed: boolean;
  best_score: number | null;
}

// DTO for POST /api/english/evaluate
export interface EvaluateAnswerCommand {
  dialogue_id: string;
  turn_index: number;
  expected_answer: string;
  accepted_answers: string[];
  user_answer: string;
  target_structures: string[];
  context: {
    teacher_question: string;
    lesson_title: string;
  };
}

// DTO for POST /api/english/progress
export interface SaveProgressCommand {
  dialogue_id: string;
  total_turns: number;
  correct_turns: number;
  duration_seconds: number;
}
```

---

## 10. Serwisy Backend

### 10.1. `src/lib/services/english.service.ts`

Serwis odpowiedzialny za logikę biznesową modułu angielskiego:

- `getLevels(userId: string): Promise<LevelSummary[]>` — pobiera poziomy z postępami.
- `getLessons(userId: string, level: CEFRLevel): Promise<LessonOverview[]>` — pobiera lekcje.
- `getDialoguesForLesson(lesson: number, level: CEFRLevel, stage: number): Promise<EnglishDialogue[]>` — pobiera dialogi z audio.
- `saveProgress(userId: string, data: SaveProgressCommand): Promise<EnglishProgress>` — zapisuje postęp.
- `getProgressSummary(userId: string, level?: CEFRLevel): Promise<ProgressSummary>` — podsumowanie postępów.

### 10.2. `src/lib/services/english-evaluator.service.ts`

Serwis odpowiedzialny za ocenę odpowiedzi:

- `evaluateAnswer(data: EvaluateAnswerCommand): Promise<EvaluationResult>` — główna metoda:
  1. Próba exact match.
  2. Fallback do LLM.
  3. Generowanie TTS feedbacku.

### 10.3. `src/lib/services/elevenlabs.service.ts`

Serwis do komunikacji z ElevenLabs API:

- `generateSpeech(text: string, voiceId: string, options?: TTSOptions): Promise<Buffer>` — generowanie audio.
- `generateSpeechBase64(text: string, voiceId: string): Promise<string>` — generowanie audio jako base64 data URL.

---

## 11. Format Danych Wejściowych (JSONL)

Dialogi dostarczane przez właściciela aplikacji w formacie JSONL. Każda linia to osobny obiekt JSON reprezentujący jeden dialog.

### 11.1. Wymagana struktura rekordu JSONL

```json
{
  "id": "S1-L01-D01",
  "stage": 1,
  "lesson": 1,
  "level": "A1",
  "title": "Things around me: What can you see?",
  "tags": ["objects", "can-see", "questions"],
  "target_vocab": ["cup", "spoon", "plate", "glass", "see", "can"],
  "target_structures": ["What can you see?", "I can see a/an ...", "Is it a ...?"],
  "turns": [
    {"role": "teacher", "text": "Look at this. What can you see?", "repeat": true, "hint": "I can see a ..."},
    {"role": "student", "text": "I can see a cup.", "accept": ["I can see a cup.", "I see a cup.", "A cup."]},
    {"role": "teacher", "text": "Is it a glass?", "repeat": true, "hint": "No, it isn't ..."},
    {"role": "student", "text": "No, it isn't a glass. It's a cup.", "accept": ["No, it isn't a glass. It's a cup.", "No, it isn't. It's a cup."]}
  ],
  "revision_from": [],
  "estimated_duration_seconds": 90
}
```

### 11.2. Zasady walidacji

- `id`: format `S{stage}-L{lesson:02d}-D{dialogue:02d}`, unikalny.
- `stage`: 1-12.
- `lesson`: dodatnia liczba całkowita.
- `level`: jedno z `A1`, `A2`, `B1`, `B2`.
- `turns`: tablica o parzystej długości (naprzemiennie teacher/student), minimum 2 tury.
- Każda tura `student` musi mieć niepustą tablicę `accept`.
- Każda tura `teacher` musi mieć niepusty `text`.

### 11.3. Skrypt importu

Należy stworzyć skrypt CLI (`scripts/import-english-dialogues.ts`) do importu danych z JSONL do tabeli `english_dialogues`:

1. Wczytaj plik JSONL linia po linii.
2. Waliduj każdy rekord.
3. Upsert do tabeli `english_dialogues` (ON CONFLICT DO UPDATE).
4. Raportuj: ile dodanych, ile zaktualizowanych, ile z błędami.

---

## 12. Obsługa Błędów

### 12.1. Frontend

| Scenariusz | Obsługa |
|-----------|---------|
| Brak dostępu do mikrofonu | Komunikat z instrukcją włączenia + fallback na wpisywanie tekstu |
| Błąd transkrypcji | Komunikat „Nie udało się rozpoznać mowy. Spróbuj ponownie lub wpisz odpowiedź." |
| Błąd oceny (API) | Komunikat „Problem z oceną. Spróbuj ponownie." + przycisk retry |
| Błąd audio (brak pliku) | Wyświetl tekst pytania bez audio + komunikat |
| Timeout ElevenLabs TTS | Wyświetl feedback jako tekst bez audio |
| Brak połączenia z internetem | Komunikat o braku sieci |

### 12.2. Backend

| Kod | Scenariusz |
|-----|-----------|
| 400 | Błędne dane wejściowe (walidacja Zod) |
| 401 | Brak autoryzacji |
| 404 | Nie znaleziono dialogu/lekcji |
| 500 | Błąd serwera (DB, wewnętrzny) |
| 502 | Błąd komunikacji z LLM (OpenRouter) |
| 503 | Usługa niedostępna (ElevenLabs/OpenRouter down) |

---

## 13. Bezpieczeństwo

1. **Klucze API:** `ELEVENLABS_API_KEY` i klucze OpenRouter przechowywane wyłącznie po stronie serwera (zmienne środowiskowe). Nigdy nie eksponowane na frontendzie.
2. **Autoryzacja:** Wszystkie endpointy `/api/english/*` chronione — wymagana sesja Supabase Auth.
3. **RLS:** Polityki Row Level Security na tabelach `english_progress` (użytkownik widzi tylko swoje dane).
4. **Rate limiting:** Endpoint `/api/english/evaluate` powinien mieć rate limit (np. max 60 req/min per user), aby zapobiec nadużyciom API LLM/TTS.
5. **Walidacja danych:** Wszystkie dane wejściowe walidowane przez Zod schemas.
6. **Wielkość audio:** Limit wielkości nagrywanego audio (np. max 30s, ~500KB) aby zapobiec nadużyciom.

---

## 14. Etapy Wdrożenia

### Etap 1: Fundament (baza danych + import danych)
1. Migracja SQL: utworzenie tabel `english_dialogues`, `english_progress`, `english_audio_files`.
2. Polityki RLS.
3. Skrypt importu JSONL → `english_dialogues`.
4. Typy TypeScript (`src/types/english.ts`).

### Etap 2: Backend API (CRUD + odczyt)
1. Endpoint `GET /api/english/levels`.
2. Endpoint `GET /api/english/lessons`.
3. Endpoint `GET /api/english/lessons/{id}/dialogues`.
4. Endpoint `POST /api/english/progress`.
5. Endpoint `GET /api/english/progress`.
6. Serwis `english.service.ts`.

### Etap 3: Frontend — nawigacja i lista lekcji
1. Strona `/english` z `EnglishLevelSelector`.
2. Strona `/english/[level]` z `EnglishLessonList`.
3. Dodanie linku „Angielski" do nawigacji (Header).
4. Dodanie tras do protected routes.

### Etap 4: Frontend — sesja lekcyjna (core)
1. Strona `/english/lesson/[level]/[stage]/[lesson]`.
2. Komponent `EnglishLessonSession` z pełnym flow tur.
3. Komponent `TeacherBubble` — wyświetlanie tekstu nauczyciela.
4. Komponent `StudentAnswerInput` — nagrywanie + wpisywanie odpowiedzi.
5. Komponent `FeedbackDisplay` — wyświetlanie feedbacku.
6. Komponent `LessonSummary` — podsumowanie.
7. Komponent `AudioPlayer` — odtwarzanie audio.

### Etap 5: Integracja audio — pre-generated
1. Konfiguracja Supabase Storage (bucket `english-audio`).
2. Serwis `elevenlabs.service.ts`.
3. Skrypt generowania audio nauczyciela z dialogów.
4. Upload audio do Supabase Storage.
5. Zasilenie tabeli `english_audio_files`.
6. Integracja odtwarzania audio w `TeacherBubble`.

### Etap 6: Integracja AI — ocena + TTS feedbacku
1. Serwis `english-evaluator.service.ts` (exact match + LLM fallback).
2. Endpoint `POST /api/english/evaluate`.
3. Integracja ElevenLabs TTS real-time dla feedbacku.
4. Integracja feedbacku głosowego w `FeedbackDisplay`.

### Etap 7: Dopracowanie
1. Obsługa błędów (frontend + backend).
2. Rate limiting na endpoincie evaluate.
3. Testy (unit + integracyjne + e2e).
4. Dopracowanie UI/UX, animacje, responsywność.
5. Optymalizacja (cache audio, preload następnego dialogu).

---

## 15. Mapowanie Stage → CEFR

Na podstawie oficjalnej tabeli Callan Method:

| Stage(s) | CEFR | Cambridge Exam | Opis |
|----------|------|----------------|------|
| 1–2 | A1 | — | Beginner |
| 3 | A1/A2 | — | Elementary |
| 4–5 | A2/B1 | KET/PET | Pre-intermediate |
| 6–7 | B1/B2 | PET/FCE | Intermediate |
| 8–9 | B2 | FCE | Upper-intermediate |

Użytkownik wybiera poziom CEFR (A1–B2). System mapuje go na odpowiednie stage'e i wyświetla dostępne lekcje.

---

## 16. Konfiguracja Środowiskowa

Nowe zmienne środowiskowe do dodania w `.env`:

```env
# ElevenLabs TTS
ELEVENLABS_API_KEY=el-...
ELEVENLABS_TEACHER_VOICE_ID=...          # głos EN nauczyciela (pre-gen)
ELEVENLABS_FEEDBACK_VOICE_ID=...         # głos PL feedbacku (real-time)
ELEVENLABS_MODEL_ID=eleven_multilingual_v2
```

Istniejące zmienne (używane bez zmian):
- `OPENROUTER_API_KEY` — do generowania feedbacku przez LLM.
- `SUPABASE_URL`, `SUPABASE_KEY` — dostęp do bazy i storage.
