import { Button } from "./ui/button";
import type { FlashcardProposalViewModel } from "./FlashcardGenerationView";
import type { FlashcardCreateDto, FlashcardsCreateCommand } from "../types";

interface BulkSaveButtonProps {
  flashcards: FlashcardProposalViewModel[];
  generationId: number | null;
  onSave: (command: FlashcardsCreateCommand) => Promise<void>;
  isLoading: boolean;
}

const BulkSaveButton = ({ flashcards, generationId, onSave, isLoading }: BulkSaveButtonProps) => {
  // Sprawdzenie, czy są jakieś fiszki do zapisania
  if (flashcards.length === 0 || generationId === null) {
    return null;
  }

  // Sprawdzenie, czy są zaakceptowane fiszki
  const hasAcceptedFlashcards = flashcards.some((flashcard) => flashcard.accepted);

  // Przygotowanie funkcji do zapisywania wszystkich fiszek
  const handleSaveAll = async () => {
    const flashcardsToSave: FlashcardCreateDto[] = flashcards.map((flashcard) => ({
      front: flashcard.front,
      back: flashcard.back,
      source: flashcard.source,
      generation_id: generationId,
    }));

    await onSave({ flashcards: flashcardsToSave });
  };

  // Przygotowanie funkcji do zapisywania tylko zaakceptowanych fiszek
  const handleSaveAccepted = async () => {
    const flashcardsToSave: FlashcardCreateDto[] = flashcards
      .filter((flashcard) => flashcard.accepted)
      .map((flashcard) => ({
        front: flashcard.front,
        back: flashcard.back,
        source: flashcard.source,
        generation_id: generationId,
      }));

    await onSave({ flashcards: flashcardsToSave });
  };

  // Ikona zapisu jako SVG
  const SaveIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mr-2"
    >
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
      <polyline points="17 21 17 13 7 13 7 21"></polyline>
      <polyline points="7 3 7 8 15 8"></polyline>
    </svg>
  );

  return (
    <div className="mt-8 flex gap-4 justify-end">
      <Button
        variant="outline"
        onClick={handleSaveAll}
        disabled={isLoading || flashcards.length === 0}
        className="flex items-center"
      >
        <SaveIcon />
        Zapisz wszystkie ({flashcards.length})
      </Button>

      <Button onClick={handleSaveAccepted} disabled={isLoading || !hasAcceptedFlashcards} className="flex items-center">
        <SaveIcon />
        Zapisz zaakceptowane ({flashcards.filter((f) => f.accepted).length})
      </Button>
    </div>
  );
};

export default BulkSaveButton;
