import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  // Używamy nazwy zmiennej środowiskowej podanej przez użytkownika
  const apiKey = import.meta.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.error("[Moderation API] Klucz API (OPENAI_API_KEY) nie jest skonfigurowany.");
    return new Response(
      JSON.stringify({ error: "Klucz API (OPENAI_API_KEY) nie jest skonfigurowany." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  let input;
  try {
    const data = await request.json();
    input = data.input;
    if (typeof input !== 'string' || input.trim() === '') {
      console.error('Błąd walidacji: Pole "input" jest wymagane i musi być niepustym ciągiem znaków.', { receivedInput: input });
      return new Response(
        JSON.stringify({ error: 'Nieprawidłowe dane wejściowe. Pole "input" jest wymagane i musi być niepustym ciągiem znaków.' }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Nie udało się przetworzyć żądania. Upewnij się, że wysyłasz poprawny JSON z polem "input".' }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    console.log('[Moderation API] Otrzymano tekst do moderacji:', input);

    // Standardowy endpoint OpenAI Moderation API
    const moderationApiUrl = 'https://api.openai.com/v1/moderations';

    const response = await fetch(moderationApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ input }),
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        // Jeśli odpowiedź błędu nie jest JSONem
        errorData = { message: response.statusText || 'Nieznany błąd API OpenAI.' };
      }
      console.error('Błąd API OpenAI:', response.status, errorData);
      return new Response(
        JSON.stringify({ 
          error: `Błąd podczas komunikacji z API OpenAI: ${errorData.error?.message || errorData.message || response.statusText}` 
        }),
        { status: response.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const moderationResult = await response.json();

    console.log('[Moderation API] Surowa odpowiedź z OpenAI:', JSON.stringify(moderationResult, null, 2));

    // Zgodnie z dokumentacją OpenAI, interesuje nas pole `results[0].flagged`
    const isFlagged = moderationResult.results?.[0]?.flagged === true;

    console.log('[Moderation API] Wynik moderacji - oflagowane:', isFlagged);

    return new Response(
      JSON.stringify({
        flagged: isFlagged,
        // Opcjonalnie: zwróć całą odpowiedź z OpenAI, jeśli potrzebujesz więcej szczegółów
        // openAiResponse: moderationResult 
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('Wewnętrzny błąd serwera podczas wywołania API moderacji:', error);
    return new Response(
      JSON.stringify({ error: 'Wystąpił wewnętrzny błąd serwera podczas przetwarzania żądania moderacji.' }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}; 