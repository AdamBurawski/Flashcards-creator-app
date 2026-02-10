import type { APIRoute } from "astro";
import { DEFAULT_USER_ID } from "../../../db/supabase.client";
import { ErrorSource, logError } from "../../../lib/error-logger.service";
import { getLevels } from "../../../lib/english.service";

export const prerender = false;

/**
 * Endpoint GET /api/english/levels
 * Returns available CEFR levels with lesson counts and user progress.
 *
 * Response 200:
 * { levels: LevelSummary[] }
 */
export const GET: APIRoute = async ({ locals }) => {
  try {
    // 1. Authenticate user
    let userId: string = DEFAULT_USER_ID;

    if (locals.user?.id) {
      userId = locals.user.id;
    } else if (import.meta.env.MODE === "production") {
      return new Response(JSON.stringify({ error: "Nieautoryzowany dostęp" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 2. Fetch levels with progress
    const supabase = locals.supabase;
    const result = await getLevels(supabase, userId);

    if (result.error) {
      return new Response(JSON.stringify({ error: result.error }), {
        status: result.status ?? 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(result.data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    await logError({
      source: ErrorSource.API,
      error_code: "ENGLISH_LEVELS_ERROR",
      error_message: errorMessage,
    });

    return new Response(
      JSON.stringify({ error: "Wystąpił błąd podczas pobierania poziomów" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
