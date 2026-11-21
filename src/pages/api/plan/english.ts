export const prerender = false;

import type { APIRoute } from "astro";
import { jsonError, requireParentLearner } from "../../../lib/plan-access";
import { importUnfinishedEnglish } from "../../../lib/plan-store";

export const POST: APIRoute = async ({ locals }) => {
  const access = await requireParentLearner(locals.supabase, locals.user?.id, locals.user?.email ?? null);
  if ("status" in access) return jsonError(access.message, access.status);

  try {
    const placed = await importUnfinishedEnglish(locals.supabase, access.learnerId);
    return new Response(JSON.stringify({ success: true, placed }), { status: 200 });
  } catch {
    return jsonError("Nie udało się dodać lekcji English.", 400);
  }
};
