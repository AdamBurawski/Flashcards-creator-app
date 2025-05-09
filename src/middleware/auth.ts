import type { MiddlewareHandler } from "astro";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../db/database.types";

// Middleware do obsługi autentykacji
// W rzeczywistej implementacji będzie to wykorzystywać Supabase
export const authMiddleware: MiddlewareHandler = async ({ locals, request, cookies }, next) => {
  // Inicjalizacja klienta Supabase za każdym razem dla żądania
  // Próbujemy pobrać URL i klucz z różnych możliwych źródeł
  const supabaseUrl = 
    import.meta.env.PUBLIC_SUPABASE_URL || 
    import.meta.env.SUPABASE_URL || 
    process.env.PUBLIC_SUPABASE_URL || 
    process.env.SUPABASE_URL;
  
  const supabaseKey = 
    import.meta.env.PUBLIC_SUPABASE_KEY || 
    import.meta.env.SUPABASE_KEY || 
    process.env.PUBLIC_SUPABASE_KEY || 
    process.env.SUPABASE_KEY;

  // Sprawdzamy, czy mamy wymagane klucze Supabase
  if (!supabaseUrl || !supabaseKey) {
    console.warn("Brak kluczy Supabase w zmiennych środowiskowych - middleware używa pustych wartości");
    console.log("Dostępne zmienne środowiskowe:", Object.keys(process.env).filter(key => !key.includes('_SECRET')));
    
    // W przypadku braku kluczy, kontynuujemy bez Supabase
    // Ustawiamy puste wartości w locals i przechodzimy dalej
    locals.supabase = null;
    locals.user = null;
    locals.session = null;
    
    // Kontynuacja przetwarzania bez Supabase
    return await next();
  }

  // Pobierz token autoryzacyjny z nagłówka (jeśli istnieje)
  const authHeader = request.headers.get("Authorization");
  let accessToken = null;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    accessToken = authHeader.split(" ")[1];
    console.log("Znaleziono token autoryzacyjny w nagłówku!");
    // Zapisz token w locals do późniejszego użycia
    locals.token = accessToken;
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

  // Cookie sprawdzenie
  const supabaseCookie = cookies.get("supabase-auth-token")?.value;
  if (supabaseCookie) {
    console.log("Znaleziono ciasteczko supabase-auth-token!");
    // Używamy go jako token jeśli nie ma tokenu w nagłówku
    if (!accessToken) {
      accessToken = supabaseCookie;
      locals.token = accessToken;
    }
  }

  // Stwórz klienta Supabase
  const supabaseClient = createClient<Database>(supabaseUrl, supabaseKey, {
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
      console.log("Próbuję uwierzytelnić użytkownika z tokenem");
      
      // 1. Jeśli mamy token z nagłówka lub z ciasteczka, ustaw go bezpośrednio
      if (accessToken) {
        const { data: { user }, error } = await supabaseClient.auth.getUser(accessToken);
        if (!error && user) {
          console.log("Uwierzytelniono użytkownika z tokenu:", user.email);
          locals.user = user;
          return await next();
        } else if (error) {
          console.error("Błąd podczas uwierzytelniania z tokenem:", error.message);
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
        locals.token = session.access_token; // Zapisz token w locals
      } else {
        console.log("Brak aktywnej sesji");
      }
    } else {
      console.log("Brak tokenu lub ciasteczka sesji - użytkownik niezalogowany");
    }
  } catch (error) {
    console.error("Błąd podczas uwierzytelniania:", error);
  }

  // Kontynuacja przetwarzania
  return await next();
}; 