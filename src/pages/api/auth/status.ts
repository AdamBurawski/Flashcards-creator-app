export const prerender = false;

import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ locals, request }) => {
  // Pobierz token autoryzacyjny z nagłówka (jeśli istnieje)
  const authHeader = request.headers.get("Authorization");
  let tokenFromHeader = null;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    tokenFromHeader = authHeader.split(" ")[1];
  }

  // Sprawdź, czy użytkownik jest zalogowany
  const isLoggedIn = !!locals.user;
  
  console.log("[AUTH STATUS] Checking auth status...");
  console.log("[AUTH STATUS] User from locals:", locals.user?.email || "none");
  console.log("[AUTH STATUS] Token from header:", tokenFromHeader ? "exists" : "none");
  console.log("[AUTH STATUS] Session exists:", !!locals.session);
  
  return new Response(
    JSON.stringify({
      isLoggedIn,
      user: isLoggedIn ? {
        id: locals.user.id,
        email: locals.user.email,
        last_sign_in_at: locals.user.last_sign_in_at,
      } : null,
      hasToken: !!tokenFromHeader,
      timestamp: new Date().toISOString()
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json"
      }
    }
  );
}; 