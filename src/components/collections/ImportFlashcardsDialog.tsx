import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { supabase } from "../../db/supabase.client";

interface ImportFlashcardsDialogProps {
  collectionId: number;
  onClose: () => void;
  onSuccess: () => void;
}

interface Generation {
  id: string;
  title: string;
  created_at: string;
  user_id: string;
}

interface Flashcard {
  id: number;
  front: string;
  back: string;
  source: string;
  generation_id: string;
  created_at: string;
}

export default function ImportFlashcardsDialog({ collectionId, onClose, onSuccess }: ImportFlashcardsDialogProps) {
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [selectedGeneration, setSelectedGeneration] = useState<string | null>(null);
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

        // Pobierz fiszki z wybranej generacji
        const { data, error } = await supabase
          .from("flashcards")
          .select("*")
          .eq("generation_id", selectedGeneration)
          .is("collection_id", null); // Tylko te, które nie są przypisane do kolekcji

        if (error) throw error;

        if (data) {
          setFlashcards(data);
          // Domyślnie wybierz wszystkie fiszki
          setSelectedFlashcards(data.map((f) => f.id));
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-semibold mb-4">Importuj wygenerowane fiszki</h3>

        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded">{error}</div>}

        {isLoading ? (
          <div className="py-10 text-center">
            <p className="text-gray-500">Ładowanie dostępnych fiszek...</p>
          </div>
        ) : generations.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-gray-500 mb-2">Brak wygenerowanych fiszek do importu</p>
            <p className="text-sm text-gray-400">Najpierw wygeneruj fiszki w zakładce "Generuj fiszki"</p>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Wybierz sesję generowania</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={selectedGeneration || ""}
                onChange={(e) => setSelectedGeneration(e.target.value)}
                disabled={isGenerationsLoading}
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
                  >
                    Zaznacz wszystkie
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={deselectAllFlashcards}
                    disabled={isFlashcardsLoading || selectedFlashcards.length === 0}
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
                <div className="mt-3 border border-gray-200 rounded-md divide-y max-h-[50vh] overflow-y-auto">
                  {flashcards.map((flashcard) => (
                    <div
                      key={flashcard.id}
                      className={`p-3 flex items-start gap-3 ${
                        selectedFlashcards.includes(flashcard.id) ? "bg-blue-50" : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        id={`flashcard-${flashcard.id}`}
                        checked={selectedFlashcards.includes(flashcard.id)}
                        onChange={() => toggleFlashcard(flashcard.id)}
                        className="mt-1"
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
              <Button type="button" onClick={onClose} variant="outline" disabled={isImporting}>
                Anuluj
              </Button>
              <Button onClick={importFlashcards} disabled={isImporting || selectedFlashcards.length === 0}>
                {isImporting ? "Importowanie..." : `Importuj wybrane fiszki (${selectedFlashcards.length})`}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
