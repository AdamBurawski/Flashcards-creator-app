import type { APIRoute } from "astro";
import { z } from "zod";
import { ErrorSource, logError } from "../../../../../lib/error-logger.service";
import type { CEFRLevel } from "../../../../../types/english";

export const prerender = false;

const querySchema = z.object({
  level: z.enum(["A1", "A2", "B1", "B2"]),
  stage: z.coerce.number().int().min(1).max(12),
});

function countStudentTurns(turns: unknown): number {
  if (!Array.isArray(turns)) return 0;
  return turns.filter((turn) => turn && typeof turn === "object" && "role" in turn && (turn as { role?: string }).role === "student").length;
}

export const GET: APIRoute = async ({ params, request, locals }) => {
  try {
    if (!locals.user?.id && import.meta.env.MODE === "production") {
      return new Response(JSON.stringify({ error: "Nieautoryzowany dostęp" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

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
    const userId = locals.user?.id;

    const { data: dialogues, error: dialoguesError } = await locals.supabase
      .from("english_dialogues")
      .select("id, stage, lesson, level, title, tags, target_vocab, target_structures, turns, revision_from, estimated_duration_seconds, sort_order, image_url, intro")
      .eq("lesson", lessonId)
      .eq("stage", stage)
      .eq("level", level)
      .order("sort_order", { ascending: true });

    if (dialoguesError) {
      return new Response(JSON.stringify({ error: "Błąd pobierania dialogów" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!dialogues || dialogues.length === 0) {
      return new Response(JSON.stringify({ error: "Nie znaleziono dialogów dla podanej lekcji" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const dialogueIds = dialogues.map((dialogue) => dialogue.id);
    const { data: progressRows, error: progressError } = await locals.supabase
      .from("english_progress")
      .select("dialogue_id, total_turns, correct_turns, duration_seconds, completed_at")
      .eq("user_id", userId ?? "")
      .in("dialogue_id", dialogueIds)
      .order("completed_at", { ascending: false });

    if (progressError) {
      return new Response(JSON.stringify({ error: "Błąd pobierania postępów lekcji" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const latestByDialogue = new Map<
      string,
      { total_turns: number; correct_turns: number; duration_seconds: number | null; completed_at: string }
    >();

    for (const row of progressRows ?? []) {
      if (!latestByDialogue.has(row.dialogue_id)) {
        latestByDialogue.set(row.dialogue_id, row);
      }
    }

    let totalTurns = 0;
    let correctTurns = 0;
    let durationSeconds = 0;

    for (const dialogue of dialogues) {
      const latest = latestByDialogue.get(dialogue.id);
      if (latest) {
        totalTurns += latest.total_turns;
        correctTurns += latest.correct_turns;
        durationSeconds += latest.duration_seconds ?? 0;
        continue;
      }

      totalTurns += countStudentTurns(dialogue.turns);
      durationSeconds += dialogue.estimated_duration_seconds ?? 0;
    }

    return new Response(
      JSON.stringify({
        level: level as CEFRLevel,
        stage,
        lesson: lessonId,
        correct_turns: correctTurns,
        total_turns: totalTurns,
        duration_seconds: durationSeconds,
        dialogues,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    await logError({
      source: ErrorSource.API,
      error_code: "ENGLISH_LESSON_SUMMARY_ERROR",
      error_message: errorMessage,
      metadata: { params },
    });

    return new Response(JSON.stringify({ error: "Wystąpił błąd podczas pobierania podsumowania lekcji" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
