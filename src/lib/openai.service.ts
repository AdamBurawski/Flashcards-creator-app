/**
 * Serwis do komunikacji z API OpenAI
 * Obsługuje wywołania do różnych endpointów API OpenAI, w tym:
 * - Whisper API do transkrypcji audio
 * - GPT-4 API do oceny odpowiedzi
 * Zarządza również limitami tokenów dla użytkowników.
 */

import { ErrorSource, logError } from "./error-logger.service";
// import { supabase } from "../db/supabase.client"; // Usunięto globalnego klienta Supabase
import type { Database } from "../db/supabase.types"; // Zaimportuj wygenerowane typy
import type { SupabaseClient } from "@supabase/supabase-js"; // Import typu SupabaseClient

// Konfiguracja dla API OpenAI
const OPENAI_API_KEY = import.meta.env.OPENAI_API_KEY || "";
const OPENAI_API_BASE_URL = "https://api.openai.com/v1";

// Domyślne ustawienia limitów tokenów
const DEFAULT_MONTHLY_TOKEN_LIMIT = 50000;
const WHISPER_AUDIO_SECOND_TO_TOKENS_RATE = 16.67; // Około 1000 tokenów na minutę
const ESTIMATED_TOKENS_PER_TRANSCRIPTION_REQUEST = 1000; // Uproszczony stały koszt, jeśli nie mamy długości audio

// Sprawdzenie, czy klucz API jest dostępny
const isConfigured = () => {
  return !!OPENAI_API_KEY;
};

interface UserTokenStatus {
  limit: number;
  usage: number;
  canUseTokens: (requestedTokens: number) => { canUse: boolean; remainingTokens: number };
  userId: string;
}

/**
 * Pobiera status zużycia tokenów AI dla użytkownika, resetuje miesięczne zużycie w razie potrzeby.
 * Tworzy profil użytkownika z domyślnymi limitami, jeśli nie istnieje.
 * @param userId ID użytkownika z Supabase
 * @param supabaseClient Instancja klienta Supabase
 * @returns Obiekt UserTokenStatus
 */
export async function getUserTokenStatus(
  userId: string,
  supabaseClient: SupabaseClient<Database>
): Promise<UserTokenStatus> {
  const { data: profile, error: profileError } = await supabaseClient
    .from("profiles") // Zakładamy, że 'profiles' będzie w Database['public']['Tables']
    .select("monthly_ai_token_limit, current_ai_token_usage, ai_usage_last_reset_at, user_id")
    .eq("user_id", userId)
    .single<Database["public"]["Tables"]["profiles"]["Row"]>(); // Jawne typowanie dla .single()

  if (profileError && profileError.code !== "PGRST116") {
    // PGRST116: no rows found
    console.error(`[OpenAI Service] Błąd podczas pobierania profilu dla userId: ${userId}`, profileError);
    await logError({
      source: ErrorSource.DATABASE,
      error_code: "PROFILE_FETCH_ERROR",
      error_message: profileError.message,
      metadata: { userId },
    });
    return {
      limit: 0,
      usage: 0,
      canUseTokens: () => ({ canUse: false, remainingTokens: 0 }),
      userId,
    };
  }

  const now = new Date();
  let limit = DEFAULT_MONTHLY_TOKEN_LIMIT;
  let usage = 0;
  let lastReset = profile?.ai_usage_last_reset_at
    ? new Date(profile.ai_usage_last_reset_at)
    : new Date(now.getFullYear(), now.getMonth(), 1);

  if (profile) {
    limit = profile.monthly_ai_token_limit ?? DEFAULT_MONTHLY_TOKEN_LIMIT;
    usage = profile.current_ai_token_usage ?? 0;

    if (now.getFullYear() > lastReset.getFullYear() || now.getMonth() > lastReset.getMonth()) {
      usage = 0;
      lastReset = new Date(now.getFullYear(), now.getMonth(), 1);
      const { error: updateError } = await supabaseClient
        .from("profiles")
        .update({ current_ai_token_usage: 0, ai_usage_last_reset_at: lastReset.toISOString() })
        .eq("user_id", userId);
      if (updateError) {
        console.error(`[OpenAI Service] Błąd podczas resetowania zużycia tokenów dla userId: ${userId}`, updateError);
        await logError({
          source: ErrorSource.DATABASE,
          error_code: "TOKEN_USAGE_RESET_ERROR",
          error_message: updateError.message,
          metadata: { userId },
        });
      }
    }
  } else {
    const { error: insertError } = await supabaseClient
      .from("profiles")
      .insert({
        user_id: userId,
        monthly_ai_token_limit: DEFAULT_MONTHLY_TOKEN_LIMIT,
        current_ai_token_usage: 0,
        ai_usage_last_reset_at: lastReset.toISOString(),
      } as Database["public"]["Tables"]["profiles"]["Insert"]) // Jawne typowanie dla insert
      .select(); // Dodaj .select() aby uniknąć zwracania null przy sukcesie, jeśli RLS jest włączony
    if (insertError) {
      console.error(`[OpenAI Service] Błąd podczas tworzenia profilu dla userId: ${userId}`, insertError);
      await logError({
        source: ErrorSource.DATABASE,
        error_code: "PROFILE_CREATE_ERROR",
        error_message: insertError.message,
        metadata: { userId },
      });
      return {
        limit: 0,
        usage: 0,
        canUseTokens: () => ({ canUse: false, remainingTokens: 0 }),
        userId,
      };
    }
  }

  const canUseTokens = (requestedTokens: number) => {
    const remaining = limit - usage;
    return {
      canUse: remaining >= requestedTokens,
      remainingTokens: remaining,
    };
  };

  return { limit, usage, canUseTokens, userId };
}

