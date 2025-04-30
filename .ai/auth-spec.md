# Specyfikacja Architektury Modułu Autentykacji

## 1. Architektura Interfejsu Użytkownika

### 1.1. Struktura Stron i Komponentów

#### 1.1.1. Nowe Strony Astro

1. **Strona Logowania (`src/pages/auth/login.astro`)**

   - Statyczny formularz logowania zbudowany w Astro
   - Dynamiczny komponent React obsługujący logikę logowania
   - Integracja z Supabase Auth
   - Odnośniki do stron rejestracji i odzyskiwania hasła

2. **Strona Rejestracji (`src/pages/auth/register.astro`)**

   - Statyczny formularz rejestracji zbudowany w Astro
   - Dynamiczny komponent React obsługujący logikę rejestracji
   - Integracja z Supabase Auth
   - Odnośnik do strony logowania

3. **Strona Odzyskiwania Hasła (`src/pages/auth/forgot-password.astro`)**

   - Statyczny formularz odzyskiwania hasła zbudowany w Astro
   - Dynamiczny komponent React obsługujący logikę odzyskiwania hasła
   - Integracja z Supabase Auth
   - Odnośnik do strony logowania

4. **Strona Resetowania Hasła (`src/pages/auth/reset-password.astro`)**
   - Statyczny formularz resetowania hasła zbudowany w Astro
   - Obsługa parametrów URL (token resetowania)
   - Dynamiczny komponent React obsługujący logikę resetowania hasła
   - Integracja z Supabase Auth

#### 1.1.2. Modyfikacje Istniejących Komponentów

1. **Layout (`src/layouts/Layout.astro`)**

   - Dodanie dynamicznego nagłówka z przyciskami logowania/wylogowania w prawym górnym rogu
   - Warunkowe renderowanie elementów UI w zależności od stanu autentykacji

2. **Komponent Nagłówka (`src/components/Header.astro`)**
   - Nowy komponent zawierający logo, nawigację i przyciski logowania/wylogowania
   - Warunkowe renderowanie w zależności od stanu autentykacji

#### 1.1.3. Nowe Komponenty React

1. **Formularz Logowania (`src/components/auth/LoginForm.tsx`)**

   - Interaktywny formularz z walidacją
   - Obsługa błędów autentykacji
   - Przekierowanie po pomyślnym logowaniu

2. **Formularz Rejestracji (`src/components/auth/RegisterForm.tsx`)**

   - Interaktywny formularz z walidacją
   - Obsługa błędów rejestracji
   - Przekierowanie po pomyślnej rejestracji

3. **Formularz Odzyskiwania Hasła (`src/components/auth/ForgotPasswordForm.tsx`)**

   - Interaktywny formularz z walidacją
   - Obsługa błędów
   - Komunikaty potwierdzające wysłanie linku resetującego

4. **Formularz Resetowania Hasła (`src/components/auth/ResetPasswordForm.tsx`)**

   - Interaktywny formularz z walidacją
   - Obsługa błędów
   - Przekierowanie po pomyślnym zresetowaniu hasła

5. **Przycisk Wylogowania (`src/components/auth/LogoutButton.tsx`)**
   - Obsługa wylogowania
   - Przekierowanie po wylogowaniu

### 1.2. Przepływy Użytkownika

#### 1.2.1. Rejestracja

1. Użytkownik klika przycisk "Zarejestruj się" w nagłówku
2. Zostaje przekierowany na stronę `/auth/register`
3. Wypełnia formularz (email, hasło, potwierdzenie hasła)
4. Dane są walidowane po stronie klienta
5. Po zatwierdzeniu dane są wysyłane do Supabase Auth
6. W przypadku sukcesu użytkownik jest automatycznie logowany i przekierowywany na stronę główną
7. W przypadku błędu wyświetlany jest odpowiedni komunikat

#### 1.2.2. Logowanie

