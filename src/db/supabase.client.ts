import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// Zmienne środowiskowe dla Supabase
const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseKey = import.meta.env.SUPABASE_KEY;

// Default user ID for development purposes
export const DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000000";

// Klient Supabase do użycia w aplikacji
export const supabaseClient = createClient<Database>(supabaseUrl, supabaseKey);

// Eksport typu klienta Supabase
export type SupabaseClient = typeof supabaseClient;
