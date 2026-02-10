import type { FlashcardProposalDto } from "../types";
import { OpenRouterService } from "./openrouter.service";

/**
 * Error class for AI service errors
 */
export class AIServiceError extends Error {
  code: string;

  constructor(message: string, code = "AI_SERVICE_ERROR") {
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
  private openRouterService: OpenRouterService;

  constructor(model = "openai/gpt-3.5-turbo", timeoutMs = 60000) {
    this.model = model;
    this.timeout = timeoutMs;

    // Inicjalizacja OpenRouterService
    // Klucz API powinien być pobierany z zmiennych środowiskowych
    const apiKey = import.meta.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.warn("[AI-SERVICE] OPENROUTER_API_KEY is not set in environment variables");
    } else {
      console.log("[AI-SERVICE] OPENROUTER_API_KEY is set, length:", apiKey.length);
    }

    console.log(`[AI-SERVICE] Initializing with model: ${model}, timeout: ${timeoutMs}ms`);

    this.openRouterService = new OpenRouterService({
      apiKey: apiKey || "dummy-key-for-development",
      timeout: this.timeout,
      defaultModel: this.model,
    });

    // Ustawienie szablonu systemowego dla fiszek
    const systemPrompt = `Jesteś ekspertem w tworzeniu fiszek edukacyjnych. Generuj wysokiej jakości fiszki na podstawie podanego tekstu. 
      Każda fiszka powinna zawierać przód (pytanie lub pojęcie) i tył (odpowiedź lub definicję).
      Treść powinna być zwięzła, ale kompletna. Unikaj zbyt ogólnych pytań.
      Stwórz dokładnie 5 fiszek na podstawie dostarczonego tekstu.
      Zwróć wynik TYLKO w formacie JSON zgodnym z następującym schematem:
      {
        "flashcards": [
          { "front": "pytanie 1", "back": "odpowiedź 1" },
          { "front": "pytanie 2", "back": "odpowiedź 2" },
          ...
        ]
      }
      Nie dodawaj żadnych dodatkowych wyjaśnień przed ani po JSON.`;

    console.log(`[AI-SERVICE] Setting system prompt: ${systemPrompt.substring(0, 50)}...`);
    this.openRouterService.setSystemMessage(systemPrompt);

    // Używamy prostszej metody formatowania - w treści promptu, bez response_format
    console.log(`[AI-SERVICE] Using simple JSON formatting in prompt instead of response_format`);
  }

  /**
   * Generate flashcards from source text using an AI model
   * @param sourceText The input text to generate flashcards from
   * @returns Promise resolving to an array of flashcard proposals and tokens used
   */
  async generateFlashcards(sourceText: string): Promise<{ proposals: FlashcardProposalDto[]; tokensUsed: number }> {
    try {
      console.log(`[AI-SERVICE] Generating flashcards from text (${sourceText.length} chars)`);

      // Create a timeout promise that rejects after the specified time
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new AIServiceError("AI service request timed out", "TIMEOUT")), this.timeout);
      });

      // Create the actual AI service request
      const aiRequestPromise = this.callAIService(sourceText);

      // Race the two promises - whichever resolves/rejects first wins
      const { proposals, tokensUsed } = await Promise.race([aiRequestPromise, timeoutPromise]);
      console.log(`[AI-SERVICE] Successfully generated ${proposals.length} flashcards, tokens used: ${tokensUsed}`);
      return { proposals, tokensUsed };
    } catch (error: unknown) {
      console.error(`[AI-SERVICE] Error generating flashcards:`, error);

      // Ensure all errors are of our AIServiceError type for consistent handling
      if (error instanceof AIServiceError) {
        throw error;
      } else {
        const message = error instanceof Error ? error.message : "Unknown error occurred during AI generation";
        throw new AIServiceError(message, "UNKNOWN");
      }
    }
  }

  /**
   * Makes the actual API call to the AI service
   * @param sourceText The input text to generate flashcards from
   * @returns Promise resolving to an array of flashcard proposals and tokens used
   */
  private async callAIService(sourceText: string): Promise<{ proposals: FlashcardProposalDto[]; tokensUsed: number }> {
    try {
      console.log(`[AI-SERVICE] Calling OpenRouter service with text input`);

      const prompt = `Wygeneruj fiszki na podstawie poniższego tekstu:\n\n${sourceText}`;
      console.log(`[AI-SERVICE] Using prompt: ${prompt.substring(0, 50)}...`);

      // Oczekujemy teraz ChatCompletionResult z OpenRouterService
      const { response: openRouterResponse, usage } = await this.openRouterService.sendChatMessage<{
        flashcards: { front: string; back: string }[];
      }>(prompt);

      console.log(`[AI-SERVICE] Received response from OpenRouter:`, openRouterResponse);
      console.log(`[AI-SERVICE] Tokens used (from OpenRouter):`, usage);

      // Mapowanie odpowiedzi na format FlashcardProposalDto
      const proposals = openRouterResponse.flashcards.map((flashcard) => ({
        front: flashcard.front,
        back: flashcard.back,
        source: "ai-full" as const,
      }));

      return {
        proposals,
        tokensUsed: usage.total_tokens,
      };
    } catch (error) {
      console.error(`[AI-SERVICE] Error calling OpenRouter API:`, error);
      throw new AIServiceError(
        error instanceof Error ? error.message : "Unknown error calling OpenRouter API",
        "OPENROUTER_API_ERROR"
      );
    }
  }

  /**
   * Get the model name used by this service
   */
  getModel(): string {
    return this.model;
  }
}
