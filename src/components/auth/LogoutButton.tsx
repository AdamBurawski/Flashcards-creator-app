import { useState } from "react";
import { Button } from "../ui/button";
import { useAuth } from "../../hooks/useAuth";

const LogoutButton = () => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
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
