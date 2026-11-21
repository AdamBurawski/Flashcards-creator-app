export const prerender = false;

import type { APIRoute } from "astro";
import { z } from "zod";
import { jsonError, requireParentLearner } from "../../../../lib/plan-access";

const patchSchema = z.object({
  title: z.string().trim().min(1).max(160),
  subject: z.string().trim().min(1).max(80),
  durationMinutes: z.number().int().min(5).max(180),
  parentGuide: z.string().max(4000),
  status: z.enum(["proposed", "accepted"]),
});

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  const access = await requireParentLearner(locals.supabase, locals.user?.id, locals.user?.email ?? null);
  if ("status" in access) return jsonError(access.message, access.status);
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !params.id) return jsonError("Niepoprawna pozycja.", 400);

  const { error } = await locals.supabase
    .from("curriculum_items")
    .update({
      title: parsed.data.title,
      subject: parsed.data.subject,
      duration_minutes: parsed.data.durationMinutes,
      parent_guide: parsed.data.parentGuide,
      status: parsed.data.status,
    })
    .eq("id", params.id)
    .eq("learner_id", access.learnerId);
  if (error) return jsonError("Nie udało się zapisać pozycji.", 400);
  return new Response(JSON.stringify({ success: true }), { status: 200 });
};

export const DELETE: APIRoute = async ({ params, locals }) => {
  const access = await requireParentLearner(locals.supabase, locals.user?.id, locals.user?.email ?? null);
  if ("status" in access) return jsonError(access.message, access.status);
  if (!params.id) return jsonError("Brak pozycji.", 400);

  const { error } = await locals.supabase
    .from("curriculum_items")
    .delete()
    .eq("id", params.id)
    .eq("learner_id", access.learnerId);
  if (error) return jsonError("Nie udało się usunąć pozycji.", 400);
  return new Response(JSON.stringify({ success: true }), { status: 200 });
};
