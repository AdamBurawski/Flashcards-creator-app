import type { MiddlewareHandler } from "astro";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../db/database.types";

// Middleware do obsługi autentykacji
// W rzeczywistej implementacji będzie to wykorzystywać Supabase
export const authMiddleware: MiddlewareHandler = async ({ locals, request, cookies }, next) => {
  // Inicjalizacja klienta Supabase za każdym razem dla żądania
  const supabaseUrl = import.meta.env.SUPABASE_URL;
  const supabaseKey = import.meta.env.SUPABASE_KEY;

  // Pobierz ciasteczka Supabase z żądania, aby przekazać je do klienta
  const supabaseClient = createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      // Konfiguracja ciasteczek
      storageKey: "sb-auth-token",
    },
    global: {
      headers: {
        Cookie: request.headers.get("cookie") || "",
      },
    },
  });

  // Zapisanie klienta Supabase w locals
  locals.supabase = supabaseClient;

  try {
    // Odczytanie sesji z ciasteczek
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    // Logowanie dla debugowania
    console.log("Session status in middleware:", session ? "Active" : "No session");
    if (session) {
      console.log("User email:", session.user.email);
    }
    
    // Ustawienie danych użytkownika i sesji w locals
    locals.session = session;
    locals.user = session?.user ?? null;
  } catch (error) {
    console.error("Błąd podczas uwierzytelniania:", error);
    
    // W przypadku błędu, ustawienie null dla użytkownika i sesji
    locals.session = null;
    locals.user = null;
  }

  // Kontynuacja przetwarzania
  return await next();
}; 