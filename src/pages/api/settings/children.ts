export const prerender = false;

import type { APIRoute } from "astro";
import { z } from "zod";
import { loadSessionContext } from "../../../lib/household";
import { createServiceRoleClient } from "../../../lib/supabase-admin";

const emptyToNull = z.literal("").transform(() => null);

const createChildSchema = z.object({
  firstName: z.string().trim().min(1, "Imię jest wymagane").max(80),
  lastName: z.string().trim().min(1, "Nazwisko jest wymagane").max(80),
  email: z.string().trim().email("Niepoprawny email"),
  password: z
    .string()
    .min(8, "Hasło musi mieć co najmniej 8 znaków")
    .regex(/[A-Z]/, "Hasło musi zawierać wielką literę")
    .regex(/[0-9]/, "Hasło musi zawierać cyfrę"),
  birthDate: z.union([emptyToNull, z.string().date("Niepoprawna data urodzenia"), z.null()]).optional(),
  schoolGrade: z.union([emptyToNull, z.string().trim().max(40), z.null()]).optional(),
  parentNote: z.union([emptyToNull, z.string().trim().max(500), z.null()]).optional(),
});

function validationMessage(error: z.ZodError): string {
  const parts = Object.entries(error.flatten().fieldErrors).flatMap(([field, messages]) =>
    (messages ?? []).map((message) => `${field}: ${message}`)
  );
  return parts[0] ?? "Niepoprawne dane formularza.";
}

export const GET: APIRoute = async ({ locals }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ success: false, message: "Wymagane logowanie." }), { status: 401 });
  }

  const context = await loadSessionContext(locals.supabase, locals.user.id, locals.user.email ?? null);
  if (!context.isAdministrator) {
    return new Response(JSON.stringify({ success: false, message: "Brak uprawnień." }), { status: 403 });
  }

  return new Response(JSON.stringify({ success: true, children: context.children }), { status: 200 });
};

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ success: false, message: "Wymagane logowanie." }), { status: 401 });
  }

  const context = await loadSessionContext(locals.supabase, locals.user.id, locals.user.email ?? null);
  if (!context.isAdministrator) {
    return new Response(JSON.stringify({ success: false, message: "Tylko rodzic może dodać dziecko." }), {
      status: 403,
    });
  }

  const body = await request.json();
  const parsed = createChildSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({
        success: false,
        message: validationMessage(parsed.error),
        errors: parsed.error.format(),
      }),
      { status: 400 }
    );
  }

  let admin;
  try {
    admin = createServiceRoleClient();
  } catch {
    return new Response(
      JSON.stringify({
        success: false,
        message: "Serwer nie ma skonfigurowanego SUPABASE_SERVICE_ROLE_KEY.",
      }),
      { status: 500 }
    );
  }

  const { data: household, error: householdError } = await admin
    .from("households")
    .select("id")
    .eq("owner_id", locals.user.id)
    .maybeSingle();

  if (householdError || !household) {
    return new Response(
      JSON.stringify({
        success: false,
        message: householdError?.message ?? "Brak gospodarstwa rodzica. Odśwież stronę i spróbuj ponownie.",
      }),
      { status: 400 }
    );
  }

  const { firstName, lastName, email, password, birthDate, schoolGrade, parentNote } = parsed.data;

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      role: "user",
      first_name: firstName,
      last_name: lastName,
    },
  });

  if (createError || !created.user) {
    return new Response(
      JSON.stringify({ success: false, message: createError?.message ?? "Nie udało się utworzyć konta dziecka." }),
      { status: 400 }
    );
  }

  const childId = created.user.id;

  const { error: profileError } = await admin.from("profiles").upsert({
    user_id: childId,
    role: "user",
    first_name: firstName,
    last_name: lastName,
    birth_date: birthDate || null,
    school_grade: schoolGrade || null,
    parent_note: parentNote || null,
    active_child_id: null,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(childId);
    return new Response(JSON.stringify({ success: false, message: profileError.message }), { status: 400 });
  }

  await admin.from("household_members").delete().eq("user_id", childId);
  await admin.from("households").delete().eq("owner_id", childId);

  const { error: memberError } = await admin.from("household_members").insert({
    household_id: household.id,
    user_id: childId,
    member_role: "user",
  });

  if (memberError) {
    await admin.auth.admin.deleteUser(childId);
    return new Response(JSON.stringify({ success: false, message: memberError.message }), { status: 400 });
  }

  if (!context.activeChild) {
    const { error: activeError } = await admin
      .from("profiles")
      .update({ active_child_id: childId })
      .eq("user_id", locals.user.id);
    if (activeError) {
      return new Response(
        JSON.stringify({
          success: false,
          message: `Dziecko utworzone, ale nie ustawiono go jako aktywne: ${activeError.message}`,
        }),
        { status: 400 }
      );
    }
  }

  const next = await loadSessionContext(locals.supabase, locals.user.id, locals.user.email ?? null);
  return new Response(JSON.stringify({ success: true, context: next }), { status: 201 });
};
