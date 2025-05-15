import { createClient } from "@supabase/supabase-js";
import type { Database } from "./supabase.types";

// Utworzenie klienta Supabase po stronie klienta
// Próbujemy pobrać URL i klucz z różnych możliwych źródeł
let url;
let key;

try {
  // Najpierw próbujemy import.meta.env (środowisko Astro)
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    url = import.meta.env.PUBLIC_SUPABASE_URL || import.meta.env.SUPABASE_URL;
    key = import.meta.env.PUBLIC_SUPABASE_KEY || import.meta.env.SUPABASE_KEY;
  }
  
  // Jeśli nadal nie mamy wartości, próbujemy process.env (środowisko Node.js)
  if ((!url || !key) && typeof process !== 'undefined' && process.env) {
    url = url || process.env.PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    key = key || process.env.PUBLIC_SUPABASE_KEY || process.env.SUPABASE_KEY;
  }
} catch (error) {
  console.error("Błąd podczas odczytywania zmiennych środowiskowych:", error);
}

// Ustawiamy wartości domyślne, jeśli nie znaleziono zmiennych środowiskowych
const fallbackUrl = 'https://placeholder-supabase-url.supabase.co';
const fallbackKey = 'placeholder-supabase-key';

// Jeśli brak kluczy, zwracaj komunikat
if (!url || !key) {
  console.warn("Brak kluczy Supabase w zmiennych środowiskowych - klient używa wartości domyślnych");
  try {
    if (typeof process !== 'undefined' && process.env) {
      console.log("Dostępne zmienne środowiskowe:", Object.keys(process.env).filter(key => !key.includes('_SECRET')));
    }
  } catch (error) {
    console.error("Nie można wyświetlić dostępnych zmiennych środowiskowych:", error);
  }
}

// Gdy brak właściwych kluczy, używamy wartości zastępczych, które pozwolą na inicjalizację klienta
export const supabase = createClient<Database>(url || fallbackUrl, key || fallbackKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    // Używamy localStorage, co ułatwia dostęp do sesji
    storage: {
      getItem: (key) => {
        try {
          // W środowisku SSR localStorage nie jest dostępny
          if (typeof window === 'undefined') return null;
          return window.localStorage.getItem(key);
        } catch (error) {
          console.error('Błąd podczas odczytu z localStorage:', error);
          return null;
        }
      },
      setItem: (key, value) => {
        try {
          if (typeof window === 'undefined') return;
          window.localStorage.setItem(key, value);
        } catch (error) {
          console.error('Błąd podczas zapisu do localStorage:', error);
        }
      },
      removeItem: (key) => {
        try {
          if (typeof window === 'undefined') return;
          window.localStorage.removeItem(key);
        } catch (error) {
          console.error('Błąd podczas usuwania z localStorage:', error);
        }
      }
    }
  }
});

// Default user ID for development purposes
export const DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000000";

// Eksport typu klienta Supabase
export type SupabaseClient = typeof supabase;