/**
 * Aktualizuje zużycie tokenów AI dla użytkownika.
 * @param userId ID użytkownika
 * @param tokensUsed Liczba zużytych tokenów
 * @param supabaseClient Instancja klienta Supabase
 */
export async function updateUserTokenUsage(
  userId: string,
  tokensUsed: number,
  supabaseClient: SupabaseClient<Database>
): Promise<void> {
  if (tokensUsed <= 0) return;

  const { error } = await supabaseClient.rpc("increment_ai_token_usage", {
    p_user_id: userId,
    p_tokens_used: tokensUsed,
  });

  if (error) {
    console.error(`[OpenAI Service] Błąd podczas aktualizacji zużycia tokenów dla userId: ${userId}`, error);
    await logError({
      source: ErrorSource.DATABASE,
      error_code: "TOKEN_USAGE_UPDATE_ERROR",
      error_message: error.message,
      metadata: { userId, tokensUsed },
    });
  }
}

/**
 * Transkrybuje plik audio za pomocą API Whisper
 * @param audioFile Plik audio do transkrypcji
 * @param userId ID użytkownika dokonującego transkrypcji
 * @param supabaseClient Instancja klienta Supabase
 * @param audioDurationSeconds Długość nagrania w sekundach (opcjonalne, do dokładniejszego liczenia tokenów)
 * @returns Obiekt z transkrypcją lub błędem
 */
