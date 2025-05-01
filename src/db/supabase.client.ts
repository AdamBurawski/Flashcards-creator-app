import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// Utworzenie klienta Supabase po stronie klienta
const url = import.meta.env.PUBLIC_SUPABASE_URL;
const key = import.meta.env.PUBLIC_SUPABASE_KEY;

if (!url || !key) {
  throw new Error("Brak kluczy Supabase w zmiennych środowiskowych");
}

export const supabase = createClient<Database>(url, key, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: "sb-auth-token",
    flowType: "pkce" // Użyj PKCE dla większego bezpieczeństwa
  }
});

// Default user ID for development purposes
export const DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000000";

// Eksport typu klienta Supabase
export type SupabaseClient = typeof supabase;
