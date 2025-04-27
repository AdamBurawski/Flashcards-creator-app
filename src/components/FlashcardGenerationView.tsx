import { useState } from "react";
import TextInputArea from "./TextInputArea";
import { Button } from "./ui/button";
import SkeletonLoader from "./SkeletonLoader";
import FlashcardList from "./FlashcardList";
import ErrorNotification from "./ErrorNotification";
import BulkSaveButton from "./BulkSaveButton";
import type {
  GenerateFlashcardsCommand,
  GenerationCreateResponseDto,
  FlashcardProposalDto,
  Source,
  FlashcardsCreateCommand,
} from "../types";

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
  // Stan dla ładowania podczas generowania fiszek
  const [isLoading, setIsLoading] = useState<boolean>(false);
  // Stan dla ładowania podczas zapisywania fiszek
  const [isSaving, setIsSaving] = useState<boolean>(false);
  // Stan dla komunikatu błędu
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Stan dla komunikatu sukcesu
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  // Stan dla propozycji fiszek otrzymanych z API
  const [flashcardProposals, setFlashcardProposals] = useState<FlashcardProposalViewModel[]>([]);
  // Stan dla ID generacji
  const [generationId, setGenerationId] = useState<number | null>(null);

  // Funkcja walidująca tekst wejściowy
  const isTextValid = (): boolean => {
    return sourceText.length >= 1000 && sourceText.length <= 10000;
  };

  // Obsługa akceptacji fiszki
  const handleAcceptFlashcard = (index: number) => {
    setFlashcardProposals((prevProposals) =>
      prevProposals.map((proposal, i) => (i === index ? { ...proposal, accepted: !proposal.accepted } : proposal))
    );
  };

  // Obsługa odrzucenia fiszki
  const handleRejectFlashcard = (index: number) => {
    setFlashcardProposals((prevProposals) => prevProposals.filter((_, i) => i !== index));
  };

  // Obsługa edycji fiszki
  const handleEditFlashcard = (index: number, front: string, back: string) => {
    setFlashcardProposals((prevProposals) =>
      prevProposals.map((proposal, i) =>
        i === index
          ? {
              ...proposal,
              front,
              back,
              edited: true,
              source: "ai-edited" as Source,
            }
          : proposal
      )
    );
  };

  // Funkcja obsługująca zapisywanie fiszek
  const handleSaveFlashcards = async (command: FlashcardsCreateCommand) => {
    if (command.flashcards.length === 0) {
      setErrorMessage("Brak fiszek do zapisania.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/flashcards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(command),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Wystąpił błąd podczas zapisywania fiszek.");
      }

      setSuccessMessage(`Pomyślnie zapisano ${command.flashcards.length} fiszek.`);

      // Opcjonalnie można przekierować użytkownika lub wyczyścić stan po zapisie
      // W tym przykładzie pozostawiamy stan, aby użytkownik mógł zobaczyć komunikat sukcesu
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Wystąpił nieznany błąd podczas zapisywania.");
    } finally {
      setIsSaving(false);
    }
  };

  // Funkcja obsługująca generowanie fiszek
  const handleGenerateFlashcards = async () => {
    if (!isTextValid()) {
      setErrorMessage("Tekst musi mieć długość od 1000 do 10000 znaków.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    // Resetowanie poprzednich propozycji przy nowej generacji
    setFlashcardProposals([]);
    setGenerationId(null);

    try {
      const command: GenerateFlashcardsCommand = {
        source_text: sourceText,
      };

      const response = await fetch("/api/generations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(command),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Wystąpił błąd podczas generowania fiszek.");
      }

      const data: GenerationCreateResponseDto = await response.json();

      // Przekształcenie propozycji fiszek do widoku z dodatkowymi flagami
      const viewModels: FlashcardProposalViewModel[] = data.flashcards_proposals.map((proposal) => ({
        ...proposal,
        accepted: false,
        edited: false,
      }));

      setFlashcardProposals(viewModels);
      setGenerationId(data.generation_id);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Wystąpił nieznany błąd.");
    } finally {
      setIsLoading(false);
    }
  };

  // Obsługa zamknięcia komunikatu błędu
  const handleDismissError = () => {
    setErrorMessage(null);
  };

  // Obsługa zamknięcia komunikatu sukcesu
  const handleDismissSuccess = () => {
    setSuccessMessage(null);
  };

  return (
    <div className="flex flex-col gap-6">
      <TextInputArea value={sourceText} onChange={setSourceText} isLoading={isLoading || isSaving} />

      {errorMessage && <ErrorNotification message={errorMessage} onDismiss={handleDismissError} />}

      {successMessage && (
        <div className="bg-green-100 border border-green-500 text-green-700 px-4 py-3 rounded-md relative">
          <div className="pr-8">{successMessage}</div>
          <button
            onClick={handleDismissSuccess}
            className="absolute top-3 right-3 text-green-700 hover:bg-green-200 rounded-full p-1"
            aria-label="Zamknij komunikat o sukcesie"
          >
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
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      )}

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
            onAccept={handleAcceptFlashcard}
            onReject={handleRejectFlashcard}
            onEdit={handleEditFlashcard}
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
