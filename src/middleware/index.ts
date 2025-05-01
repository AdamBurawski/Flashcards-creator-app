import { defineMiddleware } from 'astro:middleware';
import { authMiddleware } from './auth';

// Ścieżki, które wymagają uwierzytelnienia
const PROTECTED_ROUTES = ['/collections', '/collections/'];

// Główne middleware aplikacji
export const onRequest = defineMiddleware(async (context, next) => {
  // Najpierw uruchom authMiddleware
  let response = await authMiddleware(context, async () => {
    // Po przetworzeniu middleware autentykacji, sprawdź chronione ścieżki
    const { pathname } = new URL(context.request.url);
    
    if (PROTECTED_ROUTES.includes(pathname)) {
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