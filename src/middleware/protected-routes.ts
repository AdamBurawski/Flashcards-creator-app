import type { MiddlewareHandler } from "astro";

// Lista chronionych tras
const protectedRoutes = [
  "/collections",
  "/collections/create",
  "/collections/edit",
  "/collections/delete",
  "/generate",
  "/english",
];

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

  // Kontynuacja przetwarzania
  return next();
};
