import { useEffect, useState } from "react";
import { supabase } from "../../db/supabase.client";
import { Button } from "../ui/button";

export default function AuthCheck() {
  const [status, setStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  // Funkcja do pobrania tokenu z Supabase
  const getToken = async () => {
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setToken(data.session.access_token);
        return data.session.access_token;
      }
      return null;
    } catch (error) {
      // console.error("Błąd podczas pobierania tokenu:", error);
      return null;
    }
  };

  // Funkcja do sprawdzenia statusu logowania
  const checkStatus = async () => {
    setIsLoading(true);
    try {
      // Pobierz token z Supabase
      const token = await getToken();

      // Wywołaj endpoint statusu z tokenem w nagłówku
      const response = await fetch("/api/auth/status", {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = await response.json();
      setStatus(data);
    } catch (error) {
      // console.error("Błąd podczas sprawdzania statusu:", error);
      setStatus({ error: "Wystąpił błąd podczas sprawdzania statusu" });
    } finally {
      setIsLoading(false);
    }
  };

  // Sprawdź status po załadowaniu strony
  useEffect(() => {
    checkStatus();
  }, []);

  return (
    <div className="p-6 max-w-lg mx-auto bg-white rounded-lg shadow-md mt-10">
      <h1 className="text-xl font-bold mb-4">Sprawdzanie statusu logowania</h1>

      <div className="mb-6">
        <Button onClick={checkStatus} disabled={isLoading}>
          {isLoading ? "Sprawdzanie..." : "Odśwież status"}
        </Button>
      </div>

      {/* {token && (
        <div className="mb-4">
          <h2 className="text-lg font-semibold mb-2">Token autoryzacyjny:</h2>
          <div className="bg-gray-100 p-2 rounded overflow-auto max-h-20 text-xs">{token}</div>
        </div>
      )} */}

      {status && (
        <div>
          <h2 className="text-lg font-semibold mb-2">Status logowania:</h2>
          <div className="bg-gray-100 p-4 rounded">
            <p>
              <strong>Zalogowany:</strong> {status.isLoggedIn ? "Tak" : "Nie"}
            </p>
            <p>
              <strong>Token w nagłówku:</strong> {status.hasToken ? "Tak" : "Nie"}
            </p>
            <p>
              <strong>Czas sprawdzenia:</strong> {status.timestamp}
            </p>

            {status.user && (
              <div className="mt-4">
                <h3 className="font-medium">Dane użytkownika:</h3>
                <p>
                  <strong>ID:</strong> {status.user.id}
                </p>
                <p>
                  <strong>Email:</strong> {status.user.email}
                </p>
                <p>
                  <strong>Ostatnie logowanie:</strong> {status.user.last_sign_in_at}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
