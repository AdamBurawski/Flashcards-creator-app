export const prerender = false;

import type { APIRoute } from "astro";
import { z } from "zod";
import { loadSessionContext } from "../../../lib/household";

const metaSchema = z.object({
  targetUserId: z.string().uuid(),
});

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ success: false, message: "Wymagane logowanie." }), { status: 401 });
  }

  const context = await loadSessionContext(locals.supabase, locals.user.id, locals.user.email ?? null);
  if (!context.isAdministrator) {
    return new Response(JSON.stringify({ success: false, message: "Brak uprawnień." }), { status: 403 });
  }

  const form = await request.formData();
  const file = form.get("file");
  const targetUserId = String(form.get("targetUserId") ?? "");

  const parsed = metaSchema.safeParse({ targetUserId });
  if (!parsed.success || !(file instanceof File)) {
    return new Response(JSON.stringify({ success: false, message: "Niepoprawny plik lub odbiorca." }), {
      status: 400,
    });
  }

  const allowed =
    parsed.data.targetUserId === locals.user.id ||
    context.children.some((child) => child.userId === parsed.data.targetUserId);

  if (!allowed) {
    return new Response(JSON.stringify({ success: false, message: "Nie możesz zmienić tego zdjęcia." }), {
      status: 403,
    });
  }

  if (!file.type.startsWith("image/") || file.size > 2_000_000) {
    return new Response(JSON.stringify({ success: false, message: "Dozwolone są obrazy do 2 MB." }), {
      status: 400,
    });
  }

  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${parsed.data.targetUserId}/avatar-${Date.now()}.${extension}`;
  const buffer = new Uint8Array(await file.arrayBuffer());

  const { error: uploadError } = await locals.supabase.storage.from("avatars").upload(path, buffer, {
    contentType: file.type,
    upsert: true,
  });

  if (uploadError) {
    return new Response(JSON.stringify({ success: false, message: uploadError.message }), { status: 400 });
  }

  const { data } = locals.supabase.storage.from("avatars").getPublicUrl(path);
  const { error: profileError } = await locals.supabase
    .from("profiles")
    .update({ avatar_url: data.publicUrl })
    .eq("user_id", parsed.data.targetUserId);

  if (profileError) {
    return new Response(JSON.stringify({ success: false, message: profileError.message }), { status: 400 });
  }

  const next = await loadSessionContext(locals.supabase, locals.user.id, locals.user.email ?? null);
  return new Response(JSON.stringify({ success: true, avatarUrl: data.publicUrl, context: next }), { status: 200 });
};
