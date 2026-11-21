export const prerender = false;

import type { APIRoute } from "astro";
import { z } from "zod";
import { jsonError, requireParentLearner } from "../../../lib/plan-access";
import { proposeFromAssistant, proposeMonthPlan } from "../../../lib/planner.service";

const bodySchema = z.object({
  job: z.enum(["month", "extras"]),
  month: z.string().regex(/^\d{4}-\d{2}$/),
});

export const POST: APIRoute = async ({ request, locals }) => {
  const access = await requireParentLearner(locals.supabase, locals.user?.id, locals.user?.email ?? null);
  if ("status" in access) return jsonError(access.message, access.status);
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Wybierz zadanie asystenta.", 400);

  try {
    const result =
      parsed.data.job === "month"
        ? await proposeMonthPlan(locals.supabase, {
            learnerId: access.learnerId,
            authorUserId: access.session.viewer.userId,
            month: parsed.data.month,
          })
        : await proposeFromAssistant(locals.supabase, {
            learnerId: access.learnerId,
            authorUserId: access.session.viewer.userId,
            month: parsed.data.month,
            text: "",
            job: "extras",
          });
    if ("reply" in result) {
      return new Response(JSON.stringify({ success: true, reply: result.reply }), { status: 200 });
    }
    if ("error" in result) return jsonError(result.error, 400);
    return new Response(JSON.stringify({ success: true, proposalId: result.proposalId }), { status: 200 });
  } catch {
    return jsonError("Nie udało się przygotować propozycji.", 500);
  }
};
