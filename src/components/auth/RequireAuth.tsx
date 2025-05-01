import { useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";

interface RequireAuthProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RequireAuth({ children, fallback }: RequireAuthProps) {
  const { user, isLoading } = useAuth();

  // Przekierowanie na stronę logowania, jeśli użytkownik nie jest zalogowany
  useEffect(() => {
    if (!isLoading && !user) {
      window.location.href = `/auth/login?returnUrl=${encodeURIComponent(window.location.pathname)}`;
    }
  }, [user, isLoading]);

  // Renderowanie dzieci tylko dla zalogowanego użytkownika
  if (isLoading) {
    return <div className="p-8 text-center">Ładowanie...</div>;
  }

  if (!user) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
}
