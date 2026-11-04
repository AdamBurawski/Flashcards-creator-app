export const prerender = false;

import type { APIRoute } from "astro";
import { z } from "zod";
import { loadSessionContext } from "../../../../lib/household";
import { createServiceRoleClient } from "../../../../lib/supabase-admin";

const emptyToNull = z.literal("").transform(() => null);

const updateChildSchema = z.object({
  firstName: z.string().trim().min(1, "Imię jest wymagane").max(80),
  lastName: z.string().trim().min(1, "Nazwisko jest wymagane").max(80),
  birthDate: z.union([emptyToNull, z.string().date("Niepoprawna data urodzenia"), z.null()]).optional(),
  schoolGrade: z.union([emptyToNull, z.string().trim().max(40), z.null()]).optional(),
  parentNote: z.union([emptyToNull, z.string().trim().max(500), z.null()]).optional(),
  avatarUrl: z.union([emptyToNull, z.string().url(), z.null()]).optional(),
  email: z.string().trim().email("Niepoprawny email").optional().or(emptyToNull),
  password: z
    .string()
    .min(8, "Hasło musi mieć co najmniej 8 znaków")
    .regex(/[A-Z]/, "Hasło musi zawierać wielką literę")
    .regex(/[0-9]/, "Hasło musi zawierać cyfrę")
    .optional()
    .or(emptyToNull),
});

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ success: false, message: "Wymagane logowanie." }), { status: 401 });
  }

  const childId = params.id;
  if (!childId) {
    return new Response(JSON.stringify({ success: false, message: "Brak identyfikatora dziecka." }), { status: 400 });
  }

  const context = await loadSessionContext(locals.supabase, locals.user.id, locals.user.email ?? null);
  if (!context.isAdministrator) {
    return new Response(JSON.stringify({ success: false, message: "Brak uprawnień." }), { status: 403 });
  }

  if (!context.children.some((child) => child.userId === childId)) {
    return new Response(JSON.stringify({ success: false, message: "To dziecko nie należy do Twojego gospodarstwa." }), {
      status: 403,
    });
  }

  const body = await request.json();
  const parsed = updateChildSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ success: false, errors: parsed.error.format() }), { status: 400 });
  }

  const { firstName, lastName, birthDate, schoolGrade, parentNote, avatarUrl, email, password } = parsed.data;

  const { error: profileError } = await locals.supabase
    .from("profiles")
    .update({
      first_name: firstName,
      last_name: lastName,
      birth_date: birthDate || null,
      school_grade: schoolGrade || null,
      parent_note: parentNote || null,
      avatar_url: avatarUrl || null,
    })
    .eq("user_id", childId)
    .eq("role", "user");

  if (profileError) {
    return new Response(JSON.stringify({ success: false, message: profileError.message }), { status: 400 });
  }

  if (email || password) {
    let admin;
    try {
      admin = createServiceRoleClient();
    } catch {
      return new Response(
        JSON.stringify({ success: false, message: "Brak SUPABASE_SERVICE_ROLE_KEY do zmiany logowania." }),
        { status: 500 }
      );
    }

    const { error: authError } = await admin.auth.admin.updateUserById(childId, {
      ...(email ? { email } : {}),
      ...(password ? { password } : {}),
    });

    if (authError) {
      return new Response(JSON.stringify({ success: false, message: authError.message }), { status: 400 });
    }
  }

  const next = await loadSessionContext(locals.supabase, locals.user.id, locals.user.email ?? null);
  return new Response(JSON.stringify({ success: true, context: next }), { status: 200 });
};
