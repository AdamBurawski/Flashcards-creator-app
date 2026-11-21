export const prerender = false;

import type { APIRoute } from "astro";
import { z } from "zod";
import { jsonError, requireParentLearner } from "../../../lib/plan-access";
import { proposeFromAssistant } from "../../../lib/planner.service";

const bodySchema = z.object({
  text: z.string().trim().min(1).max(2000),
  month: z.string().regex(/^\d{4}-\d{2}$/),
});

export const POST: APIRoute = async ({ request, locals }) => {
  const access = await requireParentLearner(locals.supabase, locals.user?.id, locals.user?.email ?? null);
  if ("status" in access) return jsonError(access.message, access.status);
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Napisz, co asystent ma zmienić.", 400);

  try {
    const result = await proposeFromAssistant(locals.supabase, {
      learnerId: access.learnerId,
      authorUserId: access.session.viewer.userId,
      month: parsed.data.month,
      text: parsed.data.text,
      job: "chat",
    });
    if ("reply" in result) {
      return new Response(JSON.stringify({ success: true, reply: result.reply }), { status: 200 });
    }
    if ("error" in result) return jsonError(result.error, 400);
    return new Response(JSON.stringify({ success: true, proposalId: result.proposalId }), { status: 200 });
  } catch {
    return jsonError("Asystent nie odpowiedział.", 500);
  }
};

export const DELETE: APIRoute = async ({ locals }) => {
  const access = await requireParentLearner(locals.supabase, locals.user?.id, locals.user?.email ?? null);
  if ("status" in access) return jsonError(access.message, access.status);

  const rejected = await locals.supabase
    .from("plan_proposals")
    .update({ status: "rejected" })
    .eq("learner_id", access.learnerId)
    .eq("status", "pending");
  if (rejected.error) return jsonError("Nie udało się odrzucić oczekującej propozycji.", 400);

  const removed = await locals.supabase.from("planner_messages").delete().eq("learner_id", access.learnerId);
  if (removed.error) return jsonError("Nie udało się wyczyścić rozmowy.", 400);

  return new Response(JSON.stringify({ success: true }), { status: 200 });
};
