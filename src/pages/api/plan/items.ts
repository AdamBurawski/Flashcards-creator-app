export const prerender = false;

import type { APIRoute } from "astro";
import { z } from "zod";
import { jsonError, requireParentLearner } from "../../../lib/plan-access";

const itemSchema = z.object({
  kind: z.enum(["main", "extra"]),
  title: z.string().trim().min(1).max(160),
  subject: z.string().trim().min(1).max(80),
  durationMinutes: z.number().int().min(5).max(180).default(25),
  parentGuide: z.string().max(4000).default(""),
  status: z.enum(["proposed", "accepted"]).default("accepted"),
});

export const POST: APIRoute = async ({ request, locals }) => {
  const access = await requireParentLearner(locals.supabase, locals.user?.id, locals.user?.email ?? null);
  if ("status" in access) return jsonError(access.message, access.status);

  const parsed = itemSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Uzupełnij tytuł i przedmiot.", 400);

  const { error } = await locals.supabase.from("curriculum_items").insert({
    learner_id: access.learnerId,
    kind: parsed.data.kind,
    status: parsed.data.kind === "extra" ? parsed.data.status : "accepted",
    title: parsed.data.title,
    subject: parsed.data.subject,
    duration_minutes: parsed.data.durationMinutes,
    parent_guide: parsed.data.parentGuide,
  });
  if (error) return jsonError("Nie udało się dodać pozycji.", 400);
  return new Response(JSON.stringify({ success: true }), { status: 200 });
};
