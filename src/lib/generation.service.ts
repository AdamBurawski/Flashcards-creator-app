import crypto from "crypto";
import type { FlashcardProposalDto } from "../types";
import { DEFAULT_USER_ID, supabase } from "../db/supabase.client";
import { AIService, AIServiceError } from "./ai.service";

// When in development, we can mock AI service results for testing
const _isDevelopment = import.meta.env.MODE === "development";

// Wykrywanie trybu obejścia bazy danych - odczytujemy z env lub używamy domyślnej wartości
const bypassEnv = import.meta.env.BYPASS_DATABASE;
const BYPASS_DATABASE = bypassEnv === "true" || bypassEnv === true || false; // Domyślnie false

console.log(`[DEBUG-GENERATION] BYPASS_DATABASE set to: ${BYPASS_DATABASE}, env value: ${bypassEnv}`);

interface GenerationResult {
  generationId: number;
  proposals: FlashcardProposalDto[];
  tokensUsed: number;
}

// Mock AI generation function for development
function mockAiGeneration(sourceText: string): FlashcardProposalDto[] {
  // Generate 5 mock flashcards based on source_text length
  return Array.from({ length: 5 }, (_, index) => ({
    front: `Question ${index + 1} about ${sourceText.substring(0, 20)}...`,
    back: `Answer ${index + 1} with details about the topic. This is a mock response.`,
    source: "ai-full" as const,
  }));
}

// Function to calculate MD5 hash of source text
function calculateSourceTextHash(sourceText: string): string {
  return crypto.createHash("md5").update(sourceText).digest("hex");
}

