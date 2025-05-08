import { useState } from "react";
import TextInputArea from "./TextInputArea";
import { Button } from "./ui/button";
import SkeletonLoader from "./SkeletonLoader";
import FlashcardList from "./FlashcardList";
import ErrorNotification from "./ErrorNotification";
import SuccessNotification from "./SuccessNotification";
import BulkSaveButton from "./BulkSaveButton";
import { useGenerateFlashcards } from "../hooks/useGenerateFlashcards";
import type { Source, FlashcardsCreateCommand } from "../types";

// Rozszerzamy model widoku dla komponentów potomnych
export interface FlashcardProposalViewModel {
  front: string;
  back: string;
  source: Source;
  accepted: boolean;
  edited: boolean;
}

const FlashcardGenerationView = () => {
  // Stan dla tekstu wejściowego
  const [sourceText, setSourceText] = useState<string>("");

  // Hook obsługujący generowanie i zarządzanie fiszkami
  const {
    flashcardProposals,
    generationId,
    isLoading,
    isSaving,
    error,
    successMessage,
    generateFlashcards,
    saveFlashcards,
    acceptFlashcard,
    rejectFlashcard,
    editFlashcard,
    clearError,
    clearSuccess,
  } = useGenerateFlashcards();

  // Funkcja walidująca tekst wejściowy
  const isTextValid = (): boolean => {
    return sourceText.length >= 1000 && sourceText.length <= 10000;
  };

  // Obsługa generowania fiszek
  const handleGenerateFlashcards = async () => {
    await generateFlashcards(sourceText);
  };

  // Obsługa zapisywania fiszek
  const handleSaveFlashcards = async (command: FlashcardsCreateCommand) => {
    await saveFlashcards(command);
  };

  return (
    <div className="flex flex-col gap-6">
      <TextInputArea value={sourceText} onChange={setSourceText} isLoading={isLoading || isSaving} />

      {error && <ErrorNotification message={error} onDismiss={clearError} />}

      {successMessage && <SuccessNotification message={successMessage} onDismiss={clearSuccess} />}

      <div className="flex justify-end">
        <Button onClick={handleGenerateFlashcards} disabled={!isTextValid() || isLoading || isSaving}>
          {isLoading ? "Generowanie..." : "Generuj fiszki"}
        </Button>
      </div>

      {isLoading && <SkeletonLoader />}

      {!isLoading && flashcardProposals.length > 0 && (
        <>
          <FlashcardList
            flashcards={flashcardProposals}
            onAccept={acceptFlashcard}
            onReject={rejectFlashcard}
            onEdit={editFlashcard}
          />

          <BulkSaveButton
            flashcards={flashcardProposals}
            generationId={generationId}
            onSave={handleSaveFlashcards}
            isLoading={isSaving}
          />
        </>
      )}
    </div>
  );
};

export default FlashcardGenerationView;
