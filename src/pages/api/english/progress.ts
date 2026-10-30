import type { APIRoute } from "astro";
import { z } from "zod";
import { ErrorSource, logError } from "../../../lib/error-logger.service";
import { saveProgress } from "../../../lib/english.service";
import { loadSessionContext } from "../../../lib/household";

export const prerender = false;

const progressSchema = z.object({
  dialogue_id: z.string().min(1),
  total_turns: z.number().int().min(1),
  correct_turns: z.number().int().min(0),
  duration_seconds: z.number().int().min(0),
});

/**
 * POST /api/english/progress
 * Saves the result of a completed dialogue session.
 * Calculates score and stores in english_progress table.
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // 1. Auth check
    if (!locals.user?.id) {
      return new Response(JSON.stringify({ error: "Nieautoryzowany dostęp" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 2. Parse and validate body
    let body: unknown;
    try {
      body = await request.json();
    } catch (_error) {
      return new Response(JSON.stringify({ error: "Nieprawidłowe ciało zapytania JSON" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const validationResult = progressSchema.safeParse(body);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: "Nieprawidłowe dane wejściowe",
          details: validationResult.error.format(),
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 3. Save progress for the active learner (child when parent is viewing them)
    const session = await loadSessionContext(locals.supabase, locals.user.id, locals.user.email ?? null);
    const result = await saveProgress(locals.supabase, session.activeLearnerId, validationResult.data);

    if (result.error) {
      return new Response(JSON.stringify({ error: result.error }), {
        status: result.status ?? 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(result.data), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    await logError({
      source: ErrorSource.API,
      error_code: "ENGLISH_PROGRESS_ERROR",
      error_message: errorMessage,
    });

    return new Response(JSON.stringify({ error: "Wystąpił błąd podczas zapisywania postępu" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
