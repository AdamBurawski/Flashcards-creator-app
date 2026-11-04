export const prerender = false;

import type { APIRoute } from "astro";
import { z } from "zod";
import { loadSessionContext } from "../../../lib/household";

const profileSchema = z.object({
  firstName: z.string().trim().min(1, "Imię jest wymagane").max(80),
  lastName: z.string().trim().min(1, "Nazwisko jest wymagane").max(80),
  displayName: z.string().trim().max(80).optional().nullable(),
  phone: z.string().trim().max(40).optional().nullable(),
  locale: z.string().trim().max(16).optional().nullable(),
  timezone: z.string().trim().max(64).optional().nullable(),
  avatarUrl: z.string().url().optional().nullable().or(z.literal("")),
});

export const GET: APIRoute = async ({ locals }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ success: false, message: "Wymagane logowanie." }), { status: 401 });
  }

  try {
    const context = await loadSessionContext(locals.supabase, locals.user.id, locals.user.email ?? null);
    return new Response(JSON.stringify({ success: true, context }), { status: 200 });
  } catch {
    return new Response(JSON.stringify({ success: false, message: "Nie udało się wczytać profilu." }), {
      status: 500,
    });
  }
};

export const PATCH: APIRoute = async ({ request, locals }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ success: false, message: "Wymagane logowanie." }), { status: 401 });
  }

  const body = await request.json();
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ success: false, errors: parsed.error.format() }), { status: 400 });
  }

  const context = await loadSessionContext(locals.supabase, locals.user.id, locals.user.email ?? null);
  if (!context.isAdministrator) {
    return new Response(JSON.stringify({ success: false, message: "Tylko rodzic może edytować ten profil." }), {
      status: 403,
    });
  }

  const { firstName, lastName, displayName, phone, locale, timezone, avatarUrl } = parsed.data;
  const { error } = await locals.supabase
    .from("profiles")
    .update({
      first_name: firstName,
      last_name: lastName,
      display_name: displayName || null,
      phone: phone || null,
      locale: locale || "pl",
      timezone: timezone || "Europe/Warsaw",
      avatar_url: avatarUrl || null,
    })
    .eq("user_id", locals.user.id);

  if (error) {
    return new Response(JSON.stringify({ success: false, message: error.message }), { status: 400 });
  }

  const next = await loadSessionContext(locals.supabase, locals.user.id, locals.user.email ?? null);
  return new Response(JSON.stringify({ success: true, context: next }), { status: 200 });
};
