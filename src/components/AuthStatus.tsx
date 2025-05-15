import { useState } from "react";
import { Button } from "./ui/button";
import { useAuth } from "../hooks/useAuth";

export default function AuthStatus() {
  const { user, isLoading, error } = useAuth();
  const [showDetails, setShowDetails] = useState(false);

  // Funkcja do sprawdzania stanu autentykacji
  const handleCheckStatus = () => {
    setShowDetails(!showDetails);
  };

  // Przygotuj zawartość szczegółów z góry, zamiast warunkowo renderować
  let detailsContent = <p>Ładowanie danych...</p>;

  if (!isLoading) {
    if (user) {
      detailsContent = (
        <div>
          {/* <p>
            <strong>ID użytkownika:</strong> {user.id}
          </p> */}
          <p>
            <strong>Email:</strong> {user.email}
          </p>
          <p>
            <strong>Data ostatniego logowania:</strong> {new Date(user.last_sign_in_at || "").toLocaleString()}
          </p>
          <p className="text-sm text-green-600 mt-2">✓ Sesja aktywna</p>
        </div>
      );
    } else {
      detailsContent = (
        <div>
          <p>Brak aktywnej sesji.</p>
          <p>
            <a href="/auth/login" className="text-blue-600 hover:underline">
              Przejdź do strony logowania
            </a>
          </p>
          {error && <p className="text-red-500 mt-2">Błąd: {error}</p>}
        </div>
      );
    }
  }

  return (
    <div className="mt-8 p-4 border rounded-lg bg-gray-50 max-w-lg mx-auto">
      <h2 className="text-lg font-semibold mb-4">Status autentykacji</h2>

      <div className="mb-4">
        <div className="flex items-center">
          <div
            className={`w-3 h-3 rounded-full mr-2 ${isLoading ? "bg-yellow-500" : user ? "bg-green-500" : "bg-red-500"}`}
          ></div>
          <p>{isLoading ? "Sprawdzanie stanu autentykacji..." : user ? "Zalogowany" : "Niezalogowany"}</p>
        </div>
      </div>

      <Button onClick={handleCheckStatus} size="sm" variant="outline" className="mb-4">
        {showDetails ? "Ukryj szczegóły" : "Pokaż szczegóły"}
      </Button>

      {showDetails && <div className="p-3 bg-white border rounded text-sm">{detailsContent}</div>}
    </div>
  );
}
