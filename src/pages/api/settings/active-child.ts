export const prerender = false;

import type { APIRoute } from "astro";
import { z } from "zod";
import { loadSessionContext } from "../../../lib/household";

const schema = z.object({
  childId: z.string().uuid(),
});

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ success: false, message: "Wymagane logowanie." }), { status: 401 });
  }

  const context = await loadSessionContext(locals.supabase, locals.user.id, locals.user.email ?? null);
  if (!context.isAdministrator) {
    return new Response(JSON.stringify({ success: false, message: "Brak uprawnień." }), { status: 403 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ success: false, errors: parsed.error.format() }), { status: 400 });
  }

  if (!context.children.some((child) => child.userId === parsed.data.childId)) {
    return new Response(JSON.stringify({ success: false, message: "To dziecko nie należy do Twojego gospodarstwa." }), {
      status: 403,
    });
  }

  const { error } = await locals.supabase
    .from("profiles")
    .update({ active_child_id: parsed.data.childId })
    .eq("user_id", locals.user.id);

  if (error) {
    return new Response(JSON.stringify({ success: false, message: error.message }), { status: 400 });
  }

  const next = await loadSessionContext(locals.supabase, locals.user.id, locals.user.email ?? null);
  return new Response(JSON.stringify({ success: true, context: next }), { status: 200 });
};
