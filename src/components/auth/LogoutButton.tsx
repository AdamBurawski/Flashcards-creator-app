import { useState } from "react";
import { Button } from "../ui/button";

const LogoutButton = () => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);

      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (data.success) {
        window.location.href = "/";
      } else {
        console.error("Błąd podczas wylogowywania:", data.message);
      }
    } catch (error) {
      console.error("Błąd podczas wylogowywania:", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <Button variant="destructive" size="sm" onClick={handleLogout} disabled={isLoggingOut}>
      {isLoggingOut ? "Wylogowywanie..." : "Wyloguj"}
    </Button>
  );
};

export default LogoutButton;