export async function transcribeAudio(
  audioFile: File,
  userId: string,
  supabaseClient: SupabaseClient<Database>,
  audioDurationSeconds?: number
): Promise<{
  transcript?: string;
  error?: string;
  errorCode?: "TOKEN_LIMIT_EXCEEDED" | "API_ERROR" | "CONFIG_ERROR" | "FILE_FORMAT_ERROR" | "UNEXPECTED_ERROR";
}> {
  try {
    if (!isConfigured()) {
      console.warn("Brak klucza API OpenAI. Transkrypcja nie jest możliwa.");
      return { error: "Usługa transkrypcji jest niedostępna. Brak klucza API.", errorCode: "CONFIG_ERROR" };
    }

    const tokenStatus = await getUserTokenStatus(userId, supabaseClient);
    const tokensForThisRequest = audioDurationSeconds
      ? Math.ceil(audioDurationSeconds * WHISPER_AUDIO_SECOND_TO_TOKENS_RATE)
      : ESTIMATED_TOKENS_PER_TRANSCRIPTION_REQUEST;

    const { canUse, remainingTokens } = tokenStatus.canUseTokens(tokensForThisRequest);

    if (!canUse) {
      console.warn(
        `[OpenAI Service] Użytkownik ${userId} przekroczył limit tokenów. Pozostało: ${remainingTokens}, Potrzebne: ${tokensForThisRequest}`
      );
      return {
        error: `Przekroczono miesięczny limit tokenów AI. Odnawia się on pierwszego dnia każdego miesiąca. Pozostało: ${Math.max(0, remainingTokens)} tokenów.`,
        errorCode: "TOKEN_LIMIT_EXCEEDED",
      };
    }

    const validExtensions = ["flac", "m4a", "mp3", "mp4", "mpeg", "mpga", "oga", "ogg", "wav", "webm"];
    const fileExt = audioFile.name.split(".").pop()?.toLowerCase() || "";

    if (!validExtensions.includes(fileExt)) {
      console.error(
        `Nieprawidłowy format pliku: ${fileExt}. Nazwa pliku: ${audioFile.name}, typ MIME: ${audioFile.type}`
      );
      return {
        error: `Format pliku ${fileExt} nie jest obsługiwany. Obsługiwane formaty: flac, m4a, mp3, mp4, mpeg, mpga, oga, ogg, wav, webm.`,
        errorCode: "FILE_FORMAT_ERROR",
      };
    }

    console.log(
      `[OpenAI Service] Wysyłam plik audio do transkrypcji dla userId: ${userId}: ${audioFile.name}, szacowany koszt tokenów: ${tokensForThisRequest}`
    );

    const formData = new FormData();
    formData.append("file", audioFile);
    formData.append("model", "whisper-1");
    formData.append("language", "pl");

    const response = await fetch(`${OPENAI_API_BASE_URL}/audio/transcriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const errorMessage = errorData?.error?.message || `HTTP error ${response.status}`;
      console.error(`[OpenAI Service] Błąd API Whisper dla userId: ${userId}: ${errorMessage}`, errorData);
      await logError({
        source: ErrorSource.EXTERNAL_API,
        error_code: "WHISPER_API_ERROR",
        error_message: errorMessage,
        metadata: { userId, status: response.status, file_name: audioFile.name },
      });
      return { error: "Nie udało się transkrybować audio. Spróbuj ponownie.", errorCode: "API_ERROR" };
    }

    const data = await response.json();
    await updateUserTokenUsage(userId, tokensForThisRequest, supabaseClient);
    console.log(
      `[OpenAI Service] Transkrypcja zakończona dla userId: ${userId}. Zaktualizowano zużycie o ${tokensForThisRequest} tokenów.`
    );
    return { transcript: data.text };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[OpenAI Service] Nieoczekiwany błąd transkrypcji dla userId: ${userId}: ${errorMessage}`);
    await logError({
      source: ErrorSource.EXTERNAL_API,
      error_code: "WHISPER_UNEXPECTED_ERROR",
      error_message: errorMessage,
      metadata: { userId, file_name: audioFile.name },
    });
    return { error: "Wystąpił nieoczekiwany błąd podczas transkrypcji.", errorCode: "UNEXPECTED_ERROR" };
  }
}

/**
 * Ocenia odpowiedź użytkownika za pomocą API GPT
 * @param userId ID użytkownika
 * @param questionText Tekst pytania
 * @param expectedAnswerText Oczekiwana odpowiedź
 * @param userAnswerText Odpowiedź użytkownika
 * @param supabaseClient Instancja klienta Supabase
 * @returns Obiekt z wynikiem oceny lub błędem
 */
