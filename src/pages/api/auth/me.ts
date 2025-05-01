export const prerender = false;

import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ locals }) => {
  try {
    // Pobranie danych użytkownika z sesji
    const { user } = locals;

    if (!user) {
      return new Response(
        JSON.stringify({
          success: false,
          user: null,
        }),
        { status: 200 }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: user.id,
          email: user.email || '',
          // Można dodać więcej pól użytkownika z Supabase
          role: user.role,
          app_metadata: user.app_metadata,
          user_metadata: user.user_metadata
        },
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Błąd podczas pobierania danych użytkownika:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "Wystąpił nieoczekiwany błąd",
      }),
      { status: 500 }
    );
  }
}; 