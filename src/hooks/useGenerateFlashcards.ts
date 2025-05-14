import { useState } from "react";
import type { 
  GenerateFlashcardsCommand, 
  GenerationCreateResponseDto, 
  FlashcardsCreateCommand,
  Source
} from "../types";

// Rozszerzony model widoku do fiszek
export interface FlashcardProposalViewModel {
  front: string;
  back: string;
  source: Source;
  accepted: boolean;
  edited: boolean;
}

// Typy stanów operacji
export interface FlashcardsGenerationState {
  flashcardProposals: FlashcardProposalViewModel[];
  generationId: number | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  successMessage: string | null;
}

// Hook do obsługi operacji związanych z fiszkami
export function useGenerateFlashcards() {
  // Stan dla propozycji fiszek i operacji
  const [state, setState] = useState<FlashcardsGenerationState>({
    flashcardProposals: [],
    generationId: null,
    isLoading: false,
    isSaving: false,
    error: null,
    successMessage: null
  });

  // Funkcja do generowania fiszek
  const generateFlashcards = async (sourceText: string): Promise<boolean> => {
    // Walidacja długości tekstu
    if (sourceText.length < 1000 || sourceText.length > 10000) {
      setState(prev => ({ 
        ...prev, 
        error: "Tekst musi mieć długość od 1000 do 10000 znaków." 
      }));
      return false;
    }

    setState(prev => ({ 
      ...prev, 
      isLoading: true, 
      error: null, 
      successMessage: null,
      flashcardProposals: [],
      generationId: null
    }));

    try {
      const command: GenerateFlashcardsCommand = {
        source_text: sourceText
      };

      const response = await fetch("/api/generations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(command)
      });

      if (!response.ok) {
        const errorData = await response.json();
        // Sprawdzamy, czy to błąd moderacji (status 400 i specyficzny komunikat)
        if (response.status === 400 && 
            errorData.error === "Dostarczony tekst narusza zasady użytkowania i nie może zostać przetworzony.") {
          throw new Error("Twój tekst nie przeszedł automatycznej moderacji treści. Upewnij się, że nie zawiera on niedozwolonych zwrotów i spróbuj ponownie.");
        } else if (response.status === 400 && errorData.error === "Invalid request data" && errorData.details?.source_text?._errors?.length > 0) {
          // Błąd walidacji Zod dla source_text
          throw new Error(errorData.details.source_text._errors[0]);
        }
        // Inne błędy serwera
        throw new Error(errorData.error || errorData.message || "Wystąpił błąd podczas generowania fiszek.");
      }

      const data: GenerationCreateResponseDto = await response.json();
      
      // Przekształcenie propozycji fiszek do widoku z dodatkowymi flagami
      const viewModels: FlashcardProposalViewModel[] = data.flashcards_proposals.map(proposal => ({
        ...proposal,
        accepted: false,
        edited: false
      }));

      setState(prev => ({
        ...prev,
        flashcardProposals: viewModels,
        generationId: data.generation_id,
        isLoading: false
      }));
      
      return true;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : "Wystąpił nieznany błąd.",
        isLoading: false
      }));
      return false;
    }
  };

  // Funkcja do zapisywania fiszek
  const saveFlashcards = async (command: FlashcardsCreateCommand): Promise<boolean> => {
    if (command.flashcards.length === 0) {
      setState(prev => ({
        ...prev,
        error: "Brak fiszek do zapisania."
      }));
      return false;
    }

    setState(prev => ({
      ...prev,
      isSaving: true,
      error: null,
      successMessage: null
    }));

    try {
      const response = await fetch("/api/flashcards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(command)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Wystąpił błąd podczas zapisywania fiszek.");
      }

      setState(prev => ({
        ...prev,
        successMessage: `Pomyślnie zapisano ${command.flashcards.length} fiszek.`,
        isSaving: false
      }));

      return true;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : "Wystąpił nieznany błąd podczas zapisywania.",
        isSaving: false
      }));
      return false;
    }
  };

  // Funkcje do obsługi akcji na fiszkach
  const acceptFlashcard = (index: number) => {
    setState(prev => ({
      ...prev,
      flashcardProposals: prev.flashcardProposals.map((proposal, i) => 
        i === index ? { ...proposal, accepted: !proposal.accepted } : proposal
      )
    }));
  };

  const rejectFlashcard = (index: number) => {
    setState(prev => ({
      ...prev,
      flashcardProposals: prev.flashcardProposals.filter((_, i) => i !== index)
    }));
  };

  const editFlashcard = (index: number, front: string, back: string) => {
    setState(prev => ({
      ...prev,
      flashcardProposals: prev.flashcardProposals.map((proposal, i) => 
        i === index 
          ? { 
              ...proposal, 
              front, 
              back, 
              edited: true, 
              source: "ai-edited" as Source
            } 
          : proposal
      )
    }));
  };

  // Funkcje do obsługi komunikatów
  const clearError = () => {
    setState(prev => ({ ...prev, error: null }));
  };

  const clearSuccess = () => {
    setState(prev => ({ ...prev, successMessage: null }));
  };

  return {
    ...state,
    generateFlashcards,
    saveFlashcards,
    acceptFlashcard,
    rejectFlashcard,
    editFlashcard,
    clearError,
    clearSuccess
  };
} 