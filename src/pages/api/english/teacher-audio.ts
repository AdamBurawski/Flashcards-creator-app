import type { APIRoute } from "astro";
import { z } from "zod";
import { generateSpeechBase64, getTeacherEnVoiceId } from "../../../lib/elevenlabs.service";
import { ErrorSource, logError } from "../../../lib/error-logger.service";

export const prerender = false;

const bodySchema = z.object({
  text: z.string().min(1).max(500),
});

/**
 * POST /api/english/teacher-audio
 * Generates English teacher TTS audio using ElevenLabs.
 * Returns a base64 data URL for immediate playback.
 *
 * Body: { text: string }
 * Response 200: { audio_url: string } — base64 data:audio/mpeg
 * Response 204: {} — ElevenLabs not configured, client should fall back to browser TTS
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    if (!locals.user?.id && import.meta.env.MODE === "production") {
      return new Response(JSON.stringify({ error: "Nieautoryzowany dostęp" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "Nieprawidłowe ciało zapytania JSON" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Pole 'text' jest wymagane i nie może przekraczać 500 znaków" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const voiceId = getTeacherEnVoiceId();
    if (!voiceId) {
      return new Response(null, { status: 204 });
    }

    const audioUrl = await generateSpeechBase64(parsed.data.text, voiceId, {
      stability: 0.45,
      similarity_boost: 0.75,
    });

    if (!audioUrl) {
      return new Response(null, { status: 204 });
    }

    return new Response(JSON.stringify({ audio_url: audioUrl }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    await logError({
      source: ErrorSource.API,
      error_code: "TEACHER_AUDIO_ERROR",
      error_message: errorMessage,
    });

    return new Response(JSON.stringify({ error: "Błąd generowania audio" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
