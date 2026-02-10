export const prerender = false;

import type { APIRoute } from "astro";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Niepoprawny format adresu email"),
  password: z.string().min(1, "Hasło jest wymagane"),
});

export const POST: APIRoute = async ({ request, locals, cookies: _cookies }) => {
  try {
    // Walidacja danych wejściowych
    const body = await request.json();
    const result = loginSchema.safeParse(body);

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

    // Logowanie użytkownika w Supabase
    const { data, error } = await locals.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Nieprawidłowy email lub hasło",
        }),
        { status: 401 }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: data.user,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Błąd podczas logowania:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "Wystąpił nieoczekiwany błąd",
      }),
      { status: 500 }
    );
  }
};
