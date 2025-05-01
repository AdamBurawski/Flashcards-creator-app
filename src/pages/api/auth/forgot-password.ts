export const prerender = false;

import type { APIRoute } from "astro";
import { z } from "zod";

const forgotPasswordSchema = z.object({
  email: z.string().email("Niepoprawny format adresu email"),
});

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Walidacja danych wejściowych
    const body = await request.json();
    const result = forgotPasswordSchema.safeParse(body);

    if (!result.success) {
      return new Response(
        JSON.stringify({
          success: false,
          errors: result.error.format(),
        }),
        { status: 400 }
      );
    }

    const { email } = result.data;

    // Wysłanie emaila z linkiem do resetowania hasła
    const { error } = await locals.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${new URL(request.url).origin}/auth/reset-password`,
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

    // Zawsze zwracamy sukces, nawet jeśli email nie istnieje (ze względów bezpieczeństwa)
    return new Response(
      JSON.stringify({
        success: true,
        message: "Jeśli konto istnieje, instrukcje resetowania hasła zostaną wysłane na podany adres email",
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Błąd podczas żądania resetu hasła:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "Wystąpił nieoczekiwany błąd",
      }),
      { status: 500 }
    );
  }
}; 