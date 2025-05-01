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

// Hook dostępu do danych autentykacji
export function useAuth(): AuthContext {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Sprawdź bieżącą sesję przy montowaniu komponentu
    const checkSession = async () => {
      setIsLoading(true);
      try {
        console.log("Sprawdzanie sesji...");
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          throw error;
        }

        console.log("Dane sesji:", data);
        if (data.session) {
          const { data: userData, error: userError } = await supabase.auth.getUser();
          
          if (userError) {
            throw userError;
          }
          
          setUser(userData.user);
          console.log("Zalogowano użytkownika:", userData.user);
        } else {
          setUser(null);
          console.log("Brak zalogowanego użytkownika");
        }
      } catch (e) {
        console.error("Błąd podczas sprawdzania sesji:", e);
        setError(e instanceof Error ? e.message : "Wystąpił nieznany błąd");
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    // Nasłuchuj zmian w stanie autentykacji
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Zmiana stanu autentykacji:", event, session);
        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          if (session) {
            setUser(session.user);
          }
        } else if (event === "SIGNED_OUT") {
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
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
      setUser(null);
      // Przekierowanie na stronę główną po wylogowaniu
      window.location.href = "/";
    } catch (e) {
      console.error("Błąd podczas wylogowywania:", e);
      setError(e instanceof Error ? e.message : "Wystąpił błąd podczas wylogowywania");
    } finally {
      setIsLoading(false);
    }
  };

  return { user, isLoading, error, logout };
} 