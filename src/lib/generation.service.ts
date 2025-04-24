import crypto from "crypto";
import type { FlashcardProposalDto } from "../types";
import { DEFAULT_USER_ID, supabaseClient, type SupabaseClient } from "../db/supabase.client";
import { AIService, AIServiceError } from "./ai.service";

// When in development, we can mock AI service results for testing
const isDevelopment = import.meta.env.MODE === "development";

// For testing - set this to true to bypass database operations
const BYPASS_DATABASE = true;

interface GenerationResult {
  generationId: number;
  proposals: FlashcardProposalDto[];
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
export async function generateFlashcards(sourceText: string): Promise<GenerationResult> {
  // Use the default user ID for now
  const userId = DEFAULT_USER_ID;

  // Use the exported Supabase client
  const supabase = supabaseClient;

  // Calculate hash and other metadata
  const sourceTextHash = calculateSourceTextHash(sourceText);
  const sourceTextLength = sourceText.length;
  const startTime = Date.now();

  try {
    // In production, we call the AI service, in development we use mocks
    let flashcardProposals: FlashcardProposalDto[];
    let model = "gpt-4"; // Default model name

    if (isDevelopment) {
      // In development mode, use mock data
      flashcardProposals = mockAiGeneration(sourceText);
    } else {
      // In production mode, use the AI service with timeout handling
      try {
        // Create AI service with 60-second timeout (as specified in the implementation plan)
        const aiService = new AIService(model, 60000);
        model = aiService.getModel(); // Get the actual model being used

        // Call the AI service to generate flashcards
        flashcardProposals = await aiService.generateFlashcards(sourceText);
      } catch (aiError: any) {
        // Handle and log AI service errors
        const errorCode = aiError instanceof AIServiceError ? aiError.code : "UNKNOWN";
        const errorMessage = aiError.message || "Unknown error occurred";

        // Log AI error to the database (only if not bypassing database)
        if (!BYPASS_DATABASE) {
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

        throw new Error(`AI service error: ${errorMessage}`);
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
      };
    }

    // Otherwise, try to save to the database
    try {
      // Save generation metadata to the database
      const { data: generationData, error: generationError } = await supabase
        .from("generations")
        .insert({
          model,
          generated_count: flashcardProposals.length,
          source_text_hash: sourceTextHash,
          source_text_length: sourceTextLength,
          generation_duration: generationDuration,
          user_id: userId,
        })
        .select("id")
        .single();

      if (generationError) {
        console.error("Error saving generation data:", generationError);
        throw new Error("Failed to save generation metadata");
      }

      return {
        generationId: generationData.id,
        proposals: flashcardProposals,
      };
    } catch (dbError) {
      console.error("Database operation failed:", dbError);

      // For testing, still return something useful even if database fails
      return {
        generationId: Math.floor(Math.random() * 1000), // Mock ID for testing
        proposals: flashcardProposals,
      };
    }
  } catch (error) {
    console.error("Error in generateFlashcards:", error);
    throw error;
  }
}
