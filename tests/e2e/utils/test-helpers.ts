/**
 * Pomocnicze funkcje dla testów E2E
 */

/**
 * Generuje unikalną nazwę dla testu, zawierającą prefiks, timestamp i losowy identyfikator
 * @param prefix Prefiks nazwy (np. "Kolekcja", "Import")
 * @returns Unikalna nazwa dla testu
 */
export function generateUniqueName(prefix: string = 'Test'): string {
  const timestamp = Date.now();
  const randomId = Math.floor(Math.random() * 10000);
  return `${prefix} ${timestamp}-${randomId}`;
}

/**
 * Czeka określony czas (w milisekundach)
 * @param ms Czas oczekiwania w milisekundach
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Próbuje wykonać operację do skutku lub do osiągnięcia limitu prób
 * @param fn Funkcja do wykonania
 * @param options Opcje (maksymalna liczba prób, opóźnienie między próbami)
 */
export async function retry<T>(
  fn: () => Promise<T>, 
  options: { maxAttempts?: number; delay?: number } = {}
): Promise<T> {
  const { maxAttempts = 3, delay = 1000 } = options;
  let attempts = 0;
  let lastError: Error | null = null;

  while (attempts < maxAttempts) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      attempts++;
      if (attempts >= maxAttempts) break;
      await wait(delay);
    }
  }

  throw lastError || new Error(`Operacja nie powiodła się po ${maxAttempts} próbach`);
} 