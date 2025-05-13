import { useState, useEffect } from "react";
import LogoutButton from "./auth/LogoutButton";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../db/supabase.client";

interface AuthMenuProps {
  initialIsAuthenticated?: boolean;
}

// Synchronizuj sesję z serwerem
const syncSessionWithServer = async () => {
  try {
    // console.log("Synchronizacja sesji z menu...");
    const session = (await supabase.auth.getSession()).data.session;

    if (!session) {
      // console.log("Brak sesji do synchronizacji");
      return false;
    }

    const response = await fetch("/api/auth/sync-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
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

export default function AuthMenu({ initialIsAuthenticated = false }: AuthMenuProps) {
  // Stan początkowy bazujący na przekazanej wartości z serwera
  const [mounted, setMounted] = useState(false);
  const { user, isLoading } = useAuth();

  // Po zamontowaniu komponentu używaj danych z hooka useAuth
  useEffect(() => {
    setMounted(true);

    // Synchronizuj sesję z serwerem przy załadowaniu komponentu
    if (initialIsAuthenticated || user) {
      syncSessionWithServer();
    }
  }, [initialIsAuthenticated, user]);

  // Dopóki komponent nie jest zamontowany, używaj stanu z serwera
  const isAuthenticated = mounted ? !!user : initialIsAuthenticated;

  // Wyświetl pusty div podczas ładowania, aby zapobiec "przeskakiwaniu" interfejsu
  if (mounted && isLoading) {
    return <div className="h-10"></div>;
  }

  return (
    <>
      {isAuthenticated ? (
        <div className="flex items-center gap-2">
          <a href="/collections" className="text-gray-700 hover:text-gray-900">
            Kolekcje
          </a>
          <LogoutButton />
        </div>
      ) : (
        <div className="flex gap-2">
          <a href="/auth/login" className="px-4 py-2 rounded bg-gray-200 text-gray-800 hover:bg-gray-300">
            Zaloguj
          </a>
          <a href="/auth/register" className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">
            Zarejestruj
          </a>
        </div>
      )}
    </>
  );
}
