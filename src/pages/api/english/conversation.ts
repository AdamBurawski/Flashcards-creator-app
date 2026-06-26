import type { APIRoute } from "astro";
import { z } from "zod";
import type { CEFRLevel } from "../../../types/english";
import { ErrorSource, logError } from "../../../lib/error-logger.service";
import {
  generateConversationReply,
  type ConversationHistoryEntry,
  type GenerateConversationReplyCommand,
} from "../../../lib/english-conversation.service";

export const prerender = false;

const conversationSchema = z.object({
  question: z.string().min(1).max(500),
  level: z.enum(["A1", "A2", "B1", "B2"]),
  lesson_title: z.string().min(1).max(200),
  target_vocab: z.array(z.string()).default([]),
  target_structures: z.array(z.string()).default([]),
  history: z
    .array(
      z.object({
        role: z.enum(["student", "teacher"]),
        text: z.string().min(1).max(500),
      })
    )
    .max(20)
    .default([]),
});

/**
 * POST /api/english/conversation
 * Generates a short teacher reply in free-conversation mode + follow-up suggestions.
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

    const parsed = conversationSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          error: "Nieprawidłowe dane wejściowe",
          details: parsed.error.format(),
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const command: GenerateConversationReplyCommand = {
      question: parsed.data.question,
      level: parsed.data.level as CEFRLevel,
      lesson_title: parsed.data.lesson_title,
      target_vocab: parsed.data.target_vocab,
      target_structures: parsed.data.target_structures,
      history: parsed.data.history as ConversationHistoryEntry[],
    };

    const openrouterApiKey = import.meta.env.OPENROUTER_API_KEY;
    const result = await generateConversationReply(command, openrouterApiKey);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    await logError({
      source: ErrorSource.API,
      error_code: "ENGLISH_CONVERSATION_ERROR",
      error_message: errorMessage,
    });

    return new Response(JSON.stringify({ error: "Wystąpił błąd podczas rozmowy z lektorem" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
