/**
 * Formatuje datę ISO do czytelnego formatu.
 * @param isoDateString data w formacie ISO (np. z pola created_at z bazy danych)
 * @returns sformatowany string daty w lokalnym formacie 
 */
export function formatDate(isoDateString: string): string {
  try {
    const date = new Date(isoDateString);
    
    // Sprawdź, czy data jest prawidłowa
    if (isNaN(date.getTime())) {
      return "Data nieznana";
    }
    
    return date.toLocaleDateString("pl-PL", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch (error) {
    console.error("Błąd formatowania daty:", error);
    return "Data nieznana";
  }
}

/**
 * Formatuje datę ISO do formatu względnego (np. "2 dni temu")
 * @param isoDateString data w formacie ISO (np. z pola created_at z bazy danych)
 * @returns sformatowany string daty w formacie względnym
 */
export function formatRelativeDate(isoDateString: string): string {
  try {
    const date = new Date(isoDateString);
    const now = new Date();
    
    // Sprawdź, czy data jest prawidłowa
    if (isNaN(date.getTime())) {
      return "Data nieznana";
    }
    
    const diffInMilliseconds = now.getTime() - date.getTime();
    const diffInSeconds = Math.floor(diffInMilliseconds / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);
    
    if (diffInSeconds < 60) {
      return "przed chwilą";
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} ${pluralize(diffInMinutes, "minutę", "minuty", "minut")} temu`;
    } else if (diffInHours < 24) {
      return `${diffInHours} ${pluralize(diffInHours, "godzinę", "godziny", "godzin")} temu`;
    } else if (diffInDays < 7) {
      return `${diffInDays} ${pluralize(diffInDays, "dzień", "dni", "dni")} temu`;
    } else {
      return formatDate(isoDateString);
    }
  } catch (error) {
    console.error("Błąd formatowania daty względnej:", error);
    return "Data nieznana";
  }
}

/**
 * Pomocnicza funkcja do obsługi polskiej odmiany słów
 */
function pluralize(count: number, form1: string, form2to4: string, form5plus: string): string {
  if (count === 1) {
    return form1;
  } else if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20)) {
    return form2to4;
  } else {
    return form5plus;
  }
} 