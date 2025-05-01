import { useState, useEffect } from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";

// Interfejs dla kontekstu autentykacji
interface AuthContext {
  user: SupabaseUser | null;
  isLoading: boolean;
  error: string | null;
}

// Hook dostępu do danych autentykacji
export function useAuth(): AuthContext {
  const [authState, setAuthState] = useState<AuthContext>({
    user: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    // Pobranie danych użytkownika z API
    const fetchUser = async () => {
      try {
        const response = await fetch("/api/auth/me");
        const data = await response.json();

        if (data.success && data.user) {
          setAuthState({
            user: data.user,
            isLoading: false,
            error: null,
          });
        } else {
          setAuthState({
            user: null,
            isLoading: false,
            error: null,
          });
        }
      } catch (error) {
        console.error("Błąd podczas pobierania danych użytkownika:", error);
        setAuthState({
          user: null,
          isLoading: false,
          error: "Nie udało się pobrać danych użytkownika",
        });
      }
    };

    fetchUser();
  }, []);

  return authState;
} 