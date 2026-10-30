import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../db/supabase.types";

export type AppRole = "administrator" | "user";

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export interface DisplayPerson {
  userId: string;
  firstName: string;
  lastName: string;
  displayName: string;
  avatarUrl: string | null;
  birthDate: string | null;
  ageLabel: string | null;
  email: string | null;
  role: AppRole;
  schoolGrade: string | null;
  parentNote: string | null;
  phone: string | null;
  locale: string | null;
  timezone: string | null;
}

export function profileDisplayName(profile: Pick<ProfileRow, "first_name" | "last_name" | "display_name">): string {
  if (profile.display_name?.trim()) return profile.display_name.trim();
  const parts = [profile.first_name, profile.last_name].filter(Boolean);
  if (parts.length > 0) return parts.join(" ");
  return "Bez imienia";
}

export function ageFromBirthDate(birthDate: string | null | undefined, now = new Date()): string | null {
  if (!birthDate) return null;
  const birth = new Date(`${birthDate}T12:00:00`);
  if (Number.isNaN(birth.getTime())) return null;
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) age -= 1;
  if (age < 0 || age > 120) return null;
  return `${age} ${age === 1 ? "rok" : age >= 2 && age <= 4 ? "lata" : "lat"}`;
}

export function avatarLetter(name: string): string {
  const trimmed = name.trim();
  return trimmed ? trimmed.charAt(0).toLocaleUpperCase("pl-PL") : "?";
}

function toDisplayPerson(profile: ProfileRow, email: string | null = null): DisplayPerson {
  const displayName = profileDisplayName(profile);
  return {
    userId: profile.user_id,
    firstName: profile.first_name ?? "",
    lastName: profile.last_name ?? "",
    displayName,
    avatarUrl: profile.avatar_url,
    birthDate: profile.birth_date,
    ageLabel: ageFromBirthDate(profile.birth_date),
    email,
    role: profile.role,
    schoolGrade: profile.school_grade,
    parentNote: profile.parent_note,
    phone: profile.phone,
    locale: profile.locale,
    timezone: profile.timezone,
  };
}

export async function ensureAdministratorBootstrap(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<ProfileRow> {
  const { data: existing } = await supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle();
  if (existing) return existing;

  const { data: created, error } = await supabase
    .from("profiles")
    .insert({ user_id: userId, role: "administrator" })
    .select("*")
    .single();
  if (error || !created) throw error ?? new Error("Nie udało się utworzyć profilu.");

  const { data: household } = await supabase.from("households").select("id").eq("owner_id", userId).maybeSingle();
  let householdId = household?.id;
  if (!householdId) {
    const { data: createdHousehold, error: householdError } = await supabase
      .from("households")
      .insert({ owner_id: userId })
      .select("id")
      .single();
    if (householdError || !createdHousehold) throw householdError ?? new Error("Nie udało się utworzyć gospodarstwa.");
    householdId = createdHousehold.id;
  }

  await supabase.from("household_members").upsert(
    {
      household_id: householdId,
      user_id: userId,
      member_role: "administrator",
    },
    { onConflict: "user_id" }
  );

  return created;
}

export async function getProfile(supabase: SupabaseClient<Database>, userId: string): Promise<ProfileRow | null> {
  const { data } = await supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle();
  return data;
}

export async function listChildren(supabase: SupabaseClient<Database>, parentId: string): Promise<DisplayPerson[]> {
  const { data: membership } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", parentId)
    .eq("member_role", "administrator")
    .maybeSingle();

  if (!membership) return [];

  const { data: members } = await supabase
    .from("household_members")
    .select("user_id")
    .eq("household_id", membership.household_id)
    .eq("member_role", "user");

  const childIds = (members ?? []).map((member) => member.user_id);
  if (childIds.length === 0) return [];

  const { data: profiles } = await supabase.from("profiles").select("*").in("user_id", childIds);
  return (profiles ?? []).map((profile) => toDisplayPerson(profile));
}

export interface SessionContext {
  role: AppRole;
  isAdministrator: boolean;
  viewer: DisplayPerson;
  activeLearnerId: string;
  activeChild: DisplayPerson | null;
  children: DisplayPerson[];
}

async function ensureHouseholdForAdministrator(supabase: SupabaseClient<Database>, userId: string): Promise<void> {
  const { data: household } = await supabase.from("households").select("id").eq("owner_id", userId).maybeSingle();
  let householdId = household?.id;
  if (!householdId) {
    const { data: created, error } = await supabase
      .from("households")
      .insert({ owner_id: userId })
      .select("id")
      .single();
    if (error || !created) throw error ?? new Error("Nie udało się utworzyć gospodarstwa.");
    householdId = created.id;
  }

  await supabase.from("household_members").upsert(
    {
      household_id: householdId,
      user_id: userId,
      member_role: "administrator",
    },
    { onConflict: "user_id" }
  );
}

export async function loadSessionContext(
  supabase: SupabaseClient<Database>,
  userId: string,
  email: string | null
): Promise<SessionContext> {
  let profile = await getProfile(supabase, userId);
  if (!profile) {
    profile = await ensureAdministratorBootstrap(supabase, userId);
  }

  const viewer = toDisplayPerson(profile, email);

  if (profile.role === "user") {
    return {
      role: "user",
      isAdministrator: false,
      viewer,
      activeLearnerId: userId,
      activeChild: viewer,
      children: [],
    };
  }

  await ensureHouseholdForAdministrator(supabase, userId);

  const children = await listChildren(supabase, userId);
  const active = children.find((child) => child.userId === profile.active_child_id) ?? children[0] ?? null;

  if (active && profile.active_child_id !== active.userId) {
    await supabase.from("profiles").update({ active_child_id: active.userId }).eq("user_id", userId);
  }

  return {
    role: "administrator",
    isAdministrator: true,
    viewer,
    activeLearnerId: active?.userId ?? userId,
    activeChild: active,
    children,
  };
}

export function navItemsForRole(role: AppRole) {
  const all = [
    { label: "Strona główna", icon: "🏠", href: "/dashboard" },
    { label: "Kalendarz", icon: "🗓️", href: "/dashboard#weekly-plan" },
    { label: "Przedmioty", icon: "📚", href: "/subjects" },
    { label: "Postępy", icon: "📊", href: "/dashboard#overall-progress" },
    { label: "Zadania", icon: "✅", href: "/dashboard#now-todo" },
    { label: "Materiały", icon: "🗂️", href: "/dashboard#materialy" },
    { label: "Biblioteka widgetów", icon: "💡", href: "/widgets", adminOnly: true },
    { label: "Ustawienia", icon: "⚙️", href: "/settings", adminOnly: true },
  ] as const;

  return all
    .filter((item) => role === "administrator" || !("adminOnly" in item && item.adminOnly))
    .map(({ label, icon, href }) => ({ label, icon, href }));
}
