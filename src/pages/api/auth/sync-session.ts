export const prerender = false;

import type { APIRoute } from "astro";

export const POST: APIRoute = async ({ request, locals, cookies }) => {
  try {
    // Pobierz dane sesji z body żądania
    const { session } = await request.json();

    // console.log("Otrzymano dane sesji do synchronizacji:", !!session);

    if (session && locals.supabase) {
      // Ustaw cookie z tokenem dla SSR
      if (session.access_token) {
        cookies.set("supabase-auth-token", session.access_token, {
          path: "/",
          httpOnly: false, // false aby klient też miał dostęp
          secure: import.meta.env.PROD,
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 7, // tydzień
        });

        // Zapisz też w locals
        locals.token = session.access_token;
      }

      // Próba ustawienia sesji w Supabase
      const { data, error } = await locals.supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });

      if (error) {
        // console.error("Błąd podczas synchronizacji sesji:", error);
        return new Response(
          JSON.stringify({
            success: false,
            message: "Nie udało się zsynchronizować sesji",
            error: error.message,
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
      }

      // Aktualizacja danych w locals
      locals.session = data.session;
      locals.user = data.session?.user ?? null;

      // console.log("Sesja zsynchronizowana pomyślnie, użytkownik:", data.session?.user?.email);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Sesja zsynchronizowana pomyślnie",
          user: data.session?.user,
          token: session.access_token,
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            // Dodaj token jako nagłówek, aby klient mógł go używać
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        message: "Brak danych sesji do synchronizacji",
      }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (_error) {
    // console.error("Błąd podczas przetwarzania synchronizacji sesji:", _error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "Wystąpił nieoczekiwany błąd",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
};
