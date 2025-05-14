/**
 * Serwis do komunikacji z API OpenAI
 * Obsługuje wywołania do różnych endpointów API OpenAI, w tym:
 * - Whisper API do transkrypcji audio
 * - GPT-4 API do oceny odpowiedzi
 */

import { ErrorSource, logError } from "./error-logger.service";

// Konfiguracja dla API OpenAI
const OPENAI_API_KEY = import.meta.env.OPENAI_API_KEY || "";
const OPENAI_API_BASE_URL = "https://api.openai.com/v1";

// Sprawdzenie, czy klucz API jest dostępny
const isConfigured = () => {
  return !!OPENAI_API_KEY;
};

/**
 * Transkrybuje plik audio za pomocą API Whisper
 * @param audioFile Plik audio do transkrypcji
 * @returns Obiekt z transkrypcją lub błędem
 */
export async function transcribeAudio(audioFile: File): Promise<{
  transcript?: string;
  error?: string;
}> {
  try {
    // Sprawdź, czy mamy dostęp do API
    if (!isConfigured()) {
      console.warn("Brak klucza API OpenAI. Transkrypcja nie jest możliwa.");
      return { error: "Usługa transkrypcji jest niedostępna. Brak klucza API." };
    }

    // Przygotuj dane formularza dla API Whisper
    const formData = new FormData();
    formData.append("file", audioFile);
    formData.append("model", "whisper-1");
    formData.append("language", "pl"); // Polski jako preferowany język

    // Wywołaj API Whisper
    const response = await fetch(`${OPENAI_API_BASE_URL}/audio/transcriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData,
    });

    // Sprawdź, czy odpowiedź jest OK
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const errorMessage = errorData?.error?.message || `HTTP error ${response.status}`;
      
      await logError({
        source: ErrorSource.EXTERNAL_API,
        error_code: "WHISPER_API_ERROR",
        error_message: errorMessage,
        metadata: { status: response.status },
      });
      
      return { error: "Nie udało się transkrybować audio. Spróbuj ponownie." };
    }

    // Parsuj odpowiedź
    const data = await response.json();
    
    return { transcript: data.text };
  } catch (error) {
    // Obsługa błędów
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    await logError({
      source: ErrorSource.EXTERNAL_API,
      error_code: "WHISPER_UNEXPECTED_ERROR",
      error_message: errorMessage,
    });
    
    return { error: "Wystąpił nieoczekiwany błąd podczas transkrypcji." };
  }
}

/**
 * Ocenia odpowiedź użytkownika za pomocą API GPT-4
 * @param questionText Tekst pytania (z fiszki)
 * @param expectedAnswerText Oczekiwana odpowiedź (z fiszki)
 * @param userAnswerText Odpowiedź użytkownika do oceny
 * @returns Obiekt z wynikiem oceny (true/false) i ewentualnym komentarzem
 */
export async function evaluateAnswer(
  questionText: string,
  expectedAnswerText: string,
  userAnswerText: string
): Promise<{
  isCorrect?: boolean;
  feedback?: string;
  error?: string;
}> {
  try {
    // Sprawdź, czy mamy dostęp do API
    if (!isConfigured()) {
      console.warn("Brak klucza API OpenAI. Ocena odpowiedzi nie jest możliwa.");
      return { error: "Usługa oceny odpowiedzi jest niedostępna. Brak klucza API." };
    }

    // Przygotuj prompt dla modelu GPT-4o-mini
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

    // Wywołaj API GPT-4o-mini
    const response = await fetch(`${OPENAI_API_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "Jesteś asystentem oceniającym odpowiedzi na pytania edukacyjne. Odpowiadasz wyłącznie w formacie JSON."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 150,
        response_format: { type: "json_object" }
      }),
    });

    // Sprawdź, czy odpowiedź jest OK
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const errorMessage = errorData?.error?.message || `HTTP error ${response.status}`;
      
      await logError({
        source: ErrorSource.EXTERNAL_API,
        error_code: "GPT_API_ERROR",
        error_message: errorMessage,
        metadata: { status: response.status },
      });
      
      return { error: "Nie udało się ocenić odpowiedzi. Spróbuj ponownie." };
    }

    // Parsuj odpowiedź
    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error("Brak odpowiedzi z API");
    }
    
    // Parsuj JSON z odpowiedzi
    const result = JSON.parse(content);
    
    return {
      isCorrect: result.isCorrect,
      feedback: result.feedback || (result.isCorrect ? "Poprawna odpowiedź!" : "Niepoprawna odpowiedź.")
    };
  } catch (error) {
    // Obsługa błędów
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    await logError({
      source: ErrorSource.EXTERNAL_API,
      error_code: "GPT_UNEXPECTED_ERROR",
      error_message: errorMessage,
    });
    
    return { error: "Wystąpił nieoczekiwany błąd podczas oceny odpowiedzi." };
  }
} 