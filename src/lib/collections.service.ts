import type { SupabaseClient } from "../db/supabase.client";
import { ErrorSource, logError } from "./error-logger.service";

/**
 * Sprawdza czy użytkownik ma dostęp do danej kolekcji
 * @param supabase Klient Supabase
 * @param collectionId ID kolekcji do sprawdzenia
 * @param userId ID użytkownika
 * @returns Obiekt zawierający informację o dostępie i ewentualny błąd
 */
export async function checkCollectionAccess(
  supabase: SupabaseClient,
  collectionId: number,
  userId: string
): Promise<{ hasAccess: boolean; error?: string }> {
  try {
    // Sprawdź czy kolekcja istnieje i należy do użytkownika
    const { data, error } = await supabase
      .from("collections")
      .select("id")
      .eq("id", collectionId)
      .eq("user_id", userId)
      .single();

    if (error) {
      // Logowanie błędu
      await logError({
        source: ErrorSource.DATABASE,
        error_code: "COLLECTION_ACCESS_ERROR",
        error_message: error.message,
        user_id: userId,
        metadata: { collection_id: collectionId },
      });

      return {
        hasAccess: false,
        error: "Wystąpił błąd podczas weryfikacji dostępu do kolekcji",
      };
    }

    // Jeśli nie znaleziono kolekcji, oznacza to brak dostępu
    if (!data) {
      return {
        hasAccess: false,
        error: "Kolekcja nie istnieje lub nie masz do niej dostępu",
      };
    }

    return { hasAccess: true };
  } catch (error) {
    // Obsługa nieoczekiwanych błędów
    const errorMessage = error instanceof Error ? error.message : String(error);

    await logError({
      source: ErrorSource.DATABASE,
      error_code: "UNEXPECTED_COLLECTION_ACCESS_ERROR",
      error_message: errorMessage,
      user_id: userId,
      metadata: { collection_id: collectionId },
    });

    return {
      hasAccess: false,
      error: "Wystąpił nieoczekiwany błąd podczas weryfikacji dostępu do kolekcji",
    };
  }
}

/**
 * Pobiera fiszki z określonej kolekcji do sesji nauki
 * @param supabase Klient Supabase
 * @param collectionId ID kolekcji
 * @param userId ID użytkownika
 * @returns Tablica fiszek lub null w przypadku błędu
 */
export async function getFlashcardsForLearning(supabase: SupabaseClient, collectionId: number, userId: string) {
  try {
    // Pobierz wszystkie fiszki należące do kolekcji i użytkownika
    const { data, error } = await supabase
      .from("flashcards")
      .select("id, front, back")
      .eq("collection_id", collectionId)
      .eq("user_id", userId);

    if (error) {
      // Logowanie błędu
      await logError({
        source: ErrorSource.DATABASE,
        error_code: "FLASHCARDS_FETCH_ERROR",
        error_message: error.message,
        user_id: userId,
        metadata: { collection_id: collectionId },
      });

      return null;
    }

    // Losowanie kolejności fiszek
    const shuffledFlashcards = data ? [...data].sort(() => Math.random() - 0.5) : [];

    return shuffledFlashcards;
  } catch (error) {
    // Obsługa nieoczekiwanych błędów
    const errorMessage = error instanceof Error ? error.message : String(error);

    await logError({
      source: ErrorSource.DATABASE,
      error_code: "UNEXPECTED_FLASHCARDS_FETCH_ERROR",
      error_message: errorMessage,
      user_id: userId,
      metadata: { collection_id: collectionId },
    });

    return null;
  }
}