export async function evaluateAnswer(
  userId: string,
  questionText: string,
  expectedAnswerText: string,
  userAnswerText: string,
  supabaseClient: SupabaseClient<Database>
): Promise<{
  isCorrect?: boolean;
  feedback?: string;
  error?: string;
  errorCode?: "TOKEN_LIMIT_EXCEEDED" | "API_ERROR" | "CONFIG_ERROR" | "UNEXPECTED_ERROR";
  tokensUsed?: number;
}> {
  try {
    if (!isConfigured()) {
      console.warn("Brak klucza API OpenAI. Ocena odpowiedzi nie jest możliwa.");
      return { error: "Usługa oceny odpowiedzi jest niedostępna. Brak klucza API.", errorCode: "CONFIG_ERROR" };
    }

    const estimatedMaxTokensForEval = 2000;
    const tokenStatus = await getUserTokenStatus(userId, supabaseClient);
    const { canUse: canInitiallyUse, remainingTokens } = tokenStatus.canUseTokens(estimatedMaxTokensForEval);

    if (!canInitiallyUse && tokenStatus.canUseTokens(1).remainingTokens <= 0) {
      console.warn(
        `[OpenAI Service] Użytkownik ${userId} przekroczył limit tokenów (wstępne sprawdzenie). Pozostało: ${remainingTokens}`
      );
      return {
        error: `Przekroczono miesięczny limit tokenów AI. Odnawia się on pierwszego dnia każdego miesiąca. Pozostało: ${Math.max(0, remainingTokens)} tokenów.`,
        errorCode: "TOKEN_LIMIT_EXCEEDED",
      };
    }

    const prompt = `
Oceniasz odpowiedź ucznia w kontekście pytania i oczekiwanej odpowiedzi.
Twoje zadanie to określić, czy odpowiedź użytkownika jest zasadniczo poprawna, biorąc pod uwagę znaczenie, a nie dokładne dopasowanie słów.

Pytanie: "${questionText}"
Oczekiwana odpowiedź: "${expectedAnswerText}"
Odpowiedź użytkownika: "${userAnswerText}"

Odpowiedz w formie JSON:
{
  "isCorrect": true/false,
  "feedback": "Krótki, jednozdaniowy komentarz wyjaśniający decyzję"
}
`;

    console.log(`[OpenAI Service] Wysyłam zapytanie o ocenę dla userId: ${userId}`);

    const response = await fetch(`${OPENAI_API_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Jesteś asystentem oceniającym odpowiedzi na pytania edukacyjne. Odpowiadasz wyłącznie w formacie JSON.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 150,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const errorMessage = errorData?.error?.message || `HTTP error ${response.status}`;
      console.error(`[OpenAI Service] Błąd API GPT dla userId: ${userId}: ${errorMessage}`, errorData);
      await logError({
        source: ErrorSource.EXTERNAL_API,
        error_code: "GPT_API_ERROR",
        error_message: errorMessage,
        metadata: { userId, status: response.status },
      });
      return { error: "Nie udało się ocenić odpowiedzi. Spróbuj ponownie.", errorCode: "API_ERROR" };
    }

    const data = await response.json();
    const actualTokensUsed = data.usage?.total_tokens || 0;

    const finalTokenStatus = await getUserTokenStatus(userId, supabaseClient);
    const { canUse: canFinallyUse, remainingTokens: finalRemaining } = finalTokenStatus.canUseTokens(actualTokensUsed);

    if (!canFinallyUse) {
      console.warn(
        `[OpenAI Service] Użytkownik ${userId} przekroczył limit tokenów po wykonaniu zapytania GPT. Zużyto: ${actualTokensUsed}, pozostało przed: ${finalRemaining + actualTokensUsed}`
      );
      await logError({
        source: ErrorSource.APPLICATION,
        error_code: "TOKEN_LIMIT_EXCEEDED_POST_CALL",
        error_message: "Użytkownik przekroczył limit tokenów po wywołaniu API GPT, ale przed aktualizacją zużycia.",
        metadata: {
          userId,
          actualTokensUsed,
          limit: finalTokenStatus.limit,
          usageBeforeThisCall: finalTokenStatus.usage,
        },
      });
      return {
        error: `Przekroczono miesięczny limit tokenów AI. Skontaktuj się z administratorem.`,
        errorCode: "TOKEN_LIMIT_EXCEEDED",
      };
    }

    await updateUserTokenUsage(userId, actualTokensUsed, supabaseClient);
    console.log(`[OpenAI Service] Ocena zakończona dla userId: ${userId}. Zużyto ${actualTokensUsed} tokenów.`);

    const content = data.choices[0]?.message?.content;
    if (!content) throw new Error("Brak odpowiedzi z API GPT");
    const result = JSON.parse(content);

    return {
      isCorrect: result.isCorrect,
      feedback: result.feedback || (result.isCorrect ? "Poprawna odpowiedź!" : "Niepoprawna odpowiedź."),
      tokensUsed: actualTokensUsed,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[OpenAI Service] Nieoczekiwany błąd oceny dla userId: ${userId}: ${errorMessage}`);
    await logError({
      source: ErrorSource.EXTERNAL_API,
      error_code: "GPT_UNEXPECTED_ERROR",
      error_message: errorMessage,
      metadata: { userId },
    });
    return { error: "Wystąpił nieoczekiwany błąd podczas oceny odpowiedzi.", errorCode: "UNEXPECTED_ERROR" };
  }
}
