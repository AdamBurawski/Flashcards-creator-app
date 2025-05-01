export const prerender = false;

import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ locals }) => {
  try {
    // Odświeżenie sesji aby mieć najbardziej aktualne dane
    if (locals.supabase) {
      const { data: { session }, error } = await locals.supabase.auth.getSession();
      
      if (error) {
        console.error("Błąd podczas odświeżania sesji:", error);
        throw error;
      }
      
      // Aktualizacja danych sesji w locals
      if (session) {
        locals.session = session;
        locals.user = session.user;
      }
    }
    
    // Pobranie danych użytkownika z zaktualizowanej sesji
    const { user } = locals;

    if (!user) {
      return new Response(
        JSON.stringify({
          success: false,
          user: null,
        }),
        { 
          status: 200,
          headers: {
            'Content-Type': 'application/json'
          }
        }
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
          user_metadata: user.user_metadata,
          last_sign_in_at: user.last_sign_in_at
        },
      }),
      { 
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error) {
    console.error("Błąd podczas pobierania danych użytkownika:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "Wystąpił nieoczekiwany błąd",
      }),
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
}; 