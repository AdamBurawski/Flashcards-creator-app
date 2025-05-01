import { useState } from "react";
import { Button } from "../ui/button";
import { supabase } from "../../db/supabase.client";

interface Flashcard {
  id: number;
  front: string;
  back: string;
  source: string;
  collection_id: number;
  created_at: string;
  updated_at: string;
}

interface FlashcardItemProps {
  flashcard: Flashcard;
  collectionId: number;
}

export default function FlashcardItem({ flashcard, collectionId }: FlashcardItemProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editedFlashcard, setEditedFlashcard] = useState({
    front: flashcard.front,
    back: flashcard.back,
  });
  const [error, setError] = useState<string | null>(null);

  const handleEdit = () => {
    setIsEditing(true);
    setIsFlipped(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedFlashcard({
      front: flashcard.front,
      back: flashcard.back,
    });
    setError(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditedFlashcard((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async () => {
    // Walidacja
    if (!editedFlashcard.front.trim() || !editedFlashcard.back.trim()) {
      setError("Obie strony fiszki muszą być wypełnione.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const { error } = await supabase
        .from("flashcards")
        .update({
          front: editedFlashcard.front,
          back: editedFlashcard.back,
        })
        .eq("id", flashcard.id);

      if (error) throw error;

      // Sukces - odśwież stronę
      window.location.reload();
    } catch (err) {
      console.error("Błąd podczas zapisywania fiszki:", err);
      setError("Nie udało się zapisać zmian.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm("Czy na pewno chcesz usunąć tę fiszkę?");
    if (!confirmed) return;

    setIsDeleting(true);
    setError(null);

    try {
      const { error } = await supabase.from("flashcards").delete().eq("id", flashcard.id);

      if (error) throw error;

      // Sukces - odśwież stronę
      window.location.reload();
    } catch (err) {
      console.error("Błąd podczas usuwania fiszki:", err);
      setError("Nie udało się usunąć fiszki.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isEditing) {
    return (
      <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
        {error && <div className="mb-3 p-2 bg-red-50 border border-red-200 text-red-600 rounded text-sm">{error}</div>}

        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">Przód</label>
          <textarea
            name="front"
            value={editedFlashcard.front}
            onChange={handleChange}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">Tył</label>
          <textarea
            name="back"
            value={editedFlashcard.back}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button onClick={handleCancel} variant="outline" size="sm" disabled={isSaving || isDeleting}>
            Anuluj
          </Button>
          <Button onClick={handleSave} size="sm" disabled={isSaving || isDeleting}>
            {isSaving ? "Zapisywanie..." : "Zapisz"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg hover:shadow-md transition">
      <div
        className={`p-4 cursor-pointer ${isFlipped ? "bg-gray-50" : "bg-white"}`}
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div className="flex justify-between items-start">
          <div className="flex-1">
            {!isFlipped ? (
              <p className="font-medium">{flashcard.front}</p>
            ) : (
              <div>
                <p className="text-gray-500 text-sm mb-1">Przód:</p>
                <p className="font-medium mb-2">{flashcard.front}</p>
                <p className="text-gray-500 text-sm mb-1">Tył:</p>
                <p>{flashcard.back}</p>
              </div>
            )}
          </div>
          <div className="flex gap-1 ml-3">
            <Button
              onClick={(e) => {
                e.stopPropagation();
                handleEdit();
              }}
              variant="ghost"
              size="sm"
            >
              Edytuj
            </Button>
            <Button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
              variant="ghost"
              size="sm"
              className="text-red-500"
              disabled={isDeleting}
            >
              {isDeleting ? "Usuwanie..." : "Usuń"}
            </Button>
          </div>
        </div>
        {!isFlipped && <p className="text-sm text-gray-500 mt-1">Kliknij, aby zobaczyć odpowiedź</p>}
      </div>
    </div>
  );
}