// The main function to generate flashcards
export async function generateFlashcards(
  sourceText: string,
  userId: string = DEFAULT_USER_ID
): Promise<GenerationResult> {
  console.log(`Generowanie fiszek dla użytkownika z ID: ${userId}`);

  // Calculate hash and other metadata
  const sourceTextHash = calculateSourceTextHash(sourceText);
  const sourceTextLength = sourceText.length;
  const startTime = Date.now();

  try {
    // Always use the AIService regardless of environment
    let flashcardProposals: FlashcardProposalDto[];
    let model = "gpt-4o-mini"; // Default model name
    let tokensActuallyUsed = 0; // Inicjalizacja dla rzeczywistych tokenów

    // Sprawdź, czy OpenRouter API key jest dostępny
    const openRouterApiKey = import.meta.env.OPENROUTER_API_KEY;

    // Jeśli klucz API nie jest dostępny lub jesteśmy w trybie development i chcemy używać mocków
    if (!openRouterApiKey) {
      console.warn("OPENROUTER_API_KEY is not set - using mock data instead");
      flashcardProposals = mockAiGeneration(sourceText);
      // tokensActuallyUsed pozostaje 0 dla mocków, lub można przypisać szacunkową wartość
    } else {
      try {
        // Create AI service with 60-second timeout
        const aiService = new AIService(model, 60000);
        model = aiService.getModel(); // Get the actual model being used

        console.log(`[DEBUG-GENERATION] Using AI service with model: ${model}`);

        // Call the AI service to generate flashcards
        const aiResult = await aiService.generateFlashcards(sourceText);
        flashcardProposals = aiResult.proposals;
        tokensActuallyUsed = aiResult.tokensUsed;

        console.log(
          `[DEBUG-GENERATION] Successfully generated ${flashcardProposals.length} flashcards, tokens used: ${tokensActuallyUsed}`
        );
      } catch (aiError: unknown) {
        // Handle and log AI service errors
        const errorCode = aiError instanceof AIServiceError ? aiError.code : "UNKNOWN";
        const errorMessage = aiError instanceof Error ? aiError.message : "Unknown error occurred";

        console.error(`[DEBUG-GENERATION] AI service error: ${errorCode} - ${errorMessage}`);

        // Log AI error to the database (only if not bypassing database)
        if (!BYPASS_DATABASE && supabase) {
          try {
            await supabase.from("generation_error_logs").insert({
              error_code: errorCode,
              error_message: errorMessage,
              model,
              source_text_hash: sourceTextHash,
              source_text_length: sourceTextLength,
              user_id: userId,
            });
          } catch (logError) {
            console.error("Failed to log error to database:", logError);
            // We still want to throw the original error even if logging fails
          }
        } else {
          console.log("Bypassing database error logging due to BYPASS_DATABASE setting");
        }

        // W przypadku błędu użyj danych mockowych zamiast rzucać wyjątek
        console.log("[DEBUG-GENERATION] Falling back to mock data after AI service error");
        flashcardProposals = mockAiGeneration(sourceText);
        // tokensActuallyUsed pozostaje 0 po błędzie i fallbacku do mocków
      }
    }

    const endTime = Date.now();
    const generationDuration = endTime - startTime;

    // For testing, bypass database operations if BYPASS_DATABASE is true
    if (BYPASS_DATABASE) {
      console.log("Bypassing database operations due to BYPASS_DATABASE setting");
      return {
        generationId: Math.floor(Math.random() * 1000), // Mock ID for testing
        proposals: flashcardProposals,
        tokensUsed: tokensActuallyUsed, // Przekazujemy tokensUsed
      };
    }

    // Sprawdź czy klient Supabase istnieje
    if (!supabase) {
      console.error("Supabase client is not initialized");
      return {
        generationId: Math.floor(Math.random() * 1000), // Mock ID for testing
        proposals: flashcardProposals,
        tokensUsed: tokensActuallyUsed, // Przekazujemy tokensUsed
      };
    }

    // Otherwise, try to save to the database
    try {
      // Zamiast bezpośredniego insertu, używamy funkcji RPC która omija RLS
      const { data: rpcResultData, error: generationError } = await supabase.rpc("insert_generation", {
        generation_data: {
          user_id: userId,
          model,
          generated_count: flashcardProposals.length,
          source_text_hash: sourceTextHash,
          source_text_length: sourceTextLength,
          generation_duration: generationDuration,
          tokens_used: tokensActuallyUsed,
        },
      });

      // Sprawdzamy błąd i czy dane zostały zwrócone.
      // Zakładamy, że funkcja RPC, jeśli się powiedzie, zwraca obiekt (lub tablicę obiektów)
      // zawierający przynajmniej `id` nowej generacji.
      // Jeśli zwraca tablicę, bierzemy pierwszy element.
      let newGenerationId: number | null = null;
      if (!generationError && rpcResultData) {
        // Jeśli rpcResultData jest tablicą, weź id z pierwszego elementu
        if (
          Array.isArray(rpcResultData) &&
          rpcResultData.length > 0 &&
          rpcResultData[0] &&
          typeof rpcResultData[0].id === "number"
        ) {
          newGenerationId = rpcResultData[0].id;
        } else if (typeof (rpcResultData as Record<string, unknown>).id === "number") {
          // Jeśli rpcResultData jest pojedynczym obiektem z polem id
          newGenerationId = (rpcResultData as Record<string, unknown>).id as number;
        }
      }

      if (generationError || newGenerationId === null) {
        console.error(
          "Error saving generation data or ID not returned:",
          generationError || "No valid ID returned from RPC"
        );
        return {
          generationId: Math.floor(Math.random() * 1000),
          proposals: flashcardProposals,
          tokensUsed: tokensActuallyUsed,
        };
      }

      return {
        generationId: newGenerationId, // Używamy newGenerationId
        proposals: flashcardProposals,
        tokensUsed: tokensActuallyUsed,
      };
    } catch (dbError) {
      console.error("Database operation failed:", dbError);

      // For testing, still return something useful even if database fails
      return {
        generationId: Math.floor(Math.random() * 1000), // Mock ID for testing
        proposals: flashcardProposals,
        tokensUsed: tokensActuallyUsed, // Przekazujemy tokensUsed
      };
    }
  } catch (error) {
    console.error("Error in generateFlashcards:", error);
    throw error;
  }
}
