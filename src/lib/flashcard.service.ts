import { DEFAULT_USER_ID, supabaseClient } from "../db/supabase.client";
import type { FlashcardCreateDto, FlashcardDto, Source } from "../types";
import { ErrorSource, logError } from "./error-logger.service";

interface CreateFlashcardsResult {
  flashcards: FlashcardDto[];
}

/**
 * Creates multiple flashcards in a batch operation
 * @param flashcards Array of flashcard data to create
 * @param userId The user ID to associate with the flashcards (defaults to development user ID)
 * @returns The created flashcards with their IDs and metadata
 */
export async function createFlashcards(
  flashcards: FlashcardCreateDto[],
  userId: string = DEFAULT_USER_ID
): Promise<CreateFlashcardsResult> {
  const supabase = supabaseClient;

  try {
    // Prepare flashcards for insertion with user_id
    const flashcardsToInsert = flashcards.map((flashcard) => ({
      front: flashcard.front,
      back: flashcard.back,
      source: flashcard.source,
      generation_id: flashcard.generation_id,
      user_id: userId,
    }));

    // Insert flashcards as a batch operation
    const { data, error } = await supabase
      .from("flashcards")
      .insert(flashcardsToInsert)
      .select("id, front, back, source, generation_id, created_at, updated_at");

    if (error) {
      await logError({
        source: ErrorSource.FLASHCARD_CREATE,
        error_code: "INSERT_FAILED",
        error_message: error.message,
        user_id: userId,
        metadata: {
          count: flashcards.length,
          details: error.details,
        },
      });

      throw new Error(`Failed to create flashcards: ${error.message}`);
    }

    if (!data) {
      await logError({
        source: ErrorSource.FLASHCARD_CREATE,
        error_code: "NO_DATA_RETURNED",
        error_message: "Database operation succeeded but no data was returned",
        user_id: userId,
        metadata: { count: flashcards.length },
      });

      throw new Error("No data returned from flashcards creation");
    }

    // Return the created flashcards
    return {
      flashcards: data as FlashcardDto[],
    };
  } catch (error) {
    await logError({
      source: ErrorSource.FLASHCARD_CREATE,
      error_code: "OPERATION_FAILED",
      error_message: String(error),
      user_id: userId,
      metadata: { count: flashcards.length },
    });
    throw error;
  }
}

/**
 * Validates if the generation ID exists for the given user
 * @param generationId The generation ID to validate
 * @param userId The user ID to check against
 * @returns Boolean indicating if the generation exists for the user
 */
export async function validateGenerationExists(
  generationId: number,
  userId: string = DEFAULT_USER_ID
): Promise<boolean> {
  // Skip validation during development if needed
  if (import.meta.env.MODE === "development") {
    return true;
  }

  const supabase = supabaseClient;

  const { data, error } = await supabase
    .from("generations")
    .select("id")
    .eq("id", generationId)
    .eq("user_id", userId)
    .single();

  if (error) {
    await logError({
      source: ErrorSource.VALIDATION,
      error_code: "GENERATION_VALIDATION_ERROR",
      error_message: error.message,
      user_id: userId,
      metadata: { generationId },
    });
    return false;
  }

  return !!data;
}
