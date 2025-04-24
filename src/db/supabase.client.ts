import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import type { SupabaseClient as OriginalSupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_KEY;

// Default user ID for development purposes
export const DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000000";

// Export typed client
export const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Export typed SupabaseClient
export type SupabaseClient = OriginalSupabaseClient<Database>;
