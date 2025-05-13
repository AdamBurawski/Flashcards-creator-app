import { useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import LogoutButton from "./LogoutButton";
import { supabase } from "../../db/supabase.client";

// Synchronizuj sesję z serwerem
const syncSessionWithServer = async () => {
  try {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      // console.log("Synchronizacja sesji z serwerem w AuthMenu...");
      const response = await fetch("/api/auth/sync-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ session: data.session }),
      });

      const responseData = await response.json();
      // console.log("Odpowiedź z synchronizacji w AuthMenu:", responseData);
      return responseData.success;
    }
    return false;
  } catch (error) {
    // console.error("Błąd podczas synchronizacji sesji w AuthMenu:", error);
    return false;
  }
};

interface AuthMenuProps {
  initialIsAuthenticated?: boolean;
}

export default function AuthMenu({ initialIsAuthenticated = false }: AuthMenuProps) {
  const [mounted, setMounted] = useState(false);
  const { user, isLoading } = useAuth();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || isLoading) {
    return <div className="h-10"></div>;
  }

  const isAuthenticated = !!user;

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
