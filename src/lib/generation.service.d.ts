import type { FlashcardProposalDto } from "../types";

interface GenerationResult {
  generationId: number;
  proposals: FlashcardProposalDto[];
}

export function generateFlashcards(sourceText: string): Promise<GenerationResult>;
