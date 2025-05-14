import type { APIRoute } from "astro";
import { z } from "zod";
import { generateFlashcards } from "../../lib/generation.service";
import type { GenerateFlashcardsCommand, GenerationCreateResponseDto } from "../../types";
import { DEFAULT_USER_ID } from "../../db/supabase.client";

export const prerender = false;

// Validation schema for the request body
const generateFlashcardsSchema = z.object({
  source_text: z
    .string()
    .min(1000, "Source text must be at least 1000 characters long")
    .max(10000, "Source text must not exceed 10000 characters"),
});

// API endpoint handler for generating flashcards
export const POST: APIRoute = async ({ request, locals }) => {
  let userId = DEFAULT_USER_ID;

  try {
    // Określ user_id na podstawie uwierzytelnionego użytkownika
    if (locals.user && locals.user.id) {
      userId = locals.user.id;
      console.log(`Generowanie fiszek dla uwierzytelnionego użytkownika: ${locals.user.email}, ID: ${userId}`);
    } else {
      console.log(`Brak uwierzytelnionego użytkownika, używam domyślnego ID: ${userId}`);
    }

    // 1. Get and validate the request body
    const body = (await request.json()) as GenerateFlashcardsCommand;

    const validationResult = generateFlashcardsSchema.safeParse(body);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: "Invalid request data",
          details: validationResult.error.format(),
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { source_text } = validationResult.data;

    // >>> MODERATION START <<<
    try {
      // Construct the full URL for the moderation endpoint
      // This assumes the moderation endpoint is hosted on the same domain and port
      const moderationUrl = new URL("/api/moderate", request.url);

      console.log(`[Generations API] Wysyłanie tekstu do moderacji na adres: ${moderationUrl.toString()}`);
      
      const moderationResponse = await fetch(moderationUrl.toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ input: source_text }),
      });

      if (!moderationResponse.ok) {
        // Try to parse the error response from moderation endpoint
        let moderationErrorBody = { error: "Nieznany błąd podczas moderacji" };
        try {
          moderationErrorBody = await moderationResponse.json();
        } catch (e) {
          console.error("[Generations API] Nie udało się sparsować odpowiedzi błędu z endpointu moderacji:", e);
        }
        console.error(
          `[Generations API] Błąd endpointu moderacji: ${moderationResponse.status}`,
          moderationErrorBody
        );
        return new Response(
          JSON.stringify({
            error: "Wystąpił błąd podczas analizy treści.",
            details: moderationErrorBody.error,
          }),
          {
            status: moderationResponse.status, // Propagate status from moderation
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      const moderationResult = await moderationResponse.json();
      console.log("[Generations API] Wynik moderacji:", moderationResult);

      if (moderationResult.flagged) {
        console.warn(
          `[Generations API] Tekst został oflagowany przez moderację. Próba generacji odrzucona. User ID: ${userId}`
        );
        return new Response(
          JSON.stringify({
            error:
              "Dostarczony tekst narusza zasady użytkowania i nie może zostać przetworzony.",
          }),
          {
            status: 400, // Bad Request, as the content is unacceptable
            headers: { "Content-Type": "application/json" },
          }
        );
      }
      console.log("[Generations API] Tekst przeszedł moderację pomyślnie.");
    } catch (error) {
      console.error(
        "[Generations API] Wystąpił nieoczekiwany błąd podczas komunikacji z endpointem moderacji:",
        error
      );
      return new Response(
        JSON.stringify({
          error: "Wystąpił wewnętrzny błąd podczas próby moderacji treści.",
        }),
        {
          status: 500, // Internal Server Error
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    // >>> MODERATION END <<<

    // 2. Call generation service to generate flashcards with the user's ID
    try {
      const result = await generateFlashcards(source_text, userId);

      const response: GenerationCreateResponseDto = {
        generation_id: result.generationId,
        flashcards_proposals: result.proposals,
        generated_count: result.proposals.length,
      };

      return new Response(JSON.stringify(response), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error generating flashcards:", error);

      return new Response(
        JSON.stringify({
          error: "Failed to generate flashcards",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    console.error("Unexpected error in generations endpoint:", error);

    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
