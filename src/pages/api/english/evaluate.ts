import type { APIRoute } from "astro";
import { z } from "zod";
import { ErrorSource, logError } from "../../../lib/error-logger.service";
import { evaluateStudentAnswer } from "../../../lib/english-evaluator.service";
import type { EvaluateAnswerCommand } from "../../../types/english";

export const prerender = false;

const evaluateSchema = z.object({
  dialogue_id: z.string().min(1),
  turn_index: z.number().int().min(0),
  expected_answer: z.string().min(1),
  accepted_answers: z.array(z.string()).min(1),
  user_answer: z.string().min(1).max(500),
  target_structures: z.array(z.string()),
  context: z.object({
    teacher_question: z.string(),
    lesson_title: z.string(),
  }),
});

/**
 * POST /api/english/evaluate
 * Evaluates a student's answer against the expected answer.
 * Uses exact match first, then LLM evaluation as fallback.
 * Optionally generates Polish TTS feedback via ElevenLabs.
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // 1. Auth check
    if (!locals.user?.id && import.meta.env.MODE === "production") {
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

    const validationResult = evaluateSchema.safeParse(body);
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

    const command: EvaluateAnswerCommand = validationResult.data;

    // 3. Evaluate the answer
    const openrouterApiKey = import.meta.env.OPENROUTER_API_KEY;
    const result = await evaluateStudentAnswer(command, openrouterApiKey);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    await logError({
      source: ErrorSource.API,
      error_code: "ENGLISH_EVALUATE_ERROR",
      error_message: errorMessage,
    });

    return new Response(JSON.stringify({ error: "Wystąpił błąd podczas oceny odpowiedzi" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
