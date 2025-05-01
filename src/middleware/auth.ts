import type { MiddlewareHandler } from "astro";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../db/database.types";

// Middleware do obsługi autentykacji
// W rzeczywistej implementacji będzie to wykorzystywać Supabase
export const authMiddleware: MiddlewareHandler = async ({ locals, request, cookies }, next) => {
  // Inicjalizacja klienta Supabase za każdym razem dla żądania
  const supabaseUrl = import.meta.env.SUPABASE_URL;
  const supabaseKey = import.meta.env.SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn("Brak kluczy Supabase w zmiennych środowiskowych - middleware używa pustych wartości");
  }

  // Pobierz token autoryzacyjny z nagłówka (jeśli istnieje)
  const authHeader = request.headers.get("Authorization");
  let accessToken = null;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    accessToken = authHeader.split(" ")[1];
    console.log("Znaleziono token autoryzacyjny w nagłówku!");
  }

  // Pobierz wszystkie ciasteczka z żądania dla lepszego debugowania
  const allCookies = request.headers.get("cookie") || "";
  console.log("Wszystkie ciasteczka w żądaniu:", allCookies);

  // Pobierz konkretne ciasteczka Supabase, które są kluczowe dla autentykacji
  const sbAuthCookie = cookies.get("sb-auth-token")?.value || null;
  const sbAccessToken = cookies.get("sb-access-token")?.value || null;
  const sbRefreshToken = cookies.get("sb-refresh-token")?.value || null;
  
  console.log("Ciasteczka Supabase:", {
    "sb-auth-token": sbAuthCookie ? "Istnieje" : "Brak",
    "sb-access-token": sbAccessToken ? "Istnieje" : "Brak", 
    "sb-refresh-token": sbRefreshToken ? "Istnieje" : "Brak"
  });

  // Stwórz klienta Supabase
  const supabaseClient = createClient<Database>(supabaseUrl || '', supabaseKey || '', {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        Cookie: allCookies,
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
      },
    },
  });

  // Zapisanie klienta Supabase w locals
  locals.supabase = supabaseClient;
  locals.user = null;  // Domyślnie brak użytkownika
  locals.session = null;

  try {
    // Sprawdź sesję tylko wtedy, gdy mamy jakiś token
    if (accessToken || sbAccessToken) {
      // 1. Jeśli mamy token z nagłówka, ustaw go bezpośrednio
      if (accessToken) {
        const { data: { user }, error } = await supabaseClient.auth.getUser(accessToken);
        if (!error && user) {
          console.log("Uwierzytelniono użytkownika z tokenu:", user.email);
          locals.user = user;
          return await next();
        }
      }

      // 2. Standardowa metoda - sprawdź sesję
      const { data: { session }, error } = await supabaseClient.auth.getSession();
      
      // Logowanie dla debugowania
      console.log("Session status in middleware:", session ? "Active" : "No session");
      if (session) {
        console.log("User email:", session.user.email);
        locals.session = session;
        locals.user = session.user;
      } else {
        console.log("Brak aktywnej sesji");
      }
    }
  } catch (error) {
    console.error("Błąd podczas uwierzytelniania:", error);
  }

  // Kontynuacja przetwarzania
  return await next();
}; 