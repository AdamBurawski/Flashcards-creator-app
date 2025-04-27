import { useState } from "react";
import TextInputArea from "./TextInputArea";
import { Button } from "./ui/button";
import SkeletonLoader from "./SkeletonLoader";
import FlashcardList from "./FlashcardList";
import type { GenerateFlashcardsCommand, GenerationCreateResponseDto, FlashcardProposalDto, Source } from "../types";

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
  // Stan dla komunikatu błędu
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
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

  // Funkcja obsługująca generowanie fiszek
  const handleGenerateFlashcards = async () => {
    if (!isTextValid()) {
      setErrorMessage("Tekst musi mieć długość od 1000 do 10000 znaków.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
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

  return (
    <div className="flex flex-col gap-6">
      <TextInputArea value={sourceText} onChange={setSourceText} isLoading={isLoading} />

      {errorMessage && (
        <div className="bg-destructive/15 border border-destructive text-destructive px-4 py-3 rounded-md">
          {errorMessage}
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={handleGenerateFlashcards} disabled={!isTextValid() || isLoading}>
          {isLoading ? "Generowanie..." : "Generuj fiszki"}
        </Button>
      </div>

      {isLoading && <SkeletonLoader />}

      {!isLoading && flashcardProposals.length > 0 && (
        <FlashcardList
          flashcards={flashcardProposals}
          onAccept={handleAcceptFlashcard}
          onReject={handleRejectFlashcard}
          onEdit={handleEditFlashcard}
        />
      )}
    </div>
  );
};

export default FlashcardGenerationView;
