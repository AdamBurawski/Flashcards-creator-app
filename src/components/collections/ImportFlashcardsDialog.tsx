import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { supabase } from "../../db/supabase.client";
import type { FlashcardsCreateCommand } from "../../types";

interface ImportFlashcardsDialogProps {
  collectionId: number;
  onClose: () => void;
  onSuccess: () => void;
  flashcardsData?: FlashcardsCreateCommand | null;
}

interface Generation {
  id: number;
  title?: string;
  created_at: string;
  user_id: string;
  source_text_hash?: string;
  source_text_length?: number;
  model?: string;
  generation_duration?: number;
  generated_count?: number;
  accepted_edited_count?: number | null;
  accepted_unedited_count?: number | null;
  updated_at?: string;
}

interface Flashcard {
  id: number;
  front: string;
  back: string;
  source?: string;
  generation_id?: number | string;
  created_at?: string;
  [key: string]: unknown; // Dla dodatkowych pól zwracanych przez API
}

export default function ImportFlashcardsDialog({
  collectionId,
  onClose,
  onSuccess,
  flashcardsData,
}: ImportFlashcardsDialogProps) {
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [selectedGeneration, setSelectedGeneration] = useState<number | null>(null);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [selectedFlashcards, setSelectedFlashcards] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerationsLoading, setIsGenerationsLoading] = useState(true);
  const [isFlashcardsLoading, setIsFlashcardsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pobierz wygenerowane sesje użytkownika
  useEffect(() => {
    async function fetchGenerations() {
      setIsGenerationsLoading(true);
      try {
        if (!supabase) {
          throw new Error("Klient Supabase nie jest dostępny");
        }

        // Pobierz sesję użytkownika
        const { data: session, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!session?.session?.user) throw new Error("Musisz być zalogowany, aby importować fiszki");

        const userId = session.session.user.id;

        // Pobierz generacje użytkownika
        const { data, error } = await supabase
          .from("generations")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        if (error) throw error;

        if (data) {
          setGenerations(data);
          // Jeśli są jakieś generacje, wybierz pierwszą
          if (data.length > 0) {
            setSelectedGeneration(data[0].id);
          }
        }
      } catch (err) {
        console.error("Błąd podczas pobierania generacji:", err);
        setError(err instanceof Error ? err.message : "Nie udało się pobrać wygenerowanych sesji");
      } finally {
        setIsGenerationsLoading(false);
        setIsLoading(false);
      }
    }

    fetchGenerations();
  }, []);

  // Pobierz fiszki dla wybranej generacji
  useEffect(() => {
    async function fetchFlashcards() {
      if (!selectedGeneration) return;

      setIsFlashcardsLoading(true);
      setFlashcards([]);
      setSelectedFlashcards([]);

      try {
        if (!supabase) {
          throw new Error("Klient Supabase nie jest dostępny");
        }

        // Użyj funkcji RPC zamiast bezpośredniego zapytania
        const { data, error } = await supabase.rpc("get_available_flashcards_for_import", {
          gen_id: selectedGeneration,
        });

        if (error) throw error;

        if (data) {
          // Upewnij się, że dane z API mają wymagane pola dla typu Flashcard
          const validatedFlashcards = data.map((item: Record<string, unknown>) => ({
            id: item.id,
            front: item.front,
            back: item.back,
            source: item.source || "",
            generation_id: item.generation_id,
            created_at: item.created_at,
            // Pozostałe pola są zachowane dzięki [key: string]: any
            ...item,
          })) as Flashcard[];

          setFlashcards(validatedFlashcards);
          // Domyślnie wybierz wszystkie fiszki
          setSelectedFlashcards(validatedFlashcards.map((f) => f.id));
        }
      } catch (err) {
        console.error("Błąd podczas pobierania fiszek:", err);
        setError(err instanceof Error ? err.message : "Nie udało się pobrać fiszek");
      } finally {
        setIsFlashcardsLoading(false);
      }
    }

    fetchFlashcards();
  }, [selectedGeneration]);

  // Jeśli mamy przekazane dane fiszek, importujemy je od razu
  useEffect(() => {
    if (flashcardsData && flashcardsData.flashcards.length > 0) {
      directImportFlashcards();
    }
  }, []);

  // Obsługa zaznaczania/odznaczania fiszek
  const toggleFlashcard = (id: number) => {
    setSelectedFlashcards((prev) => {
      if (prev.includes(id)) {
        return prev.filter((fId) => fId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // Zaznacz wszystkie fiszki
  const selectAllFlashcards = () => {
    setSelectedFlashcards(flashcards.map((f) => f.id));
  };

  // Odznacz wszystkie fiszki
  const deselectAllFlashcards = () => {
    setSelectedFlashcards([]);
  };

  // Importuj wybrane fiszki do kolekcji
  const importFlashcards = async () => {
    if (selectedFlashcards.length === 0) {
      setError("Wybierz przynajmniej jedną fiszkę do importu");
      return;
    }

    setIsImporting(true);
    setError(null);

    try {
      if (!supabase) {
        throw new Error("Klient Supabase nie jest dostępny");
      }

      // Aktualizuj fiszki - przypisz je do kolekcji
      const { error } = await supabase
        .from("flashcards")
        .update({ collection_id: collectionId })
        .in("id", selectedFlashcards);

      if (error) throw error;

      onSuccess();
    } catch (err) {
      console.error("Błąd podczas importowania fiszek:", err);
      setError(err instanceof Error ? err.message : "Nie udało się zaimportować fiszek");
    } finally {
      setIsImporting(false);
    }
  };

  // Funkcja do bezpośredniego importu fiszek
  const directImportFlashcards = async () => {
    if (!flashcardsData || flashcardsData.flashcards.length === 0) {
      return;
    }

    setIsImporting(true);
    setError(null);

    try {
      if (!supabase) {
        throw new Error("Klient Supabase nie jest dostępny");
      }

      // Pobierz sesję użytkownika
      const { data: session, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session?.session?.user) throw new Error("Musisz być zalogowany, aby importować fiszki");

      const userId = session.session.user.id;

      // Przygotuj dane fiszek do zapisania w kolekcji
      const flashcardsToInsert = flashcardsData.flashcards.map((flashcard) => ({
        ...flashcard,
        collection_id: collectionId,
        user_id: userId,
      }));

      // Zapisz fiszki
      const { error } = await supabase.from("flashcards").insert(flashcardsToInsert);

      if (error) throw error;

      // Aktualizuj licznik fiszek w kolekcji
      await supabase.rpc("update_collection_flashcard_count", { collection_id: collectionId });

      onSuccess();
    } catch (err) {
      console.error("Błąd podczas importowania fiszek:", err);
      setError(err instanceof Error ? err.message : "Nie udało się zaimportować fiszek");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      data-test-id="import-flashcards-dialog"
    >
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-semibold mb-4">Importuj wygenerowane fiszki</h3>

        {error && (
          <div
            className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded"
            data-test-id="import-error-message"
          >
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="py-10 text-center">
            <p className="text-gray-500">Ładowanie dostępnych fiszek...</p>
          </div>
        ) : generations.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-gray-500 mb-2">Brak wygenerowanych fiszek do importu</p>
            <p className="text-sm text-gray-400">Najpierw wygeneruj fiszki w zakładce &quot;Generuj fiszki&quot;</p>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <label htmlFor="generation-select" className="block text-sm font-medium text-gray-700 mb-1">
                Wybierz sesję generowania
              </label>
              <select
                id="generation-select"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={selectedGeneration || ""}
                onChange={(e) => setSelectedGeneration(e.target.value ? parseInt(e.target.value) : null)}
                disabled={isGenerationsLoading}
                data-test-id="generation-select"
              >
                {generations.map((gen) => (
                  <option key={gen.id} value={gen.id}>
                    {gen.title || "Sesja"} ({new Date(gen.created_at).toLocaleString()})
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">Dostępne fiszki</h4>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={selectAllFlashcards}
                    disabled={isFlashcardsLoading || flashcards.length === 0}
                    data-test-id="select-all-flashcards"
                  >
                    Zaznacz wszystkie
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={deselectAllFlashcards}
                    disabled={isFlashcardsLoading || selectedFlashcards.length === 0}
                    data-test-id="deselect-all-flashcards"
                  >
                    Odznacz wszystkie
                  </Button>
                </div>
              </div>

              {isFlashcardsLoading ? (
                <div className="py-6 text-center">
                  <p className="text-gray-500">Ładowanie fiszek...</p>
                </div>
              ) : flashcards.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-gray-500">
                    Brak dostępnych fiszek do importu w tej sesji lub wszystkie zostały już przypisane do kolekcji
                  </p>
                </div>
              ) : (
                <div
                  className="mt-3 border border-gray-200 rounded-md divide-y max-h-[50vh] overflow-y-auto"
                  data-test-id="flashcards-list"
                >
                  {flashcards.map((flashcard) => (
                    <div
                      key={flashcard.id}
                      className={`p-3 flex items-start gap-3 ${
                        selectedFlashcards.includes(flashcard.id) ? "bg-blue-50" : ""
                      }`}
                      data-test-id={`flashcard-item-${flashcard.id}`}
                    >
                      <input
                        type="checkbox"
                        id={`flashcard-${flashcard.id}`}
                        checked={selectedFlashcards.includes(flashcard.id)}
                        onChange={() => toggleFlashcard(flashcard.id)}
                        className="mt-1"
                        data-test-id={`flashcard-checkbox-${flashcard.id}`}
                      />
                      <div>
                        <div className="font-medium">{flashcard.front}</div>
                        <div className="text-gray-600">{flashcard.back}</div>
                        {flashcard.source && (
                          <div className="text-xs text-gray-400 mt-1">Źródło: {flashcard.source}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button
                type="button"
                onClick={onClose}
                variant="outline"
                disabled={isImporting}
                data-test-id="close-import-dialog"
              >
                Anuluj
              </Button>
              <Button
                onClick={importFlashcards}
                disabled={isImporting || selectedFlashcards.length === 0}
                data-test-id="import-flashcards-button"
              >
                {isImporting ? "Importowanie..." : `Importuj wybrane fiszki (${selectedFlashcards.length})`}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
