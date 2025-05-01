-- Tworzenie tabeli dla kolekcji fiszek
CREATE TABLE IF NOT EXISTS public.collections (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  flashcard_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Dodanie indeksu dla szybszego wyszukiwania kolekcji użytkownika
CREATE INDEX IF NOT EXISTS collections_user_id_idx ON public.collections(user_id);

-- Automatyczne aktualizowanie pola updated_at
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_collections_updated_at ON public.collections;
CREATE TRIGGER update_collections_updated_at
BEFORE UPDATE ON public.collections
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

-- Dodanie relacji między fiszkami a kolekcjami
ALTER TABLE public.flashcards
ADD COLUMN IF NOT EXISTS collection_id BIGINT REFERENCES public.collections(id) ON DELETE SET NULL;

-- Dodanie indeksu dla szybszego wyszukiwania fiszek w kolekcji
CREATE INDEX IF NOT EXISTS flashcards_collection_id_idx ON public.flashcards(collection_id);

-- Funkcja do aktualizacji liczby fiszek w kolekcji
CREATE OR REPLACE FUNCTION update_collection_flashcard_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.collection_id IS NOT NULL THEN
      UPDATE public.collections
      SET flashcard_count = flashcard_count + 1
      WHERE id = NEW.collection_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.collection_id IS DISTINCT FROM NEW.collection_id THEN
      IF OLD.collection_id IS NOT NULL THEN
        UPDATE public.collections
        SET flashcard_count = flashcard_count - 1
        WHERE id = OLD.collection_id;
      END IF;
      
      IF NEW.collection_id IS NOT NULL THEN
        UPDATE public.collections
        SET flashcard_count = flashcard_count + 1
        WHERE id = NEW.collection_id;
      END IF;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.collection_id IS NOT NULL THEN
      UPDATE public.collections
      SET flashcard_count = flashcard_count - 1
      WHERE id = OLD.collection_id;
    END IF;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Dodanie triggerów do automatycznej aktualizacji licznika fiszek
DROP TRIGGER IF EXISTS flashcards_update_collection_count_insert ON public.flashcards;
CREATE TRIGGER flashcards_update_collection_count_insert
AFTER INSERT ON public.flashcards
FOR EACH ROW
EXECUTE FUNCTION update_collection_flashcard_count();

DROP TRIGGER IF EXISTS flashcards_update_collection_count_update ON public.flashcards;
CREATE TRIGGER flashcards_update_collection_count_update
AFTER UPDATE ON public.flashcards
FOR EACH ROW
EXECUTE FUNCTION update_collection_flashcard_count();

DROP TRIGGER IF EXISTS flashcards_update_collection_count_delete ON public.flashcards;
CREATE TRIGGER flashcards_update_collection_count_delete
AFTER DELETE ON public.flashcards
FOR EACH ROW
EXECUTE FUNCTION update_collection_flashcard_count();

-- RLS (Row Level Security) dla tabeli collections
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

-- Polityka dostępu - użytkownicy mogą widzieć tylko swoje kolekcje
DROP POLICY IF EXISTS collections_select_policy ON public.collections;
CREATE POLICY collections_select_policy ON public.collections
FOR SELECT
USING (auth.uid() = user_id);

-- Polityka dodawania - użytkownicy mogą dodawać własne kolekcje
DROP POLICY IF EXISTS collections_insert_policy ON public.collections;
CREATE POLICY collections_insert_policy ON public.collections
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Polityka aktualizacji - użytkownicy mogą aktualizować tylko swoje kolekcje
DROP POLICY IF EXISTS collections_update_policy ON public.collections;
CREATE POLICY collections_update_policy ON public.collections
FOR UPDATE
USING (auth.uid() = user_id);

-- Polityka usuwania - użytkownicy mogą usuwać tylko swoje kolekcje
DROP POLICY IF EXISTS collections_delete_policy ON public.collections;
CREATE POLICY collections_delete_policy ON public.collections
FOR DELETE
USING (auth.uid() = user_id); 