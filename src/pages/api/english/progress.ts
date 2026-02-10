import type { APIRoute } from "astro";
import { z } from "zod";
import { DEFAULT_USER_ID } from "../../../db/supabase.client";
import { ErrorSource, logError } from "../../../lib/error-logger.service";
import { saveProgress, getProgressSummary } from "../../../lib/english.service";
import type { CEFRLevel } from "../../../types/english";

export const prerender = false;

// Validation schema for POST body
const saveProgressSchema = z.object({
  dialogue_id: z.string().min(1, "ID dialogu jest wymagane"),
  total_turns: z.number().int().min(1, "Liczba tur musi być >= 1"),
  correct_turns: z.number().int().min(0, "Liczba poprawnych tur musi być >= 0"),
  duration_seconds: z.number().int().min(0, "Czas trwania musi być >= 0"),
});

// Validation for GET query params
const progressQuerySchema = z.object({
  level: z.enum(["A1", "A2", "B1", "B2"]).optional(),
});

/**
 * Endpoint POST /api/english/progress
 * Saves the result of a completed dialogue.
 *
 * Request body:
 * { dialogue_id, total_turns, correct_turns, duration_seconds }
 *
 * Response 201:
 * { id, dialogue_id, score, total_turns, correct_turns, duration_seconds, completed_at }
 */
export const POST: APIRoute = async ({ request, locals }) => {
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

    // 2. Parse and validate body
    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "Nieprawidłowe ciało zapytania JSON" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const validationResult = saveProgressSchema.safeParse(body);
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

    const command = validationResult.data;

    // Additional validation: correct_turns cannot exceed total_turns
    if (command.correct_turns > command.total_turns) {
      return new Response(
        JSON.stringify({
          error: "Liczba poprawnych tur nie może przekraczać łącznej liczby tur",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 3. Save progress
    const result = await saveProgress(locals.supabase, userId, command);

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
      error_code: "ENGLISH_SAVE_PROGRESS_ERROR",
      error_message: errorMessage,
    });

    return new Response(
      JSON.stringify({ error: "Wystąpił błąd podczas zapisu postępów" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

/**
 * Endpoint GET /api/english/progress?level={level}
 * Returns a summary of user's progress.
 *
 * Query params:
 * - level (optional): filter by CEFR level
 *
 * Response 200:
 * { summary, by_level, recent_sessions }
 */
export const GET: APIRoute = async ({ request, locals }) => {
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

    // 2. Validate optional query param
    const url = new URL(request.url);
    const levelParam = url.searchParams.get("level") || undefined;

    const validationResult = progressQuerySchema.safeParse({ level: levelParam });
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: "Parametr 'level' musi być jednym z: A1, A2, B1, B2",
          details: validationResult.error.format(),
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const level = validationResult.data.level as CEFRLevel | undefined;

    // 3. Fetch progress summary
    const result = await getProgressSummary(locals.supabase, userId, level);

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
      error_code: "ENGLISH_GET_PROGRESS_ERROR",
      error_message: errorMessage,
    });

    return new Response(
      JSON.stringify({ error: "Wystąpił błąd podczas pobierania postępów" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
