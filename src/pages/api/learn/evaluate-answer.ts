import type { APIRoute } from "astro";
import { z } from "zod";
import { DEFAULT_USER_ID } from "../../../db/supabase.client";
import { ErrorSource, logError } from "../../../lib/error-logger.service";
import { evaluateAnswer } from "../../../lib/openai.service";

export const prerender = false;

// Schemat walidacji dla ciała zapytania
const evaluateAnswerSchema = z.object({
  questionText: z.string().min(1, "Treść pytania jest wymagana"),
  expectedAnswerText: z.string().min(1, "Oczekiwana odpowiedź jest wymagana"),
  userAnswerText: z.string().min(1, "Odpowiedź użytkownika jest wymagana")
});

/**
 * Endpoint POST /api/learn/evaluate-answer
 * Ocenia odpowiedź użytkownika za pomocą LLM (GPT-4o-mini).
 * 
 * Ciało zapytania:
 * - questionText: Tekst pytania z fiszki (front)
 * - expectedAnswerText: Oczekiwana odpowiedź z fiszki (back)
 * - userAnswerText: Transkrypcja odpowiedzi użytkownika
 * 
 * Zwraca:
 * - isCorrect: true/false
 * - llmFeedback: opcjonalny dodatkowy komentarz
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // 1. Uwierzytelnienie użytkownika
    let userId: string = DEFAULT_USER_ID;
    
    if (locals.user && locals.user.id) {
      userId = locals.user.id;
    } else if (import.meta.env.MODE === "production") {
      // W środowisku produkcyjnym wymagamy autentykacji
      return new Response(
        JSON.stringify({ error: "Nieautoryzowany dostęp" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // 2. Walidacja ciała zapytania
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return new Response(
        JSON.stringify({ error: "Nieprawidłowe ciało zapytania JSON" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    const validationResult = evaluateAnswerSchema.safeParse(body);
    if (!validationResult.success) {
      const validationErrors = validationResult.error.format();
      
      await logError({
        source: ErrorSource.VALIDATION,
        error_code: "SCHEMA_VALIDATION_ERROR",
        error_message: "Nieprawidłowe dane wejściowe",
        user_id: userId,
        metadata: { validation_errors: validationErrors }
      });

      return new Response(
        JSON.stringify({
          error: "Nieprawidłowe dane wejściowe",
          details: validationErrors
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    const { questionText, expectedAnswerText, userAnswerText } = validationResult.data;

    // 3. Sprawdzenie flagi trybu bypass dla testów
    const bypassEnv = import.meta.env.BYPASS_DATABASE;
    const isBypassMode = bypassEnv === "true" || bypassEnv === true;

    if (isBypassMode) {
      console.log("[BYPASS_DATABASE] Symulowanie oceny odpowiedzi przez LLM");
      
      // Prosta symulacja oceny - sprawdza, czy odpowiedź użytkownika zawiera kluczowe słowa z oczekiwanej odpowiedzi
      const keywordsFromExpected = expectedAnswerText
        .toLowerCase()
        .split(/[.,;:!?\s]+/)
        .filter(word => word.length > 3);
        
      const userAnswerLower = userAnswerText.toLowerCase();
      
      // Sprawdź, czy co najmniej połowa kluczowych słów występuje w odpowiedzi użytkownika
      const matchedKeywords = keywordsFromExpected.filter(keyword => 
        userAnswerLower.includes(keyword)
      );
      
      const isCorrect = matchedKeywords.length >= Math.ceil(keywordsFromExpected.length * 0.5);
      
      return new Response(
        JSON.stringify({
          isCorrect,
          llmFeedback: isCorrect 
            ? "Twoja odpowiedź jest poprawna!" 
            : "Twoja odpowiedź nie zawiera wystarczającej liczby kluczowych elementów."
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // 4. Wywołanie serwisu do oceny odpowiedzi przez LLM
    const result = await evaluateAnswer(questionText, expectedAnswerText, userAnswerText);
    
    if (result.error) {
      return new Response(
        JSON.stringify({ error: result.error }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // 5. Zwróć wynik oceny
    return new Response(
      JSON.stringify({
        isCorrect: result.isCorrect,
        llmFeedback: result.feedback
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    // Logowanie błędu
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    await logError({
      source: ErrorSource.API,
      error_code: "EVALUATE_ANSWER_ERROR",
      error_message: errorMessage
    });

    return new Response(
      JSON.stringify({
        error: "Wystąpił błąd podczas oceny odpowiedzi",
        details: errorMessage
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}; 