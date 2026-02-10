import type { APIRoute } from "astro";
import { z } from "zod";
import { DEFAULT_USER_ID } from "../../../db/supabase.client";
import { ErrorSource, logError } from "../../../lib/error-logger.service";
import { getLessons } from "../../../lib/english.service";
import type { CEFRLevel } from "../../../types/english";

export const prerender = false;

const querySchema = z.object({
  level: z.enum(["A1", "A2", "B1", "B2"]),
});

/**
 * Endpoint GET /api/english/lessons?level={level}
 * Returns lessons for the selected CEFR level with user progress.
 *
 * Query params:
 * - level (required): one of A1, A2, B1, B2
 *
 * Response 200:
 * { lessons: LessonOverview[] }
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

    // 2. Validate query params
    const url = new URL(request.url);
    const validationResult = querySchema.safeParse({
      level: url.searchParams.get("level"),
    });

    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: "Parametr 'level' jest wymagany i musi być jednym z: A1, A2, B1, B2",
          details: validationResult.error.format(),
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { level } = validationResult.data;

    // 3. Fetch lessons with progress
    const result = await getLessons(locals.supabase, userId, level as CEFRLevel);

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
      error_code: "ENGLISH_LESSONS_ERROR",
      error_message: errorMessage,
    });

    return new Response(JSON.stringify({ error: "Wystąpił błąd podczas pobierania lekcji" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
