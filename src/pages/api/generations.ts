import type { APIRoute } from "astro";
import { z } from "zod";
import { generateFlashcards } from "../../lib/generation.service";
import type { GenerateFlashcardsCommand, GenerationCreateResponseDto } from "../../types";

export const prerender = false;

// Validation schema for the request body
const generateFlashcardsSchema = z.object({
  source_text: z
    .string()
    .min(1000, "Source text must be at least 1000 characters long")
    .max(10000, "Source text must not exceed 10000 characters"),
});

// API endpoint handler for generating flashcards
export const POST: APIRoute = async ({ request }) => {
  try {
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

    // 2. Call generation service to generate flashcards
    try {
      const result = await generateFlashcards(source_text);

      const response: GenerationCreateResponseDto = {
        generation_id: result.generationId,
        flashcards_proposals: result.proposals,
        generated_count: result.proposals.length,
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
