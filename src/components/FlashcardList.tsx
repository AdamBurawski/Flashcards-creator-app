import FlashcardListItem from "./FlashcardListItem";
import type { FlashcardProposalViewModel } from "../hooks/useGenerateFlashcards";

interface FlashcardListProps {
  flashcards: FlashcardProposalViewModel[];
  onAccept: (index: number) => void;
  onReject: (index: number) => void;
  onEdit: (index: number, front: string, back: string) => void;
}

const FlashcardList = ({ flashcards, onAccept, onReject, onEdit }: FlashcardListProps) => {
  if (flashcards.length === 0) {
    return null;
  }

  const acceptedCount = flashcards.filter((flashcard) => flashcard.accepted).length;

  return (
    <div className="mt-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Wygenerowane propozycje fiszek ({flashcards.length})</h2>
        <div className="text-sm text-muted-foreground">
          Zaakceptowano:{" "}
          <span className="font-medium">
            {acceptedCount}/{flashcards.length}
          </span>
        </div>
      </div>

      {flashcards.map((flashcard, index) => (
        <FlashcardListItem
          key={index}
          index={index}
          flashcard={flashcard}
          onAccept={onAccept}
          onReject={onReject}
          onEdit={onEdit}
        />
      ))}
    </div>
  );
};

export default FlashcardList;
