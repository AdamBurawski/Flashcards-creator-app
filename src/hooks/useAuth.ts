import { useEffect, useState } from "react";
import { supabase } from "../db/supabase.client";
import type { User } from "../types";

// Interfejs dla kontekstu autentykacji
interface AuthContext {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  logout: () => Promise<void>;
}

// Globalny token do użycia w nagłówkach fetch
let authToken: string | null = null;

// Sprawdzenie, czy kod jest wykonywany w przeglądarce
const isBrowser = typeof window !== 'undefined';

// Funkcja do modyfikacji fetch tylko po stronie klienta
if (isBrowser) {
  // Dodaj token do wszystkich żądań fetch (monkey patch)
  const originalFetch = window.fetch;
  window.fetch = function(input, init) {
    if (typeof input === 'string' && !input.includes('/api/auth/sync-session') && authToken) {
      init = init || {};
      init.headers = {
        ...init.headers,
        'Authorization': `Bearer ${authToken}`
      };
    }
    return originalFetch.call(this, input, init);
  };
}

// Synchronizuj sesję z serwerem
const syncSessionWithServer = async (session: any) => {
  if (!isBrowser) return false;

  try {
    // console.log("Synchronizacja sesji z serwerem...");
    
    if (!session) {
      // console.log("Brak sesji do synchronizacji");
      return false;
    }
    
    // Zapisz token do użycia w przyszłych żądaniach
    if (session.access_token) {
      authToken = session.access_token;
      // console.log("Ustawiono token autoryzacyjny dla przyszłych żądań");
    }
    
    const response = await fetch("/api/auth/sync-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ session }),
    });

    const data = await response.json();
    // console.log("Odpowiedź z synchronizacji:", data);
    return data.success;
  } catch (error) {
    // console.error("Błąd podczas synchronizacji sesji:", error);
    return false;
  }
};

// Hook dostępu do danych autentykacji
export function useAuth(): AuthContext {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Skip if not in browser
    if (!isBrowser) {
      setIsLoading(false);
      return;
    }

    // Sprawdź bieżącą sesję przy montowaniu komponentu
    const checkSession = async () => {
      setIsLoading(true);
      try {
        // console.log("Sprawdzanie sesji...");
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          throw error;
        }

        // console.log("Dane sesji:", data);
        if (data.session) {
          // Synchronizuj sesję z serwerem
          await syncSessionWithServer(data.session);
          
          const { data: userData, error: userError } = await supabase.auth.getUser();
          
          if (userError) {
            throw userError;
          }
          
          setUser(userData.user);
          // console.log("Zalogowano użytkownika:", userData.user);
        } else {
          setUser(null);
          // console.log("Brak zalogowanego użytkownika");
        }
      } catch (e) {
        // console.error("Błąd podczas sprawdzania sesji:", e);
        setError(e instanceof Error ? e.message : "Wystąpił nieznany błąd");
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    // Nasłuchuj zmian w stanie autentykacji
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // console.log("Zmiana stanu autentykacji:", event, session);
        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          if (session) {
            // Synchronizuj sesję z serwerem przy zalogowaniu lub odświeżeniu tokenu
            await syncSessionWithServer(session);
            setUser(session.user);
          }
        } else if (event === "SIGNED_OUT") {
          // Wyczyść token przy wylogowaniu
          authToken = null;
          setUser(null);
        }
        setIsLoading(false);
      }
    );

    // Sprawdź sesję od razu
    checkSession();

    // Sprzątanie po odmontowaniu
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  // Funkcja do wylogowania
  const logout = async () => {
    if (!isBrowser) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
      // Wyczyść token przy wylogowaniu
      authToken = null;
      setUser(null);
      // Przekierowanie na stronę główną po wylogowaniu
      window.location.href = "/";
    } catch (e) {
      // console.error("Błąd podczas wylogowywania:", e);
      setError(e instanceof Error ? e.message : "Wystąpił błąd podczas wylogowywania");
    } finally {
      setIsLoading(false);
    }
  };

  return { user, isLoading, error, logout };
} 