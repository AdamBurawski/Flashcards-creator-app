import type { APIRoute } from "astro";
import { z } from "zod";
import { DEFAULT_USER_ID } from "../../../db/supabase.client";
import { ErrorSource, logError } from "../../../lib/error-logger.service";
import { transcribeAudio } from "../../../lib/openai.service";

export const prerender = false;

/**
 * Endpoint POST /api/learn/transcribe
 * Przyjmuje plik audio i transkrybuje go za pomocą API Whisper
 * 
 * Zwraca:
 * - transcript: String z transkrypcją
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

    // 2. Obsługa multipart/form-data
    // Sprawdź, czy zapytanie zawiera plik audio
    if (!request.headers.get("content-type")?.includes("multipart/form-data")) {
      return new Response(
        JSON.stringify({ error: "Wymagany jest plik audio w formacie multipart/form-data" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // 3. Sprawdzenie flagi trybu bypass dla testów
    const bypassEnv = import.meta.env.BYPASS_DATABASE;
    const isBypassMode = bypassEnv === "true" || bypassEnv === true;

    if (isBypassMode) {
      console.log("[BYPASS_DATABASE] Symulowanie transkrypcji audio");
      
      // W trybie bypass zwracamy przykładową transkrypcję
      return new Response(
        JSON.stringify({
          transcript: "To jest przykładowa transkrypcja dla trybu testowego."
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // 4. Pobranie danych formularza
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File | null;

    if (!audioFile) {
      return new Response(
        JSON.stringify({ error: "Nie znaleziono pliku audio" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // 5. Sprawdzenie rozmiaru pliku (max 25MB dla Whisper API)
    const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
    if (audioFile.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({ error: "Plik audio jest zbyt duży (maksymalnie 25MB)" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // Logowanie informacji o pliku dla celów diagnostycznych
    console.log(`[DEBUG] Otrzymano plik audio: ${audioFile.name}, typu: ${audioFile.type}, rozmiaru: ${audioFile.size} bajtów`);

    // 6. Upewnij się, że plik ma poprawne rozszerzenie
    const validExtensions = ['flac', 'm4a', 'mp3', 'mp4', 'mpeg', 'mpga', 'oga', 'ogg', 'wav', 'webm'];
    
    // Pobierz rozszerzenie z nazwy pliku
    const fileExt = audioFile.name.split('.').pop()?.toLowerCase() || '';

    // Sprawdź, czy rozszerzenie jest wspierane, jeśli nie - zmień nazwę pliku
    if (!validExtensions.includes(fileExt)) {
      // Określ nowy typ MIME na podstawie faktycznego typu pliku
      let newExtension = 'mp3'; // domyślne rozszerzenie
      
      if (audioFile.type.includes('webm')) newExtension = 'webm';
      else if (audioFile.type.includes('mp4')) newExtension = 'mp4';
      else if (audioFile.type.includes('ogg')) newExtension = 'ogg';
      else if (audioFile.type.includes('wav')) newExtension = 'wav';
      
      console.log(`[DEBUG] Nieprawidłowe rozszerzenie pliku: ${fileExt}, zmieniam na: ${newExtension}`);
      
      // Konwersja pliku z poprawnym rozszerzeniem/typem MIME
      const audioData = await audioFile.arrayBuffer();
      const correctAudioFile = new File(
        [audioData], 
        `recording.${newExtension}`, 
        { type: `audio/${newExtension}` }
      );
      
      // 7. Wywołanie API Whisper przez nasz serwis z poprawionym plikiem
      const { transcript, error } = await transcribeAudio(correctAudioFile);
      
      if (error) {
        return new Response(
          JSON.stringify({ error }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" }
          }
        );
      }
      
      // 8. Zwróć transkrypcję
      return new Response(
        JSON.stringify({ transcript }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    
    // 7. Wywołanie API Whisper przez nasz serwis (używając oryginalnego pliku, jeśli jego rozszerzenie jest ok)
    const { transcript, error } = await transcribeAudio(audioFile);
    
    if (error) {
      return new Response(
        JSON.stringify({ error }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    
    // 8. Zwróć transkrypcję
    return new Response(
      JSON.stringify({ transcript }),
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
      error_code: "TRANSCRIBE_ERROR",
      error_message: errorMessage
    });

    return new Response(
      JSON.stringify({
        error: "Wystąpił błąd podczas transkrypcji audio",
        details: errorMessage
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}; 