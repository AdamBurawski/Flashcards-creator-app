import type { APIRoute } from "astro";
import { z } from "zod";
import { DEFAULT_USER_ID } from "../../../../../db/supabase.client";
import { ErrorSource, logError } from "../../../../../lib/error-logger.service";
import { getDialoguesForLesson } from "../../../../../lib/english.service";
import type { CEFRLevel } from "../../../../../types/english";

export const prerender = false;

const querySchema = z.object({
  level: z.enum(["A1", "A2", "B1", "B2"]),
  stage: z.coerce.number().int().min(1).max(12),
});

/**
 * Endpoint GET /api/english/lessons/{lessonId}/dialogues?level={level}&stage={stage}
 * Returns full dialogue data for a specific lesson, including turns and audio URLs.
 *
 * URL params:
 * - lessonId: lesson number (e.g. 1)
 *
 * Query params:
 * - level (required): CEFR level (A1, A2, B1, B2)
 * - stage (required): Callan stage number (1-12)
 *
 * Response 200:
 * { lesson, stage, level, dialogues: EnglishDialogue[] }
 */
export const GET: APIRoute = async ({ params, request, locals }) => {
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

    // 2. Validate URL param
    const lessonIdParam = params.lessonId;
    if (!lessonIdParam) {
      return new Response(JSON.stringify({ error: "Brak parametru lessonId" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const lessonId = parseInt(lessonIdParam, 10);
    if (isNaN(lessonId) || lessonId < 1) {
      return new Response(JSON.stringify({ error: "Nieprawidłowy parametr lessonId" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 3. Validate query params
    const url = new URL(request.url);
    const validationResult = querySchema.safeParse({
      level: url.searchParams.get("level"),
      stage: url.searchParams.get("stage"),
    });

    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: "Parametry 'level' (A1-B2) i 'stage' (1-12) są wymagane",
          details: validationResult.error.format(),
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { level, stage } = validationResult.data;

    // 4. Fetch dialogues with turns and audio
    const result = await getDialoguesForLesson(
      locals.supabase,
      lessonId,
      level as CEFRLevel,
      stage
    );

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
      error_code: "ENGLISH_DIALOGUES_ERROR",
      error_message: errorMessage,
      metadata: { params },
    });

    return new Response(
      JSON.stringify({ error: "Wystąpił błąd podczas pobierania dialogów" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
