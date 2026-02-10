export const prerender = false;

import type { APIRoute } from "astro";
import { z } from "zod";

const registerSchema = z
  .object({
    email: z.string().email("Niepoprawny format adresu email"),
    password: z
      .string()
      .min(8, "Hasło musi zawierać co najmniej 8 znaków")
      .regex(/[A-Z]/, "Hasło musi zawierać co najmniej jedną wielką literę")
      .regex(/[0-9]/, "Hasło musi zawierać co najmniej jedną cyfrę"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Hasła nie są identyczne",
    path: ["confirmPassword"],
  });

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Walidacja danych wejściowych
    const body = await request.json();
    const result = registerSchema.safeParse(body);

    if (!result.success) {
      return new Response(
        JSON.stringify({
          success: false,
          errors: result.error.format(),
        }),
        { status: 400 }
      );
    }

    const { email, password } = result.data;

    // Rejestracja użytkownika w Supabase
    const { data, error } = await locals.supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      return new Response(
        JSON.stringify({
          success: false,
          message: error.message,
        }),
        { status: 400 }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: data.user,
      }),
      { status: 201 }
    );
  } catch (error) {
    console.error("Błąd podczas rejestracji:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "Wystąpił nieoczekiwany błąd",
      }),
      { status: 500 }
    );
  }
};
