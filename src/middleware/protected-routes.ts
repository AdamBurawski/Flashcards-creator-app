import type { MiddlewareHandler } from "astro";

// Lista chronionych tras
const protectedRoutes = [
  "/dashboard",
  "/subjects",
  "/widgets",
  "/settings",
  "/collections",
  "/collections/create",
  "/collections/edit",
  "/collections/delete",
  "/learn/collection",
  "/generate",
  "/english",
];

const administratorOnlyRoutes = ["/settings", "/widgets", "/generate", "/collections/create"];

// Trasy, które mogą być używane zarówno przez zalogowanych jak i niezalogowanych użytkowników
const _hybridRoutes = ["/flashcards"];

export const protectedRoutesMiddleware: MiddlewareHandler = async ({ locals, request, redirect }, next) => {
  // Sprawdzenie, czy trasa jest chroniona
  const url = new URL(request.url);
  const isProtectedRoute = protectedRoutes.some((route) => url.pathname.startsWith(route));

  // Jeśli trasa jest chroniona i użytkownik nie jest zalogowany, przekieruj na stronę logowania
  if (isProtectedRoute && !locals.user) {
    return redirect(`/auth/login?returnUrl=${encodeURIComponent(url.pathname)}`, 302);
  }

  const needsAdministrator = administratorOnlyRoutes.some((route) => url.pathname.startsWith(route));
  if (needsAdministrator && locals.user) {
    const { data: profile } = await locals.supabase
      .from("profiles")
      .select("role")
      .eq("user_id", locals.user.id)
      .maybeSingle();

    if (profile?.role === "user") {
      return redirect("/dashboard", 302);
    }
  }

  // Kontynuacja przetwarzania
  return next();
};
