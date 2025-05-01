/// <reference types="astro/client" />

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./db/database.types";
import type { UserMetadata, Session as SupabaseSession, User as SupabaseUser } from "@supabase/supabase-js";

// Typy dla użytkownika i sesji
type User = SupabaseUser;

type Session = SupabaseSession;

declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient<Database>;
      user: User | null;
      session: Session | null;
    }
  }
}

interface ImportMetaEnv {
  readonly DATABASE_URL: string;
  readonly SUPABASE_URL: string;
  readonly SUPABASE_KEY: string;
  readonly PUBLIC_SUPABASE_URL: string;
  readonly PUBLIC_SUPABASE_ANON_KEY: string;
  readonly MODE: "development" | "production";
  readonly BASE_URL: string;
  readonly BYPASS_DATABASE?: string | boolean;
  readonly OPENROUTER_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Reprezentuje aktywny stan elementu UI
declare global {
  interface ActiveVariants {
    readonly value: string;
    readonly isInProgress: boolean;
    readonly isPrimary: boolean;
    readonly isSecondary: boolean;
    readonly isDestructive: boolean;
    readonly isOutline: boolean;
    readonly isGhost: boolean;
    readonly isLink: boolean;
  }
}
