import { useState } from "react";
import { Button } from "../ui/button";

interface ResetPasswordFormProps {
  token?: string;
}

const ResetPasswordForm = ({ token }: ResetPasswordFormProps) => {
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });
  const [formErrors, setFormErrors] = useState<{
    password?: string;
    confirmPassword?: string;
    general?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const validateForm = () => {
    const errors: {
      password?: string;
      confirmPassword?: string;
      general?: string;
    } = {};

    // Walidacja tokena
    if (!token) {
      errors.general = "Nieprawidłowy lub wygasły token resetowania hasła";
      return false;
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
      // Komunikacja z API będzie zaimplementowana później
      // console.log("Reset password form submitted", { ...formData, token });

      // Symulacja opóźnienia
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Ustawienie stanu sukcesu
      setIsSuccess(true);
    } catch (error) {
      setFormErrors({
        general: "Wystąpił błąd podczas resetowania hasła. Spróbuj ponownie lub uzyskaj nowy link resetujący.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="text-center">
        <div className="mb-4 p-3 bg-green-50 border border-green-100 text-green-700 rounded">
          <p>Twoje hasło zostało pomyślnie zmienione.</p>
        </div>
        <a href="/auth/login" className="text-primary hover:text-primary-dark font-medium">
          Przejdź do strony logowania
        </a>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="text-center">
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded">
          <p>Nieprawidłowy lub wygasły link resetowania hasła.</p>
        </div>
        <a href="/auth/forgot-password" className="text-primary hover:text-primary-dark font-medium">
          Uzyskaj nowy link resetujący
        </a>
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
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Nowe hasło
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
          {isSubmitting ? "Resetowanie..." : "Resetuj hasło"}
        </Button>
      </div>
    </form>
  );
};

export default ResetPasswordForm;