1. Użytkownik klika przycisk "Zaloguj się" w nagłówku
2. Zostaje przekierowany na stronę `/auth/login`
3. Wypełnia formularz (email, hasło)
4. Dane są walidowane po stronie klienta
5. Po zatwierdzeniu dane są wysyłane do Supabase Auth
6. W przypadku sukcesu użytkownik jest przekierowywany na stronę główną
7. W przypadku błędu wyświetlany jest ogólny komunikat o nieprawidłowych danych logowania

#### 1.2.3. Odzyskiwanie Hasła

1. Użytkownik klika link "Zapomniałem hasła" na stronie logowania
2. Zostaje przekierowany na stronę `/auth/forgot-password`
3. Podaje adres email
4. Po zatwierdzeniu formularz wysyła żądanie do Supabase Auth
5. Użytkownik otrzymuje potwierdzenie wysłania linku na podany adres email
6. Użytkownik klika link w emailu, który przekierowuje go na stronę `/auth/reset-password?token=[TOKEN]`
7. Podaje nowe hasło i jego potwierdzenie
8. Po zatwierdzeniu nowe hasło jest zapisywane w Supabase Auth
9. Użytkownik jest przekierowywany na stronę logowania

#### 1.2.4. Wylogowanie

1. Zalogowany użytkownik klika przycisk "Wyloguj" w nagłówku
2. Następuje wylogowanie z Supabase Auth
3. Sesja jest czyszczona
4. Użytkownik jest przekierowywany na stronę główną z potwierdzeniem wylogowania

### 1.3. Walidacja i Komunikaty Błędów

#### 1.3.1. Formularz Rejestracji

- Email: wymagane pole, poprawny format adresu email, unikalna wartość w systemie
- Hasło: wymagane pole, minimum 8 znaków, co najmniej jedna wielka litera, jedna cyfra
- Potwierdzenie hasła: identyczne z hasłem

#### 1.3.2. Formularz Logowania

- Email: wymagane pole, poprawny format adresu email
- Hasło: wymagane pole

#### 1.3.3. Formularz Odzyskiwania Hasła

- Email: wymagane pole, poprawny format adresu email

#### 1.3.4. Formularz Resetowania Hasła

- Nowe hasło: wymagane pole, minimum 8 znaków, co najmniej jedna wielka litera, jedna cyfra
- Potwierdzenie hasła: identyczne z nowym hasłem

#### 1.3.5. Komunikaty Błędów

- Ogólne błędy autentykacji: "Nieprawidłowy email lub hasło"
- Błędy rejestracji: "Użytkownik o podanym adresie email już istnieje"
- Błędy walidacji: "Hasło musi zawierać co najmniej 8 znaków, w tym jedną wielką literę i jedną cyfrę"
- Błędy odzyskiwania hasła: "Nie można zresetować hasła dla tego konta"
- Błędy resetowania hasła: "Link do resetowania hasła wygasł lub jest nieprawidłowy"

## 2. Logika Backendowa

### 2.1. Struktura Endpointów API

#### 2.1.1. Endpoint Rejestracji

```typescript
// src/pages/api/auth/register.ts
export const prerender = false;

import type { APIRoute } from "astro";
import { z } from "zod";

const registerSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/),
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
    return new Response(
      JSON.stringify({
        success: false,
        message: "Wystąpił nieoczekiwany błąd",
      }),
      { status: 500 }
    );
  }
};
```

#### 2.1.2. Endpoint Logowania

```typescript
// src/pages/api/auth/login.ts
export const prerender = false;

import type { APIRoute } from "astro";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const POST: APIRoute = async ({ request, locals, cookies }) => {
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
    return new Response(
      JSON.stringify({
        success: false,
        message: "Wystąpił nieoczekiwany błąd",
      }),
      { status: 500 }
    );
  }
};
```

#### 2.1.3. Endpoint Wylogowania

