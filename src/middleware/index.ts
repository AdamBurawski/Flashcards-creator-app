import { defineMiddleware } from 'astro:middleware';
import { authMiddleware } from './auth';

// Lista chronionych tras
const protectedRoutes = [
  "/collections", 
  "/collections/create", 
  "/collections/edit", 
  "/collections/delete",
  "/learn/collection",
  "/generate"
];

// Główne middleware aplikacji
export const onRequest = defineMiddleware(async (context, next) => {
  // Najpierw uruchom authMiddleware
  let response = await authMiddleware(context, async () => {
    // Po przetworzeniu middleware autentykacji, sprawdź chronione ścieżki
    const { pathname } = new URL(context.request.url);
    
    if (protectedRoutes.includes(pathname)) {
      // Sprawdź, czy użytkownik jest zalogowany
      if (!context.locals.user) {
        // Przekieruj do strony logowania jeśli użytkownik nie jest zalogowany
        return context.redirect(`/auth/login?returnUrl=${encodeURIComponent(pathname)}`);
      }
    }
    
    // Kontynuacja przetwarzania
    return await next();
  });

  return response;
}); 