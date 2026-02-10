import type { APIRoute } from "astro";
import { z } from "zod";
import { generateFlashcards } from "../../lib/generation.service";
import type { GenerateFlashcardsCommand, GenerationCreateResponseDto } from "../../types";
import { DEFAULT_USER_ID } from "../../db/supabase.client";
import type { Database } from "../../db/supabase.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getUserTokenStatus, updateUserTokenUsage } from "../../lib/openai.service";
import { ErrorSource, logError } from "../../lib/error-logger.service";

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

    // Szacunkowy MAKSYMALNY koszt tokenów dla tej operacji (dla wstępnego sprawdzenia)
    const ESTIMATED_MAX_TOKENS_PER_GENERATION = 5000;

    try {
      // Rzutowanie locals.supabase na poprawny typ, jeśli jest to konieczne
      // Jednak idealnie, typ locals.supabase powinien być już poprawny z middleware Astro.
      const supabaseTypedClient = locals.supabase as SupabaseClient<Database>;

      const tokenStatus = await getUserTokenStatus(userId, supabaseTypedClient);

      // Sprawdzamy, czy sama funkcja getUserTokenStatus nie zwróciła jakiegoś wewnętrznego problemu
      // (chociaż w obecnej implementacji loguje błędy i zwraca status z zerowym limitem)
      // Dla pewności, można by dodać pole `error?: string` do UserTokenStatus

      const { canUse, remainingTokens } = tokenStatus.canUseTokens(ESTIMATED_MAX_TOKENS_PER_GENERATION);

      console.log(
        `[Generations API] Token status for user ${userId}: Limit=${tokenStatus.limit}, Usage=${tokenStatus.usage}, Left=${remainingTokens}, CanUse=${canUse} (estimated max cost: ${ESTIMATED_MAX_TOKENS_PER_GENERATION})`
      );

      if (!canUse) {
        console.warn(
          `[Generations API] Użytkownik ${userId} przekroczył limit tokenów dla generacji (szacunkowy). Potrzebne (max): ${ESTIMATED_MAX_TOKENS_PER_GENERATION}, Dostępne: ${remainingTokens}`
        );
        return new Response(
          JSON.stringify({
            error: "Przekroczono miesięczny limit generowania fiszek przy użyciu AI.",
            details: `Szacunkowo potrzebne tokeny: ${ESTIMATED_MAX_TOKENS_PER_GENERATION}, Dostępne: ${remainingTokens}. Limit odnawia się pierwszego dnia miesiąca.`,
          }),
          { status: 429, headers: { "Content-Type": "application/json" } }
        );
      }
    } catch (e) {
      await logError({
        source: ErrorSource.API,
        error_code: "TOKEN_CHECK_UNEXPECTED_ERROR_GENERATIONS",
        error_message: `Nieoczekiwany błąd podczas sprawdzania tokenów dla ${userId}: ${e instanceof Error ? e.message : String(e)}`,
        user_id: userId,
      });
      return new Response(JSON.stringify({ error: "Wystąpił nieoczekiwany błąd systemu." }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

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
        console.error(`[Generations API] Błąd endpointu moderacji: ${moderationResponse.status}`, moderationErrorBody);
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
            error: "Dostarczony tekst narusza zasady użytkowania i nie może zostać przetworzony.",
          }),
          {
            status: 400, // Bad Request, as the content is unacceptable
            headers: { "Content-Type": "application/json" },
          }
        );
      }
      console.log("[Generations API] Tekst przeszedł moderację pomyślnie.");
    } catch (error) {
      console.error("[Generations API] Wystąpił nieoczekiwany błąd podczas komunikacji z endpointem moderacji:", error);
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
    let generationServiceResult;
    try {
      // Wywołanie serwisu generacji, który teraz zwraca również tokensUsed
      generationServiceResult = await generateFlashcards(source_text, userId);
      const actualTokensUsed = generationServiceResult.tokensUsed;

      console.log(`[Generations API] Rzeczywiste zużycie tokenów przez LLM: ${actualTokensUsed}`);

      // Po pomyślnym wygenerowaniu, zaktualizuj zużycie tokenów o RZECZYWISTĄ wartość
      try {
        const supabaseTypedClient = locals.supabase as SupabaseClient<Database>;
        await updateUserTokenUsage(userId, actualTokensUsed, supabaseTypedClient);
        console.log(
          `[Generations API] Zaktualizowano zużycie tokenów dla ${userId} o ${actualTokensUsed} po generacji fiszek.`
        );
      } catch (updateError) {
        await logError({
          source: ErrorSource.API,
          error_code: "TOKEN_UPDATE_ERROR_GENERATIONS",
          error_message: `Nie udało się zaktualizować rzeczywistego zużycia tokenów dla ${userId} po generacji: ${updateError instanceof Error ? updateError.message : String(updateError)}`,
          user_id: userId,
          metadata: { tokensConsumed: actualTokensUsed },
        });
      }

      const response: GenerationCreateResponseDto = {
        generation_id: generationServiceResult.generationId,
        flashcards_proposals: generationServiceResult.proposals,
        generated_count: generationServiceResult.proposals.length,
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