```typescript
// src/pages/api/auth/logout.ts
export const prerender = false;

import type { APIRoute } from "astro";

export const POST: APIRoute = async ({ locals }) => {
  try {
    // Wylogowanie użytkownika z Supabase
    const { error } = await locals.supabase.auth.signOut();

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
      }),
      { status: 200 }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        message: "Wystąpił nieoczekiwany błąd",
      }),
      { status: 500 }
    );
  }
};
```

#### 2.1.4. Endpoint Odzyskiwania Hasła

```typescript
// src/pages/api/auth/forgot-password.ts
export const prerender = false;

import type { APIRoute } from "astro";
import { z } from "zod";

const forgotPasswordSchema = z.object({
  email: z.string().email(),
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
    return new Response(
      JSON.stringify({
        success: false,
        message: "Wystąpił nieoczekiwany błąd",
      }),
      { status: 500 }
    );
  }
};
```

#### 2.1.5. Endpoint Resetowania Hasła

```typescript
// src/pages/api/auth/reset-password.ts
export const prerender = false;

import type { APIRoute } from "astro";
import { z } from "zod";

const resetPasswordSchema = z
  .object({
    password: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/),
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
    const result = resetPasswordSchema.safeParse(body);

    if (!result.success) {
      return new Response(
        JSON.stringify({
          success: false,
          errors: result.error.format(),
        }),
        { status: 400 }
      );
    }

    const { password } = result.data;

    // Aktualizacja hasła
    const { error } = await locals.supabase.auth.updateUser({
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
        message: "Hasło zostało pomyślnie zresetowane",
      }),
      { status: 200 }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        message: "Wystąpił nieoczekiwany błąd",
      }),
      { status: 500 }
    );
  }
};
```

### 2.2. Mechanizm Walidacji Danych

#### 2.2.1. Schemat Walidacji Zod

Wszystkie endpointy używają biblioteki Zod do walidacji danych wejściowych. Schematy walidacji są definiowane w plikach endpointów. Walidacja odbywa się przed wywołaniem operacji Supabase Auth, co pozwala na wczesne wyłapanie błędów i ochronę przed nadużyciami.

### 2.3. Obsługa Wyjątków

#### 2.3.1. Strategia Błędów

1. **Błędy walidacji**: status 400, szczegółowa informacja o błędach
2. **Błędy autentykacji**: status 401, ogólna informacja o nieprawidłowych danych
3. **Błędy autoryzacji**: status 403, informacja o braku uprawnień
4. **Błędy serwera**: status 500, ogólna informacja o nieoczekiwanym błędzie

#### 2.3.2. Format Odpowiedzi

```typescript
// Sukces
{
  success: true,
  [data]: any // opcjonalne dane, zależne od endpointu
}

// Błąd
{
  success: false,
  message: string, // ogólny komunikat błędu
  errors?: object // szczegółowe błędy walidacji (opcjonalne)
}
```

### 2.4. Aktualizacja Renderowania Server-side

#### 2.4.1. Middleware Autentykacji

```typescript
// src/middleware/auth.ts
import type { MiddlewareHandler } from "astro";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../db/database.types";

export const authMiddleware: MiddlewareHandler = async ({ locals, request }, next) => {
  // Inicjalizacja Supabase
  const supabaseUrl = import.meta.env.SUPABASE_URL;
  const supabaseKey = import.meta.env.SUPABASE_KEY;
  const supabase = createClient<Database>(supabaseUrl, supabaseKey);

  // Przekazanie klienta Supabase do locals
  locals.supabase = supabase;

  // Odczytanie sesji z ciasteczek
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Ustawienie danych użytkownika w locals
  locals.session = session;
  locals.user = session?.user ?? null;

  // Kontynuacja przetwarzania
  return next();
};
```

#### 2.4.2. Aktualizacja Pliku Middleware

```typescript
// src/middleware/index.ts
import { sequence } from "astro:middleware";
import { rateLimiter } from "./rate-limiter";
import { authMiddleware } from "./auth";

// Define middleware sequence
export const onRequest = sequence(
  rateLimiter,
  authMiddleware
  // Add more middleware here if needed
);
```

