export const prerender = false;

import type { APIRoute } from "astro";
import { z } from "zod";
import { applyOperations } from "../../../../lib/lesson-plan";
import { jsonError, requireParentLearner } from "../../../../lib/plan-access";
import { executeEffects, loadLessonPlan } from "../../../../lib/plan-store";

const moveSchema = z.object({
  startsAt: z.string().min(1),
  endsAt: z.string().min(1),
});

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  const access = await requireParentLearner(locals.supabase, locals.user?.id, locals.user?.email ?? null);
  if ("status" in access) return jsonError(access.message, access.status);
  const parsed = moveSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !params.id) return jsonError("Podaj nowy termin.", 400);

  const plan = await loadLessonPlan(locals.supabase, access.learnerId);
  const result = applyOperations(
    plan,
    [{ op: "move_block", id: params.id, startsAt: parsed.data.startsAt, endsAt: parsed.data.endsAt }],
    new Date()
  );
  if ("error" in result) return jsonError(result.error, 400);
  try {
    await executeEffects(locals.supabase, access.learnerId, result.effects);
  } catch {
    return jsonError("Nie udało się przesunąć bloku.", 400);
  }
  return new Response(JSON.stringify({ success: true }), { status: 200 });
};

export const DELETE: APIRoute = async ({ params, locals }) => {
  const access = await requireParentLearner(locals.supabase, locals.user?.id, locals.user?.email ?? null);
  if ("status" in access) return jsonError(access.message, access.status);
  if (!params.id) return jsonError("Brak bloku.", 400);

  const plan = await loadLessonPlan(locals.supabase, access.learnerId);
  const result = applyOperations(plan, [{ op: "remove_block", id: params.id }], new Date());
  if ("error" in result) return jsonError(result.error, 400);
  try {
    await executeEffects(locals.supabase, access.learnerId, result.effects);
  } catch {
    return jsonError("Nie udało się zdjąć bloku.", 400);
  }
  return new Response(JSON.stringify({ success: true }), { status: 200 });
};
