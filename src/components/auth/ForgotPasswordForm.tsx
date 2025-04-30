import { useState } from "react";
import { Button } from "../ui/button";

const ForgotPasswordForm = () => {
  const [email, setEmail] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const validateForm = () => {
    if (!email) {
      setFormError("Email jest wymagany");
      return false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setFormError("Niepoprawny format adresu email");
      return false;
    }

    setFormError(null);
    return true;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      // Komunikacja z API będzie zaimplementowana później
      console.log("Forgot password form submitted", { email });

      // Symulacja opóźnienia
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Ustawienie stanu potwierdzenia wysłania
      setIsSubmitted(true);
    } catch (error) {
      setFormError("Wystąpił błąd podczas wysyłania instrukcji resetowania hasła. Spróbuj ponownie później.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="text-center">
        <div className="mb-4 p-3 bg-green-50 border border-green-100 text-green-700 rounded">
          <p>
            Instrukcje resetowania hasła zostały wysłane na adres <strong>{email}</strong>.
          </p>
          <p className="mt-2">
            Sprawdź swoją skrzynkę odbiorczą i postępuj zgodnie z instrukcjami zawartymi w wiadomości.
          </p>
        </div>
        <a href="/auth/login" className="text-primary hover:text-primary-dark font-medium">
          Powrót do strony logowania
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {formError && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded text-sm" role="alert">
          {formError}
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Adres email
        </label>
        <div className="mt-1">
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary ${
              formError ? "border-red-300" : "border-gray-300"
            }`}
            aria-invalid={!!formError}
            aria-describedby={formError ? "email-error" : undefined}
          />
          {formError && (
            <p className="mt-1 text-sm text-red-600" id="email-error">
              {formError}
            </p>
          )}
        </div>
        <p className="mt-2 text-sm text-gray-500">
          Podaj adres email powiązany z Twoim kontem, a my wyślemy Ci link do resetowania hasła.
        </p>
      </div>

      <div>
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? "Wysyłanie..." : "Wyślij instrukcje resetowania"}
        </Button>
      </div>
    </form>
  );
};

export default ForgotPasswordForm;