## 3. System Autentykacji

### 3.1. Inicjalizacja Supabase Auth

#### 3.1.1. Konfiguracja Supabase

```typescript
// src/lib/services/supabase.service.ts
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../db/database.types";

// Zmienne środowiskowe dla Supabase
const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseKey = import.meta.env.SUPABASE_KEY;

// Funkcja tworząca klienta Supabase
export const createSupabaseClient = () => {
  return createClient<Database>(supabaseUrl, supabaseKey);
};

// Typy dla Supabase Auth
export type User = NonNullable<Awaited<ReturnType<typeof createSupabaseClient>>["auth"]["getUser"]>["data"]["user"];
export type Session = NonNullable<
  Awaited<ReturnType<typeof createSupabaseClient>>["auth"]["getSession"]
>["data"]["session"];
```

#### 3.1.2. Rozszerzenie Typów Astro

```typescript
// src/env.d.ts
/// <reference types="astro/client" />

import type { SupabaseClient } from "./db/supabase.client";
import type { User, Session } from "./lib/services/supabase.service";

declare namespace App {
  interface Locals {
    supabase: SupabaseClient;
    user: User | null;
    session: Session | null;
  }
}
```

### 3.2. Ochrona Tras

#### 3.2.1. Middleware Ochrony Tras

```typescript
// src/middleware/protected-routes.ts
import type { MiddlewareHandler } from "astro";

// Lista chronionych tras
const protectedRoutes = ["/collections", "/collections/create", "/collections/edit", "/collections/delete"];

export const protectedRoutesMiddleware: MiddlewareHandler = async ({ locals, request, redirect }, next) => {
  // Sprawdzenie, czy trasa jest chroniona
  const url = new URL(request.url);
  const isProtectedRoute = protectedRoutes.some((route) => url.pathname.startsWith(route));

  // Jeśli trasa jest chroniona i użytkownik nie jest zalogowany, przekieruj na stronę logowania
  if (isProtectedRoute && !locals.user) {
    return redirect("/auth/login?returnUrl=" + encodeURIComponent(url.pathname), 302);
  }

  // Kontynuacja przetwarzania
  return next();
};
```

#### 3.2.2. Aktualizacja Pliku Middleware

```typescript
// src/middleware/index.ts
import { sequence } from "astro:middleware";
import { rateLimiter } from "./rate-limiter";
import { authMiddleware } from "./auth";
import { protectedRoutesMiddleware } from "./protected-routes";

// Define middleware sequence
export const onRequest = sequence(
  rateLimiter,
  authMiddleware,
  protectedRoutesMiddleware
  // Add more middleware here if needed
);
```

### 3.3. Kontekst Autentykacji w Komponentach React

#### 3.3.1. Hook React

```typescript
// src/hooks/useAuth.ts
import { useState, useEffect } from "react";

// Interfejs dla danych użytkownika
interface User {
  id: string;
  email: string;
}

// Interfejs dla kontekstu autentykacji
interface AuthContext {
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

// Hook dostępu do danych autentykacji
export function useAuth(): AuthContext {
  const [authState, setAuthState] = useState<AuthContext>({
    user: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    // Pobranie danych użytkownika z API
    const fetchUser = async () => {
      try {
        const response = await fetch("/api/auth/me");
        const data = await response.json();

        if (data.success && data.user) {
          setAuthState({
            user: data.user,
            isLoading: false,
            error: null,
          });
        } else {
          setAuthState({
            user: null,
            isLoading: false,
            error: null,
          });
        }
      } catch (error) {
        setAuthState({
          user: null,
          isLoading: false,
          error: "Nie udało się pobrać danych użytkownika",
        });
      }
    };

    fetchUser();
  }, []);

  return authState;
}
```

#### 3.3.2. Komponent Chroniony

