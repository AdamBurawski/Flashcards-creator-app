import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../db/supabase.types";
import { loadSessionContext, type SessionContext } from "./household";

type Client = SupabaseClient<Database>;

export async function requireParentLearner(
  supabase: Client,
  userId: string | undefined,
  email: string | null
): Promise<{ session: SessionContext; learnerId: string } | { status: number; message: string }> {
  if (!userId) return { status: 401, message: "Wymagane logowanie." };
  const session = await loadSessionContext(supabase, userId, email);
  if (!session.isAdministrator) return { status: 403, message: "Plan lekcji układa rodzic." };
  if (!session.activeChild) return { status: 400, message: "Najpierw dodaj konto dziecka." };
  return { session, learnerId: session.activeLearnerId };
}

export function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ success: false, message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
