export const prerender = false;

import type { APIRoute } from "astro";
import { jsonError, requireParentLearner } from "../../../lib/plan-access";
import { loadLessonPlan } from "../../../lib/plan-store";

export const GET: APIRoute = async ({ locals, url }) => {
  const access = await requireParentLearner(locals.supabase, locals.user?.id, locals.user?.email ?? null);
  if ("status" in access) return jsonError(access.message, access.status);

  try {
    const plan = await loadLessonPlan(locals.supabase, access.learnerId);
    return new Response(JSON.stringify({ success: true, month: url.searchParams.get("month"), plan }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return jsonError("Nie udało się wczytać planu lekcji.", 500);
  }
};