```typescript
// src/components/auth/RequireAuth.tsx
import { useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';

interface RequireAuthProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RequireAuth({ children, fallback }: RequireAuthProps) {
  const { user, isLoading } = useAuth();

  // Przekierowanie na stronę logowania, jeśli użytkownik nie jest zalogowany
  useEffect(() => {
    if (!isLoading && !user) {
      window.location.href = `/auth/login?returnUrl=${encodeURIComponent(window.location.pathname)}`;
    }
  }, [user, isLoading]);

  // Renderowanie dzieci tylko dla zalogowanego użytkownika
  if (isLoading) {
    return <div>Ładowanie...</div>;
  }

  if (!user) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
}
```

### 3.4. Endpointy Pomocnicze

#### 3.4.1. Endpoint Danych Użytkownika

```typescript
// src/pages/api/auth/me.ts
export const prerender = false;

import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ locals }) => {
  try {
    // Pobranie danych użytkownika z sesji
    const { user } = locals;

    if (!user) {
      return new Response(
        JSON.stringify({
          success: false,
          user: null,
        }),
        { status: 200 }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: user.id,
          email: user.email,
        },
      }),
      { status: 200 }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        message: "Wystąpił nieoczekiwany błąd",
      }),
      { status: 500 }
    );
  }
};
```

### 3.5. Obsługa Autentykacji w Komponentach Astro

#### 3.5.1. Dostęp do Danych Użytkownika

```astro
---
// Przykład wykorzystania danych użytkownika w komponencie Astro
const { user } = Astro.locals;
const isAuthenticated = !!user;
---

<div>
  {isAuthenticated ? <p>Witaj, {user.email}!</p> : <p>Zaloguj się, aby uzyskać dostęp do pełnej funkcjonalności.</p>}
</div>
```

#### 3.5.2. Przekierowanie dla Chronionych Stron

```astro
---
// Przykład chronionej strony Astro
const { user } = Astro.locals;

// Przekierowanie na stronę logowania, jeśli użytkownik nie jest zalogowany
if (!user) {
  return Astro.redirect(`/auth/login?returnUrl=${encodeURIComponent(Astro.url.pathname)}`);
}
---

<div>
  <h1>Chroniona zawartość</h1>
  <p>Witaj, {user.email}! Ta strona jest dostępna tylko dla zalogowanych użytkowników.</p>
</div>
```

### 3.6. Integracja z Interfejsem Użytkownika

#### 3.6.1. Warunkowe Renderowanie Przycisków Logowania/Wylogowania

```astro
---
// Header.astro
const { user } = Astro.locals;
const isAuthenticated = !!user;
---

<header class="w-full p-4 bg-white shadow-sm">
  <div class="flex justify-between items-center">
    <a href="/" class="text-xl font-bold">Flashcards Creator</a>

    <nav class="flex gap-4 items-center">
      <a href="/" class="text-gray-700 hover:text-gray-900">Strona główna</a>
      <a href="/generate" class="text-gray-700 hover:text-gray-900">Generowanie</a>

      {
        isAuthenticated ? (
          <div class="flex items-center gap-2">
            <a href="/collections" class="text-gray-700 hover:text-gray-900">
              Kolekcje
            </a>
            <button id="logout-button" class="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700">
              Wyloguj
            </button>
          </div>
        ) : (
          <div class="flex gap-2">
            <a href="/auth/login" class="px-4 py-2 rounded bg-gray-200 text-gray-800 hover:bg-gray-300">
              Zaloguj
            </a>
            <a href="/auth/register" class="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">
              Zarejestruj
            </a>
          </div>
        )
      }
    </nav>
  </div>
</header>

<script>
  // JavaScript dla obsługi wylogowania
  document.getElementById("logout-button")?.addEventListener("click", async () => {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (data.success) {
        window.location.href = "/";
      }
    } catch (error) {
      console.error("Błąd podczas wylogowywania:", error);
    }
  });
</script>
```
