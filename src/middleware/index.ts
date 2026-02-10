import { defineMiddleware } from 'astro:middleware';

// Lista chronionych tras
const protectedRoutes = [
  "/collections", 
  "/collections/create", 
  "/collections/edit", 
  "/collections/delete",
  "/learn/collection",
  "/generate",
  "/english"
];

// Główne middleware aplikacji
export const onRequest = defineMiddleware(async ({ locals, request, redirect }, next) => {
  // Sprawdź, czy ścieżka jest chroniona
  const url = new URL(request.url);
  const { pathname } = url;
  
  // Sprawdź dokładne dopasowanie lub dopasowanie ścieżki z parametrami
  const isProtected = protectedRoutes.some(route => 
    pathname === route || pathname.startsWith(`${route}/`)
  );
  
  // Jeśli jest chroniona i użytkownik nie jest zalogowany, przekieruj
  if (isProtected && !locals.user) {
    return redirect(`/auth/login?returnUrl=${encodeURIComponent(pathname)}`);
  }
  
  // Kontynuuj normalne przetwarzanie
  return await next();
}); 