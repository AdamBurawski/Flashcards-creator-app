import { useState } from "react";
import { Button } from "../ui/button";
import { supabase } from "../../db/supabase.client";
import ImportFlashcardsDialog from "./ImportFlashcardsDialog";

export default function NewCollectionButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [newCollectionId, setNewCollectionId] = useState<number | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setDebugInfo(null);

    if (!formData.name.trim()) {
      setError("Nazwa kolekcji jest wymagana");
      setIsSubmitting(false);
      return;
    }

    try {
      // Sprawdź, czy klient Supabase jest dostępny
      if (!supabase) {
        throw new Error("Klient Supabase nie jest dostępny");
      }

      // Sprawdź, czy użytkownik jest zalogowany
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        setDebugInfo({ type: "session_error", details: sessionError });
        throw new Error(`Błąd sesji: ${sessionError.message}`);
      }

      if (!sessionData.session?.user) {
        throw new Error("Musisz być zalogowany, aby utworzyć kolekcję");
      }

      const userId = sessionData.session.user.id;

      console.log("Próba utworzenia kolekcji:", {
        name: formData.name,
        description: formData.description,
        user_id: userId,
      });

      // Testowa próba sprawdzenia czy tabela istnieje
      const { data: testData, error: testError } = await supabase.from("collections").select("count").limit(1);

      if (testError) {
        setDebugInfo({ type: "table_check_error", details: testError });
        throw new Error(`Tabela 'collections' może nie istnieć: ${testError.message}`);
      }

      console.log("Tabela 'collections' istnieje, próba dodania rekordu...");

      // Utwórz nową kolekcję
      const { data, error } = await supabase
        .from("collections")
        .insert({
          name: formData.name,
          description: formData.description || "",
          user_id: userId,
          flashcard_count: 0,
        })
        .select();

      if (error) {
        setDebugInfo({ type: "insert_error", details: error });
        throw error;
      }

      if (!data || data.length === 0) {
        throw new Error("Nie otrzymano danych po utworzeniu kolekcji");
      }

      // Zapisz ID nowej kolekcji
      setNewCollectionId(data[0].id);

      // Pokaż komunikat o sukcesie
      setShowSuccessMessage(true);

      // Zapytaj, czy chcesz importować fiszki
      setTimeout(() => {
        setIsModalOpen(false);
        setIsImportDialogOpen(true);
      }, 1500);
    } catch (err) {
      console.error("Błąd podczas tworzenia kolekcji:", err);
      setError(err instanceof Error ? err.message : "Wystąpił błąd podczas tworzenia kolekcji");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinish = () => {
    // Wyczyść formularz
    setFormData({
      name: "",
      description: "",
    });
    setNewCollectionId(null);
    setShowSuccessMessage(false);

    // Odśwież stronę, aby pokazać nową kolekcję
    window.location.reload();
  };

  return (
    <>
      <Button
        onClick={() => setIsModalOpen(true)}
        className="flex items-center gap-2"
        data-test-id="new-collection-button"
      >
        <span>+</span> Nowa kolekcja
      </Button>

      {isModalOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          data-test-id="new-collection-modal"
        >
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">Utwórz nową kolekcję</h3>

            <form onSubmit={handleSubmit} data-test-id="new-collection-form">
              {error && (
                <div
                  className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded"
                  data-test-id="error-message"
                >
                  {error}
                </div>
              )}

              {showSuccessMessage && (
                <div
                  className="mb-4 p-3 bg-green-50 border border-green-200 text-green-600 rounded"
                  data-test-id="success-message"
                >
                  Kolekcja została utworzona pomyślnie!
                </div>
              )}

              {debugInfo && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded text-xs">
                  <p className="font-semibold">Informacje diagnostyczne:</p>
                  <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
                </div>
              )}

              <div className="mb-4">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Nazwa kolekcji
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="np. Język hiszpański - podstawy"
                  data-test-id="collection-name-input"
                />
              </div>

              <div className="mb-4">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Opis (opcjonalny)
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={3}
                  placeholder="Opisz zawartość lub cel tej kolekcji fiszek"
                  data-test-id="collection-description-input"
                />
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  variant="outline"
                  disabled={isSubmitting}
                  data-test-id="cancel-button"
                >
                  Anuluj
                </Button>
                <Button type="submit" disabled={isSubmitting} data-test-id="create-collection-button">
                  {isSubmitting ? "Tworzenie..." : "Utwórz kolekcję"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isImportDialogOpen && newCollectionId && (
        <ImportFlashcardsDialog
          collectionId={newCollectionId}
          onClose={handleFinish}
          onSuccess={handleFinish}
          data-test-id="import-flashcards-dialog"
        />
      )}
    </>
  );
}
