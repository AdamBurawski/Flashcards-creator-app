import { useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import LogoutButton from "./LogoutButton";

interface AuthMenuProps {
  initialIsAuthenticated?: boolean;
}

export default function AuthMenu({ initialIsAuthenticated = false }: AuthMenuProps) {
  // Stan początkowy bazujący na przekazanej wartości z serwera
  const [mounted, setMounted] = useState(false);
  const { user, isLoading } = useAuth();

  // Po zamontowaniu komponentu używaj danych z hooka useAuth
  useEffect(() => {
    setMounted(true);
  }, []);

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
