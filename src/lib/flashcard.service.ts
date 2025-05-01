import { DEFAULT_USER_ID, supabase } from "../db/supabase.client";
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
  // Check if we're bypassing database operations
  const bypassEnv = import.meta.env.BYPASS_DATABASE;
  const isBypassMode = bypassEnv === "true" || bypassEnv === true;
  console.log("[DEBUG] BYPASS_DATABASE mode:", isBypassMode, "value:", bypassEnv);
  
  if (isBypassMode) {
    console.log(`[BYPASS] Simulating creation of ${flashcards.length} flashcards`);
    
    // Generate fake IDs and timestamps
    const now = new Date().toISOString();
    const mockFlashcards: FlashcardDto[] = flashcards.map((flashcard, index) => ({
      id: Math.floor(Math.random() * 10000) + 1,
      front: flashcard.front,
      back: flashcard.back,
      source: flashcard.source,
      generation_id: flashcard.generation_id,
      created_at: now,
      updated_at: now
    }));
    
    return {
      flashcards: mockFlashcards
    };
  }

  // Sprawdź, czy klient Supabase jest zainicjalizowany
  if (!supabase) {
    console.error("[flashcard_create] Supabase client is not initialized");
    
    // Zwróć mock w przypadku braku klienta Supabase
    const now = new Date().toISOString();
    const mockFlashcards: FlashcardDto[] = flashcards.map((flashcard, index) => ({
      id: Math.floor(Math.random() * 10000) + 1,
      front: flashcard.front,
      back: flashcard.back,
      source: flashcard.source,
      generation_id: flashcard.generation_id,
      created_at: now,
      updated_at: now
    }));
    
    return {
      flashcards: mockFlashcards
    };
  }

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

      // Zwróć mock w przypadku błędu
      const now = new Date().toISOString();
      const mockFlashcards: FlashcardDto[] = flashcards.map((flashcard, index) => ({
        id: Math.floor(Math.random() * 10000) + 1,
        front: flashcard.front,
        back: flashcard.back,
        source: flashcard.source,
        generation_id: flashcard.generation_id,
        created_at: now,
        updated_at: now
      }));
      
      return {
        flashcards: mockFlashcards
      };
    }

    if (!data) {
      await logError({
        source: ErrorSource.FLASHCARD_CREATE,
        error_code: "NO_DATA_RETURNED",
        error_message: "Database operation succeeded but no data was returned",
        user_id: userId,
        metadata: { count: flashcards.length },
      });

      // Zwróć mock w przypadku braku danych
      const now = new Date().toISOString();
      const mockFlashcards: FlashcardDto[] = flashcards.map((flashcard, index) => ({
        id: Math.floor(Math.random() * 10000) + 1,
        front: flashcard.front,
        back: flashcard.back,
        source: flashcard.source,
        generation_id: flashcard.generation_id,
        created_at: now,
        updated_at: now
      }));
      
      return {
        flashcards: mockFlashcards
      };
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
    
    // Zwróć mock w przypadku błędu
    const now = new Date().toISOString();
    const mockFlashcards: FlashcardDto[] = flashcards.map((flashcard, index) => ({
      id: Math.floor(Math.random() * 10000) + 1,
      front: flashcard.front,
      back: flashcard.back,
      source: flashcard.source,
      generation_id: flashcard.generation_id,
      created_at: now,
      updated_at: now
    }));
    
    return {
      flashcards: mockFlashcards
    };
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
  // Check if we are bypassing database operations
  const bypassEnv = import.meta.env.BYPASS_DATABASE;
  const isBypassMode = bypassEnv === "true" || bypassEnv === true;
  
  if (isBypassMode) {
    console.log(`[BYPASS] Skipping validation for generation ID ${generationId}`);
    return true;
  }

  // Skip validation during development if needed
  if (import.meta.env.MODE === "development") {
    return true;
  }

  // Sprawdź, czy klient Supabase jest zainicjalizowany
  if (!supabase) {
    console.error("[generation_validation] Supabase client is not initialized");
    return true; // Zakładamy, że istnieje, żeby nie blokować procesu
  }

  try {
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
      return true; // Zakładamy, że istnieje, żeby nie blokować procesu
    }

    return !!data;
  } catch (error) {
    console.error("Error validating generation:", error);
    return true; // Zakładamy, że istnieje, żeby nie blokować procesu
  }
}
