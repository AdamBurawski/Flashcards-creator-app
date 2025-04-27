import type { APIRoute } from "astro";
import { z } from "zod";
import { createFlashcards, validateGenerationExists } from "../../lib/flashcard.service";
import type { FlashcardsCreateCommand, FlashcardDto, Source } from "../../types";
import { DEFAULT_USER_ID, supabaseClient } from "../../db/supabase.client";
import { ErrorSource, logError } from "../../lib/error-logger.service";

export const prerender = false;

// Source validation schema
const sourceEnum = z.enum(["ai-full", "ai-edited", "manual"]);

// Flashcard creation validation schema
const flashcardCreateSchema = z
  .object({
    front: z.string().max(200, "Front content must not exceed 200 characters"),
    back: z.string().max(500, "Back content must not exceed 500 characters"),
    source: sourceEnum,
    generation_id: z.number().nullable(),
  })
  .refine(
    (data) => {
      // If source is "manual", generation_id must be null
      if (data.source === "manual" && data.generation_id !== null) {
        return false;
      }
      // If source is "ai-full" or "ai-edited", generation_id must not be null
      if ((data.source === "ai-full" || data.source === "ai-edited") && data.generation_id === null) {
        return false;
      }
      return true;
    },
    {
      message:
        "Invalid combination of source and generation_id. For manual source, generation_id must be null. For AI sources, generation_id is required.",
      path: ["generation_id"],
    }
  );

// Request body validation schema
const flashcardsCreateCommandSchema = z.object({
  flashcards: z.array(flashcardCreateSchema).min(1, "At least one flashcard is required"),
});

/**
 * Authenticates the user from the request
 * @param request The incoming request object
 * @returns The authenticated user ID or null if authentication fails
 */
async function authenticateUser(request: Request): Promise<string | null> {
  // Get the authorization header
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  // Extract the token
  const token = authHeader.split(" ")[1];
  if (!token) {
    return null;
  }

  try {
    // Verify the token using Supabase
    const supabase = supabaseClient;
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      await logError({
        source: ErrorSource.AUTHENTICATION,
        error_code: "AUTH_FAILED",
        error_message: error ? error.message : "User not found",
        metadata: { token_provided: !!token },
      });
      return null;
    }

    return user.id;
  } catch (error) {
    await logError({
      source: ErrorSource.AUTHENTICATION,
      error_code: "AUTH_ERROR",
      error_message: String(error),
      metadata: { token_provided: !!token },
    });
    return null;
  }
}

// API endpoint handler for creating flashcards
export const POST: APIRoute = async ({ request }) => {
  let userId: string = DEFAULT_USER_ID;

  try {
    // Sprawdzamy wartość zmiennej BYPASS_DATABASE
    const bypassEnv = import.meta.env.BYPASS_DATABASE;
    const isBypassMode = bypassEnv === "true" || bypassEnv === true;
    console.log(`[DEBUG] BYPASS_DATABASE mode: ${isBypassMode}, value: ${bypassEnv}`);

    // 1. Authenticate the user
    if (import.meta.env.MODE === "production") {
      const authUserId = await authenticateUser(request);

      if (!authUserId) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      userId = authUserId;
    }
    // else: Use default user ID for development (already set)

    // 2. Get the request body and validate it
    let body: FlashcardsCreateCommand;
    try {
      body = (await request.json()) as FlashcardsCreateCommand;
    } catch (parseError) {
      await logError({
        source: ErrorSource.VALIDATION,
        error_code: "JSON_PARSE_ERROR",
        error_message: String(parseError),
        user_id: userId,
      });

      return new Response(
        JSON.stringify({
          error: "Invalid JSON in request body",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const validationResult = flashcardsCreateCommandSchema.safeParse(body);
    if (!validationResult.success) {
      const validationErrors = validationResult.error.format();

      await logError({
        source: ErrorSource.VALIDATION,
        error_code: "SCHEMA_VALIDATION_ERROR",
        error_message: "Request validation failed",
        user_id: userId,
        metadata: { validation_errors: validationErrors },
      });

      return new Response(
        JSON.stringify({
          error: "Invalid request data",
          details: validationErrors,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { flashcards } = validationResult.data;

    // Jeśli jesteśmy w trybie BYPASS_DATABASE, nie sprawdzamy referencji i symulujemy zapis
    if (isBypassMode) {
      console.log("[BYPASS_DATABASE] Simulating flashcard creation in API endpoint");
      
      // Generuj sztuczną odpowiedź
      const now = new Date().toISOString();
      const mockFlashcards = flashcards.map((card, idx) => ({
        id: 10000 + idx,
        front: card.front,
        back: card.back,
        source: card.source,
        generation_id: card.generation_id,
        created_at: now,
        updated_at: now
      }));
      
      return new Response(
        JSON.stringify({ flashcards: mockFlashcards }), 
        { 
          status: 201, 
          headers: { "Content-Type": "application/json" } 
        }
      );
    }

    // 3. Tylko jeśli nie w trybie bypass - Validate generation_id references
    const generationValidations = flashcards
      .filter((card) => card.generation_id !== null)
      .map(async (card) => {
        const generationId = card.generation_id as number;
        const exists = await validateGenerationExists(generationId, userId);
        return { generationId, exists };
      });

    const generationResults = await Promise.all(generationValidations);
    const invalidGenerations = generationResults.filter((result) => !result.exists);

    if (invalidGenerations.length > 0) {
      const invalidGenerationIds = invalidGenerations.map((ig) => ig.generationId);

      await logError({
        source: ErrorSource.VALIDATION,
        error_code: "INVALID_GENERATION_REFERENCE",
        error_message: "Referenced generation IDs do not exist or do not belong to the user",
        user_id: userId,
        metadata: { invalid_generation_ids: invalidGenerationIds },
      });

      return new Response(
        JSON.stringify({
          error: "Invalid generation references",
          details: invalidGenerations.map((ig) => `Generation ID ${ig.generationId} not found`),
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 4. Create the flashcards (tylko jeśli nie w trybie bypass)
    try {
      // Call service to create flashcards
      const result = await createFlashcards(flashcards, userId);

      // Return successful response with created flashcards
      return new Response(JSON.stringify(result), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error: any) {
      // Error is already logged in the service

      // Return appropriate error response
      return new Response(
        JSON.stringify({
          error: "Failed to create flashcards",
          details: error.message,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    // Unexpected errors
    await logError({
      source: ErrorSource.FLASHCARD_CREATE,
      error_code: "UNEXPECTED_ERROR",
      error_message: String(error),
      user_id: userId,
      metadata: { endpoint: "POST /flashcards" },
    });

    // Return generic error for unexpected errors
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
