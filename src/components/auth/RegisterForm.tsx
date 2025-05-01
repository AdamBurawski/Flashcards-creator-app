import { useState } from "react";
import { Button } from "../ui/button";
import { supabase } from "../../db/supabase.client";

interface RegisterFormProps {
  returnUrl?: string;
}

const RegisterForm = ({ returnUrl = "/" }: RegisterFormProps) => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [formErrors, setFormErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
    general?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const validateForm = () => {
    const errors: {
      email?: string;
      password?: string;
      confirmPassword?: string;
    } = {};

    // Walidacja email
    if (!formData.email) {
      errors.email = "Email jest wymagany";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = "Niepoprawny format adresu email";
    }

    // Walidacja hasła
    if (!formData.password) {
      errors.password = "Hasło jest wymagane";
    } else if (formData.password.length < 8) {
      errors.password = "Hasło musi zawierać co najmniej 8 znaków";
    } else if (!/[A-Z]/.test(formData.password)) {
      errors.password = "Hasło musi zawierać co najmniej jedną wielką literę";
    } else if (!/[0-9]/.test(formData.password)) {
      errors.password = "Hasło musi zawierać co najmniej jedną cyfrę";
    }

    // Walidacja potwierdzenia hasła
    if (!formData.confirmPassword) {
      errors.confirmPassword = "Potwierdzenie hasła jest wymagane";
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = "Hasła nie są identyczne";
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
      console.log("Próba rejestracji z danymi:", formData.email);

      // Użyj bezpośrednio Supabase do rejestracji
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (error) {
        console.error("Błąd rejestracji Supabase:", error);
        throw error;
      }

      console.log("Dane rejestracji:", data);

      if (data.user) {
        console.log("Zarejestrowano użytkownika:", data.user);
        setIsSuccess(true);
        // Przekierowanie po 2 sekundach
        setTimeout(() => {
          window.location.href = returnUrl;
        }, 2000);
      } else {
        setFormErrors({
          general: "Wystąpił błąd podczas rejestracji. Spróbuj ponownie.",
        });
      }
    } catch (error) {
      console.error("Błąd podczas rejestracji:", error);
      setFormErrors({
        general:
          error instanceof Error ? error.message : "Wystąpił błąd podczas rejestracji. Spróbuj ponownie później.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="p-3 bg-green-50 border border-green-200 text-green-600 rounded text-sm" role="alert">
        <div className="font-medium">Rejestracja przebiegła pomyślnie!</div>
        <p>Zostałeś automatycznie zalogowany. Za chwilę nastąpi przekierowanie...</p>
      </div>
    );
  }

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
            autoComplete="new-password"
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
        <p className="mt-1 text-xs text-gray-500">
          Hasło musi zawierać co najmniej 8 znaków, jedną wielką literę i jedną cyfrę.
        </p>
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
          Potwierdzenie hasła
        </label>
        <div className="mt-1">
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            value={formData.confirmPassword}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary ${
              formErrors.confirmPassword ? "border-red-300" : "border-gray-300"
            }`}
            aria-invalid={!!formErrors.confirmPassword}
            aria-describedby={formErrors.confirmPassword ? "confirm-password-error" : undefined}
          />
          {formErrors.confirmPassword && (
            <p className="mt-1 text-sm text-red-600" id="confirm-password-error">
              {formErrors.confirmPassword}
            </p>
          )}
        </div>
      </div>

      <div>
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? "Rejestracja..." : "Zarejestruj się"}
        </Button>
      </div>
    </form>
  );
};

export default RegisterForm;
