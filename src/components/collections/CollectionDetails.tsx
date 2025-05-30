import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { formatDate } from "../../lib/date-helpers";
import FlashcardItem from "./FlashcardItem";
import { supabase } from "../../db/supabase.client";
import ImportFlashcardsDialog from "./ImportFlashcardsDialog";

interface Flashcard {
  id: number;
  front: string;
  back: string;
  source: string;
  collection_id: number;
  created_at: string;
  updated_at: string;
}

interface Collection {
  id: number;
  name: string;
  description: string;
  user_id: string;
  flashcard_count: number;
  created_at: string;
  updated_at: string;
}

interface CollectionDetailsProps {
  collection: Collection;
  flashcards: Flashcard[];
}

export default function CollectionDetails({ collection, flashcards }: CollectionDetailsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedCollection, setEditedCollection] = useState({ ...collection });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [formattedCreatedAtDate, setFormattedCreatedAtDate] = useState(collection.created_at);

  useEffect(() => {
    setFormattedCreatedAtDate(formatDate(collection.created_at));
  }, [collection.created_at]);

  // Obsługa edycji kolekcji
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditedCollection((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const { error } = await supabase
        .from("collections")
        .update({
          name: editedCollection.name,
          description: editedCollection.description,
        })
        .eq("id", collection.id);

      if (error) throw error;

      setSuccess("Kolekcja została zaktualizowana.");
      setIsEditing(false);
      // Odśwież stronę po 1.5s
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      console.error("Błąd podczas aktualizacji kolekcji:", err);
      setError("Nie udało się zaktualizować kolekcji.");
    } finally {
      setIsSaving(false);
    }
  };

  // Obsługa usuwania kolekcji
  const handleDeleteCollection = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      // Najpierw usuwamy powiązane fiszki
      const { error: flashcardsError } = await supabase.from("flashcards").delete().eq("collection_id", collection.id);

      if (flashcardsError) throw flashcardsError;

      // Następnie usuwamy samą kolekcję
      const { error: collectionError } = await supabase.from("collections").delete().eq("id", collection.id);

      if (collectionError) throw collectionError;

      setSuccess("Kolekcja została pomyślnie usunięta.");

      // Przekieruj użytkownika na stronę główną kolekcji po usunięciu
      setTimeout(() => {
        window.location.href = "/collections";
      }, 1500);
    } catch (err) {
      console.error("Błąd podczas usuwania kolekcji:", err);
      setError("Nie udało się usunąć kolekcji. Spróbuj ponownie później.");
      setIsDeleting(false);
    }
  };

  return (
    <div>
      {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-600 rounded">{success}</div>}

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded">{error}</div>}

      {/* Nagłówek kolekcji */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        {!isEditing ? (
          <>
            <div className="flex justify-between items-start">
              <h1 className="text-2xl font-bold">{collection.name}</h1>
              <div className="flex gap-2">
                <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
                  Edytuj
                </Button>
                <Button
                  onClick={() => setShowDeleteConfirmation(true)}
                  variant="outline"
                  size="sm"
                  className="bg-red-50 text-red-600 hover:bg-red-100 border-red-200"
                >
                  Usuń kolekcję
                </Button>
              </div>
            </div>
            {collection.description && <p className="text-gray-600 mt-2">{collection.description}</p>}
            <div className="mt-4 text-sm text-gray-500">Utworzono: {formattedCreatedAtDate}</div>
          </>
        ) : (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Edytuj kolekcję</h2>
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Nazwa kolekcji
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                value={editedCollection.name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Opis
              </label>
              <textarea
                id="description"
                name="description"
                value={editedCollection.description || ""}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" onClick={() => setIsEditing(false)} variant="outline" disabled={isSaving}>
                Anuluj
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? "Zapisywanie..." : "Zapisz zmiany"}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Lista fiszek */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Fiszki ({flashcards.length})</h2>
          <div>
            <Button className="mr-2" asChild>
              <a href={`/flashcards/add?collection=${collection.id}`}>Dodaj fiszki</a>
            </Button>
            <Button variant="secondary" className="mr-2" onClick={() => setIsImportDialogOpen(true)}>
              Importuj wygenerowane fiszki
            </Button>
            {flashcards.length > 0 && (
              <Button style={{ backgroundColor: "purple" }} variant="outline" asChild>
                <a href={`/learn/collection/${collection.id}`}>Rozpocznij naukę</a>
              </Button>
            )}
          </div>
        </div>

        {flashcards.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">Brak fiszek w tej kolekcji</p>
            <Button asChild>
              <a href={`/flashcards/add?collection=${collection.id}`}>Dodaj pierwsze fiszki</a>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {flashcards.map((flashcard) => (
              <FlashcardItem key={flashcard.id} flashcard={flashcard} collectionId={collection.id} />
            ))}
          </div>
        )}
      </div>

      {/* Dialog importu fiszek */}
      {isImportDialogOpen && (
        <ImportFlashcardsDialog
          collectionId={collection.id}
          onClose={() => setIsImportDialogOpen(false)}
          onSuccess={() => {
            setSuccess("Fiszki zostały zaimportowane do kolekcji.");
            setIsImportDialogOpen(false);
            // Odśwież stronę po 1.5s
            setTimeout(() => {
              window.location.reload();
            }, 1500);
          }}
        />
      )}

      {/* Dialog potwierdzenia usunięcia kolekcji */}
      {showDeleteConfirmation && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          data-test-id="delete-collection-modal"
        >
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4 text-red-600">Usunąć kolekcję?</h3>

            <p className="mb-6">
              Czy na pewno chcesz usunąć kolekcję <strong>{collection.name}</strong>? Ta operacja spowoduje również
              usunięcie wszystkich fiszek ({flashcards.length}) w tej kolekcji. Tej operacji nie można cofnąć.
            </p>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                onClick={() => setShowDeleteConfirmation(false)}
                variant="outline"
                disabled={isDeleting}
                data-test-id="cancel-delete-button"
              >
                Anuluj
              </Button>
              <Button
                onClick={handleDeleteCollection}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 text-white"
                data-test-id="confirm-delete-button"
              >
                {isDeleting ? "Usuwanie..." : "Tak, usuń kolekcję"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
