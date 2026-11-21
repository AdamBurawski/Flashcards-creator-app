export const prerender = false;

import type { APIRoute } from "astro";
import { z } from "zod";
import { applyOperations, monthInstantRange } from "../../../lib/lesson-plan";
import { jsonError, requireParentLearner } from "../../../lib/plan-access";
import { executeEffects, loadLessonPlan } from "../../../lib/plan-store";

const placeSchema = z.object({
  curriculumItemId: z.string().uuid(),
  startsAt: z.string().min(1),
});

export const POST: APIRoute = async ({ request, locals }) => {
  const access = await requireParentLearner(locals.supabase, locals.user?.id, locals.user?.email ?? null);
  if ("status" in access) return jsonError(access.message, access.status);
  const parsed = placeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Wybierz pozycję i godzinę.", 400);

  const plan = await loadLessonPlan(locals.supabase, access.learnerId);
  const result = applyOperations(
    plan,
    [{ op: "place_block", curriculumItemId: parsed.data.curriculumItemId, startsAt: parsed.data.startsAt }],
    new Date()
  );
  if ("error" in result) return jsonError(result.error, 400);
  try {
    await executeEffects(locals.supabase, access.learnerId, result.effects);
  } catch {
    return jsonError("Nie udało się położyć zajęć na kalendarz.", 400);
  }
  return new Response(JSON.stringify({ success: true }), { status: 200 });
};

export const DELETE: APIRoute = async ({ locals, url }) => {
  const access = await requireParentLearner(locals.supabase, locals.user?.id, locals.user?.email ?? null);
  if ("status" in access) return jsonError(access.message, access.status);
  const month = url.searchParams.get("month") ?? "";
  const range = monthInstantRange(month);
  if (!range) return jsonError("Wybierz miesiąc do wyczyszczenia.", 400);

  const removed = await locals.supabase
    .from("schedule_blocks")
    .delete()
    .eq("learner_id", access.learnerId)
    .gte("starts_at", range.from)
    .lt("starts_at", range.until);
  if (removed.error) return jsonError("Nie udało się wyczyścić kalendarza.", 400);

  const rejected = await locals.supabase
    .from("plan_proposals")
    .update({ status: "rejected" })
    .eq("learner_id", access.learnerId)
    .eq("status", "pending")
    .eq("month", month);
  if (rejected.error) return jsonError("Miesiąc jest pusty, ale nie udało się odrzucić oczekującej propozycji.", 500);

  return new Response(JSON.stringify({ success: true }), { status: 200 });
};
