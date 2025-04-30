import { useState } from "react";
import { Button } from "../ui/button";

interface LoginFormProps {
  returnUrl?: string;
}

const LoginForm = ({ returnUrl = "/" }: LoginFormProps) => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [formErrors, setFormErrors] = useState<{
    email?: string;
    password?: string;
    general?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    const errors: {
      email?: string;
      password?: string;
    } = {};

    if (!formData.email) {
      errors.email = "Email jest wymagany";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = "Niepoprawny format adresu email";
    }

    if (!formData.password) {
      errors.password = "Hasło jest wymagane";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setFormErrors({});

    try {
      // Komunikacja z API będzie zaimplementowana później
      console.log("Login form submitted", formData);

      // Symulacja opóźnienia
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Tymczasowe rozwiązanie - przekierowanie
      window.location.href = returnUrl;
    } catch (error) {
      setFormErrors({
        general: "Wystąpił błąd podczas logowania. Sprawdź dane logowania i spróbuj ponownie.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {formErrors.general && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded text-sm" role="alert">
          {formErrors.general}
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
            value={formData.email}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary ${
              formErrors.email ? "border-red-300" : "border-gray-300"
            }`}
            aria-invalid={!!formErrors.email}
            aria-describedby={formErrors.email ? "email-error" : undefined}
          />
          {formErrors.email && (
            <p className="mt-1 text-sm text-red-600" id="email-error">
              {formErrors.email}
            </p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Hasło
        </label>
        <div className="mt-1">
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={formData.password}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary ${
              formErrors.password ? "border-red-300" : "border-gray-300"
            }`}
            aria-invalid={!!formErrors.password}
            aria-describedby={formErrors.password ? "password-error" : undefined}
          />
          {formErrors.password && (
            <p className="mt-1 text-sm text-red-600" id="password-error">
              {formErrors.password}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <input
            id="remember-me"
            name="remember-me"
            type="checkbox"
            className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
          />
          <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
            Zapamiętaj mnie
          </label>
        </div>

        <div className="text-sm">
          <a href="/auth/forgot-password" className="font-medium text-primary hover:text-primary-dark">
            Zapomniałeś hasła?
          </a>
        </div>
      </div>

      <div>
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? "Logowanie..." : "Zaloguj się"}
        </Button>
      </div>
    </form>
  );
};

export default LoginForm;
