export const prerender = false;

import type { APIRoute } from "astro";
import { z } from "zod";
import type { Json } from "../../../../db/supabase.types";
import { applyOperations, plannerOperationSchema } from "../../../../lib/lesson-plan";
import { jsonError, requireParentLearner } from "../../../../lib/plan-access";
import { dropPreviewBlock } from "../../../../lib/planner-skills";
import { executeEffects, loadLessonPlan } from "../../../../lib/plan-store";

const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("accept") }),
  z.object({ action: z.literal("reject") }),
  z.object({
    action: z.literal("remove"),
    startsAt: z.string().min(1),
    endsAt: z.string().min(1),
    kind: z.enum(["lesson", "break"]),
  }),
]);

export const POST: APIRoute = async ({ params, request, locals }) => {
  const access = await requireParentLearner(locals.supabase, locals.user?.id, locals.user?.email ?? null);
  if ("status" in access) return jsonError(access.message, access.status);
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !params.id) return jsonError("Wybierz zatwierdzenie albo odrzucenie.", 400);

  const { data: proposal } = await locals.supabase
    .from("plan_proposals")
    .select("*")
    .eq("id", params.id)
    .eq("learner_id", access.learnerId)
    .eq("status", "pending")
    .maybeSingle();
  if (!proposal) return jsonError("Ta propozycja nie czeka już na decyzję.", 404);

  if (parsed.data.action === "remove") {
    const operations = plannerOperationSchema.array().safeParse(proposal.operations);
    if (!operations.success) return jsonError("Propozycja jest uszkodzona.", 400);
    const plan = await loadLessonPlan(locals.supabase, access.learnerId);
    const dropped = dropPreviewBlock(
      plan,
      operations.data,
      { startsAt: parsed.data.startsAt, endsAt: parsed.data.endsAt, kind: parsed.data.kind },
      new Date()
    );
    if ("error" in dropped) return jsonError(dropped.error, 400);
    if ("empty" in dropped) {
      const { error } = await locals.supabase
        .from("plan_proposals")
        .update({ status: "rejected" })
        .eq("id", proposal.id);
      if (error) return jsonError("Nie udało się zdjąć zajęć.", 400);
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }
    const { error } = await locals.supabase
      .from("plan_proposals")
      .update({ operations: dropped.operations as unknown as Json })
      .eq("id", proposal.id);
    if (error) return jsonError("Nie udało się zdjąć zajęć.", 400);
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  }

  if (parsed.data.action === "reject") {
    const { error } = await locals.supabase.from("plan_proposals").update({ status: "rejected" }).eq("id", proposal.id);
    if (error) return jsonError("Nie udało się odrzucić propozycji.", 400);
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  }

  const operations = plannerOperationSchema.array().safeParse(proposal.operations);
  if (!operations.success) return jsonError("Propozycja jest uszkodzona.", 400);

  const plan = await loadLessonPlan(locals.supabase, access.learnerId);
  const applied = applyOperations(plan, operations.data, new Date());
  if ("error" in applied) return jsonError(applied.error, 400);

  try {
    await executeEffects(locals.supabase, access.learnerId, applied.effects);
    const { error } = await locals.supabase.from("plan_proposals").update({ status: "accepted" }).eq("id", proposal.id);
    if (error) return jsonError("Zmiany weszły, ale nie udało się zamknąć propozycji.", 500);
  } catch {
    return jsonError("Nie udało się zapisać zatwierdzonych zmian.", 400);
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
};
