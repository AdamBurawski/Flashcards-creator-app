import type { APIRoute } from "astro";
import { z } from "zod";
import { checkCollectionAccess, getFlashcardsForLearning } from "../../../../lib/collections.service";
import { DEFAULT_USER_ID } from "../../../../db/supabase.client";
import { ErrorSource, logError } from "../../../../lib/error-logger.service";

export const prerender = false;

/**
 * Endpoint GET /api/collections/{id}/learn
 * Pobiera fiszki dla sesji nauki z określonej kolekcji.
 * Wymaga uwierzytelnienia użytkownika.
 * 
 * Parametry URL:
 * - id: ID kolekcji
 * 
 * Zwraca:
 * - Tablicę fiszek z id, front i back
 */
export const GET: APIRoute = async ({ params, locals }) => {
  try {
    // 1. Pobierz parametr ID kolekcji z URL i zwaliduj
    const idParam = params.id;
    if (!idParam) {
      return new Response(
        JSON.stringify({ error: "Brak ID kolekcji" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    const collectionId = parseInt(idParam, 10);
    if (isNaN(collectionId)) {
      return new Response(
        JSON.stringify({ error: "Nieprawidłowe ID kolekcji" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // 2. Sprawdź uwierzytelnienie użytkownika
    let userId: string = DEFAULT_USER_ID;
    const bypassEnv = import.meta.env.BYPASS_DATABASE;
    const isBypassMode = bypassEnv === "true" || bypassEnv === true;

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

    // 3. Sprawdź dostęp użytkownika do kolekcji (pomiń w trybie bypass)
    if (!isBypassMode) {
      const supabase = locals.supabase;
      if (!supabase) {
        return new Response(
          JSON.stringify({ error: "Błąd połączenia z bazą danych" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" }
          }
        );
      }

      const { hasAccess, error } = await checkCollectionAccess(supabase, collectionId, userId);
      if (!hasAccess) {
        // Określ odpowiedni kod statusu
        let statusCode = 403; // Domyślnie forbidden
        if (error && error.includes("nie istnieje")) {
          statusCode = 404; // Not found
        }

        return new Response(
          JSON.stringify({ error: error || "Brak dostępu do kolekcji" }),
          {
            status: statusCode,
            headers: { "Content-Type": "application/json" }
          }
        );
      }

      // 4. Pobierz fiszki z kolekcji
      const flashcards = await getFlashcardsForLearning(supabase, collectionId, userId);
      if (flashcards === null) {
        return new Response(
          JSON.stringify({ error: "Błąd podczas pobierania fiszek" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" }
          }
        );
      }

      // 5. Zwróć fiszki
      return new Response(
        JSON.stringify({ flashcards }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      );
    } else {
      // Tryb bypass - zwróć przykładowe dane
      console.log("[BYPASS_DATABASE] Symulowanie pobierania fiszek do nauki");

      // Przykładowe fiszki (w losowej kolejności)
      const mockFlashcards = [
        { id: 1, front: "Co to jest React?", back: "Biblioteka JavaScript do budowania interfejsów użytkownika" },
        { id: 2, front: "Co to jest TypeScript?", back: "JavaScript z typami statycznymi" },
        { id: 3, front: "Co to jest Astro?", back: "Framework do budowania stron internetowych" },
        { id: 4, front: "Co to jest Tailwind?", back: "Framework CSS z klasami użytkowymi" },
        { id: 5, front: "Co to jest Node.js?", back: "Środowisko uruchomieniowe JavaScript" }
      ].sort(() => Math.random() - 0.5);

      return new Response(
        JSON.stringify({ flashcards: mockFlashcards }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
  } catch (error) {
    // Logowanie błędu
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    await logError({
      source: ErrorSource.API,
      error_code: "LEARN_ENDPOINT_ERROR",
      error_message: errorMessage,
      metadata: { url_params: params },
    });

    // Odpowiedź z błędem serwera
    return new Response(
      JSON.stringify({ error: "Wystąpił nieoczekiwany błąd podczas przetwarzania żądania" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}; 