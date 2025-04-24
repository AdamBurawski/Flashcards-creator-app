import type { FlashcardProposalDto } from "../types";

/**
 * Error class for AI service errors
 */
export class AIServiceError extends Error {
  code: string;

  constructor(message: string, code: string = "AI_SERVICE_ERROR") {
    super(message);
    this.name = "AIServiceError";
    this.code = code;
  }
}

/**
 * Service for generating flashcards using an AI model
 */
export class AIService {
  private model: string;
  private timeout: number;

  constructor(model: string = "gpt-4", timeoutMs: number = 60000) {
    this.model = model;
    this.timeout = timeoutMs;
  }

  /**
   * Generate flashcards from source text using an AI model
   * @param sourceText The input text to generate flashcards from
   * @returns Promise resolving to an array of flashcard proposals
   */
  async generateFlashcards(sourceText: string): Promise<FlashcardProposalDto[]> {
    try {
      // Create a timeout promise that rejects after the specified time
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new AIServiceError("AI service request timed out", "TIMEOUT")), this.timeout);
      });

      // Create the actual AI service request
      const aiRequestPromise = this.callAIService(sourceText);

      // Race the two promises - whichever resolves/rejects first wins
      return await Promise.race([aiRequestPromise, timeoutPromise]);
    } catch (error: any) {
      // Ensure all errors are of our AIServiceError type for consistent handling
      if (error instanceof AIServiceError) {
        throw error;
      } else {
        throw new AIServiceError(
          error.message || "Unknown error occurred during AI generation",
          error.code || "UNKNOWN"
        );
      }
    }
  }

  /**
   * Makes the actual API call to the AI service
   * In a real implementation, this would call an external AI API service
   * @param sourceText The input text to generate flashcards from
   * @returns Promise resolving to an array of flashcard proposals
   */
  private async callAIService(sourceText: string): Promise<FlashcardProposalDto[]> {
    // This is where you would implement the actual API call to an AI service
    // For now, we'll simulate an API call with a delay

    return new Promise((resolve, reject) => {
      // Simulate network delay
      setTimeout(() => {
        // Randomly fail 10% of the time for testing error handling
        if (Math.random() < 0.1) {
          reject(new AIServiceError("Failed to generate flashcards", "AI_GENERATION_FAILED"));
          return;
        }

        // Generate sample flashcards
        const flashcards: FlashcardProposalDto[] = Array.from({ length: 5 }, (_, index) => ({
          front: `AI-generated question ${index + 1} about ${sourceText.substring(0, 30)}...`,
          back: `AI-generated answer ${index + 1} with detailed explanation about this topic.`,
          source: "ai-full" as const,
        }));

        resolve(flashcards);
      }, 2000); // Simulate 2-second API call
    });
  }

  /**
   * Get the model name used by this service
   */
  getModel(): string {
    return this.model;
  }
}
