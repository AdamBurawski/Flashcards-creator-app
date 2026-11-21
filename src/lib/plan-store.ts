import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "../db/supabase.types";
import {
  EARLY_GRADE_SUBJECTS,
  STARTER_EXTRAS,
  subjectKey,
  lessonCalendarTitle,
  plannerOperationSchema,
  type CurriculumItem,
  type ModuleLesson,
  type PlanEffect,
  type PlannerOperation,
  type ScheduleBlock,
} from "./lesson-plan";

type Client = SupabaseClient<Database>;

export interface PlannerMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  proposalId: string | null;
  createdAt: string;
}

export interface StoredProposal {
  id: string;
  summary: string;
  operations: PlannerOperation[];
  month: string | null;
}

export interface LessonPlanSnapshot {
  items: CurriculumItem[];
  blocks: ScheduleBlock[];
  messages: PlannerMessage[];
  proposal: StoredProposal | null;
  locality: string | null;
}

function mapItem(row: Database["public"]["Tables"]["curriculum_items"]["Row"]): CurriculumItem {
  return {
    id: row.id,
    kind: row.kind,
    status: row.status,
    title: row.title,
    subject: row.subject,
    durationMinutes: row.duration_minutes,
    parentGuide: row.parent_guide,
    sourceId: row.source_id,
    href: row.href,
    moduleKey: row.module_key,
  };
}

function mapBlock(row: Database["public"]["Tables"]["schedule_blocks"]["Row"]): ScheduleBlock {
  return {
    id: row.id,
    curriculumItemId: row.curriculum_item_id,
    kind: row.kind,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    title: row.title,
    href: row.href,
    sourceId: row.source_id,
  };
}

function isEnglishLessonRow(row: Database["public"]["Tables"]["curriculum_items"]["Row"]): boolean {
  return Boolean(row.source_id) && (row.subject === "English" || (row.href ?? "").includes("/english/"));
}

export async function foldEnglishLessons(supabase: Client, learnerId: string): Promise<void> {
  const { data: rows } = await supabase.from("curriculum_items").select("*").eq("learner_id", learnerId);
  const lessonRows = (rows ?? []).filter(isEnglishLessonRow);
  if (lessonRows.length === 0) return;

  let moduleRow = (rows ?? []).find(
    (row) => row.module_key === "english" || (row.title === "English" && !row.source_id)
  );
  if (!moduleRow) {
    const created = await supabase
      .from("curriculum_items")
      .insert({
        learner_id: learnerId,
        kind: "main",
        status: "accepted",
        title: "English",
        subject: "English",
        duration_minutes: 25,
        parent_guide: "",
        module_key: "english",
      })
      .select("*")
      .single();
    if (created.error || !created.data) throw created.error ?? new Error("Nie udało się dodać przedmiotu English.");
    moduleRow = created.data;
  } else if (moduleRow.module_key !== "english") {
    await supabase.from("curriculum_items").update({ module_key: "english", title: "English" }).eq("id", moduleRow.id);
  }

  for (const lesson of lessonRows) {
    await supabase
      .from("schedule_blocks")
      .update({
        curriculum_item_id: moduleRow.id,
        title: lessonCalendarTitle("English", lesson.title),
        href: lesson.href,
        source_id: lesson.source_id,
      })
      .eq("learner_id", learnerId)
      .eq("curriculum_item_id", lesson.id);
    await supabase.from("curriculum_items").delete().eq("id", lesson.id).eq("learner_id", learnerId);
  }
}

export async function ensureEarlyGradeSubjects(supabase: Client, learnerId: string): Promise<void> {
  const { data: rows, error } = await supabase
    .from("curriculum_items")
    .select("id, subject, status, kind")
    .eq("learner_id", learnerId);
  if (error) throw error;

  const bySubject = new Map((rows ?? []).map((row) => [subjectKey(row.subject), row]));
  for (const subject of EARLY_GRADE_SUBJECTS) {
    const existing = bySubject.get(subjectKey(subject.subject));
    if (!existing) {
      const created = await supabase.from("curriculum_items").insert({
        learner_id: learnerId,
        kind: "main",
        status: "accepted",
        title: subject.title,
        subject: subject.subject,
        duration_minutes: 25,
        parent_guide: subject.parentGuide,
      });
      if (created.error) throw created.error;
      continue;
    }
    if (existing.status !== "accepted" || existing.kind !== "main") {
      const updated = await supabase
        .from("curriculum_items")
        .update({ kind: "main", status: "accepted" })
        .eq("id", existing.id)
        .eq("learner_id", learnerId);
      if (updated.error) throw updated.error;
    }
  }
}

export async function loadLessonPlan(supabase: Client, learnerId: string): Promise<LessonPlanSnapshot> {
  await foldEnglishLessons(supabase, learnerId);
  await ensureEarlyGradeSubjects(supabase, learnerId);

  const extras = await supabase
    .from("curriculum_items")
    .select("id", { count: "exact", head: true })
    .eq("learner_id", learnerId)
    .eq("kind", "extra");

  if ((extras.count ?? 0) === 0) {
    await supabase.from("curriculum_items").insert(
      STARTER_EXTRAS.map((extra) => ({
        learner_id: learnerId,
        kind: "extra" as const,
        status: "proposed" as const,
        title: extra.title,
        subject: extra.subject,
        duration_minutes: 25,
        parent_guide: extra.parentGuide,
      }))
    );
  }

  const [itemsResponse, blocksResponse, messagesResponse, proposalResponse, membershipResponse] = await Promise.all([
    supabase.from("curriculum_items").select("*").eq("learner_id", learnerId).order("created_at"),
    supabase.from("schedule_blocks").select("*").eq("learner_id", learnerId).order("starts_at"),
    supabase
      .from("planner_messages")
      .select("*")
      .eq("learner_id", learnerId)
      .order("created_at", { ascending: false })
      .limit(80),
    supabase
      .from("plan_proposals")
      .select("*")
      .eq("learner_id", learnerId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("household_members").select("household_id").eq("user_id", learnerId).maybeSingle(),
  ]);

  let locality: string | null = null;
  if (membershipResponse.data?.household_id) {
    const household = await supabase
      .from("households")
      .select("locality")
      .eq("id", membershipResponse.data.household_id)
      .maybeSingle();
    locality = household.data?.locality ?? null;
  }

  const parsedOperations = proposalResponse.data
    ? plannerOperationSchema.array().safeParse(proposalResponse.data.operations)
    : null;

  return {
    items: (itemsResponse.data ?? []).map(mapItem),
    blocks: (blocksResponse.data ?? []).map(mapBlock),
    messages: [...(messagesResponse.data ?? [])].reverse().map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      proposalId: message.proposal_id,
      createdAt: message.created_at,
    })),
    proposal:
      proposalResponse.data && parsedOperations?.success
        ? {
            id: proposalResponse.data.id,
            summary: proposalResponse.data.summary,
            operations: parsedOperations.data,
            month: proposalResponse.data.month,
          }
        : null,
    locality,
  };
}

export async function completedEnglishSourceIds(supabase: Client, learnerId: string): Promise<string[]> {
  const { data } = await supabase.from("english_progress").select("dialogue_id, score").eq("user_id", learnerId);
  const best = new Map<string, number>();
  for (const row of data ?? []) {
    best.set(row.dialogue_id, Math.max(best.get(row.dialogue_id) ?? -1, row.score));
  }
  return [...best.entries()].filter(([, score]) => score >= 50).map(([id]) => id);
}

export async function unfinishedEnglishLessons(
  supabase: Client,
  learnerId: string,
  options?: { skipPlaced?: boolean }
): Promise<ModuleLesson[]> {
  const [dialogues, progress, blocks] = await Promise.all([
    supabase
      .from("english_dialogues")
      .select("id, title, level, stage, lesson")
      .order("stage")
      .order("lesson")
      .order("sort_order"),
    supabase.from("english_progress").select("dialogue_id, score").eq("user_id", learnerId),
    options?.skipPlaced
      ? supabase.from("schedule_blocks").select("source_id").eq("learner_id", learnerId)
      : Promise.resolve({ data: [] as { source_id: string | null }[] }),
  ]);
  const best = new Map<string, number>();
  for (const row of progress.data ?? []) {
    best.set(row.dialogue_id, Math.max(best.get(row.dialogue_id) ?? -1, row.score));
  }
  const placed = new Set((blocks.data ?? []).map((block) => block.source_id).filter(Boolean));
  return (dialogues.data ?? [])
    .filter((dialogue) => (best.get(dialogue.id) ?? 0) < 50 && !placed.has(dialogue.id))
    .map((dialogue) => ({
      title: dialogue.title,
      sourceId: dialogue.id,
      href: `/english/lesson/${dialogue.level}/${dialogue.stage}/${dialogue.lesson}?dialogueId=${encodeURIComponent(dialogue.id)}`,
    }));
}

export async function importUnfinishedEnglish(supabase: Client, learnerId: string): Promise<number> {
  await foldEnglishLessons(supabase, learnerId);
  const { data: moduleRow } = await supabase
    .from("curriculum_items")
    .select("id")
    .eq("learner_id", learnerId)
    .eq("module_key", "english")
    .maybeSingle();

  if (moduleRow?.id) return 0;

  const created = await supabase
    .from("curriculum_items")
    .insert({
      learner_id: learnerId,
      kind: "main",
      status: "accepted",
      title: "English",
      subject: "English",
      duration_minutes: 25,
      parent_guide: "",
      module_key: "english",
    })
    .select("id")
    .single();
  if (created.error || !created.data) throw created.error ?? new Error("Nie udało się dodać przedmiotu English.");
  return 0;
}

export async function executeEffects(supabase: Client, learnerId: string, effects: PlanEffect[]): Promise<void> {
  for (const effect of effects) {
    if (effect.type === "delete_block" && effect.blockId) {
      const { error } = await supabase
        .from("schedule_blocks")
        .delete()
        .eq("id", effect.blockId)
        .eq("learner_id", learnerId);
      if (error) throw error;
    }
    if (effect.type === "delete_item" && effect.itemId) {
      const { error } = await supabase
        .from("curriculum_items")
        .delete()
        .eq("id", effect.itemId)
        .eq("learner_id", learnerId);
      if (error) throw error;
    }
    if (effect.type === "insert_item" && effect.item) {
      const { error } = await supabase.from("curriculum_items").insert(itemRecord(learnerId, effect.item));
      if (error) throw error;
    }
    if (effect.type === "update_item" && effect.item) {
      const { error } = await supabase
        .from("curriculum_items")
        .update(itemRecord(learnerId, effect.item))
        .eq("id", effect.item.id)
        .eq("learner_id", learnerId);
      if (error) throw error;
    }
    if (effect.type === "insert_block" && effect.block) {
      const { error } = await supabase.from("schedule_blocks").insert(blockRecord(learnerId, effect.block));
      if (error) throw error;
    }
    if (effect.type === "update_block" && effect.block) {
      const { error } = await supabase
        .from("schedule_blocks")
        .update({ starts_at: effect.block.startsAt, ends_at: effect.block.endsAt })
        .eq("id", effect.block.id)
        .eq("learner_id", learnerId);
      if (error) throw error;
    }
  }
}

function itemRecord(
  learnerId: string,
  item: CurriculumItem
): Database["public"]["Tables"]["curriculum_items"]["Insert"] {
  return {
    id: item.id,
    learner_id: learnerId,
    kind: item.kind,
    status: item.status,
    title: item.title,
    subject: item.subject,
    duration_minutes: item.durationMinutes,
    parent_guide: item.parentGuide,
    source_id: item.sourceId,
    href: item.href,
    module_key: item.moduleKey ?? null,
  };
}

function blockRecord(
  learnerId: string,
  block: ScheduleBlock
): Database["public"]["Tables"]["schedule_blocks"]["Insert"] {
  return {
    id: block.id,
    learner_id: learnerId,
    curriculum_item_id: block.curriculumItemId,
    kind: block.kind,
    starts_at: block.startsAt,
    ends_at: block.endsAt,
    title: block.title,
    href: block.href,
    source_id: block.sourceId,
  };
}

export async function storeProposal(
  supabase: Client,
  input: {
    learnerId: string;
    authorUserId: string;
    summary: string;
    operations: PlannerOperation[];
    month: string | null;
    userText?: string;
  }
): Promise<string> {
  await supabase
    .from("plan_proposals")
    .update({ status: "rejected" })
    .eq("learner_id", input.learnerId)
    .eq("status", "pending");

  const { data, error } = await supabase
    .from("plan_proposals")
    .insert({
      learner_id: input.learnerId,
      author_user_id: input.authorUserId,
      summary: input.summary,
      operations: input.operations as unknown as Json,
      month: input.month,
      status: "pending",
    })
    .select("id")
    .single();
  if (error || !data) throw error ?? new Error("Nie udało się zapisać propozycji.");

  const messages: Database["public"]["Tables"]["planner_messages"]["Insert"][] = [];
  if (input.userText) {
    messages.push({
      learner_id: input.learnerId,
      author_user_id: input.authorUserId,
      role: "user",
      content: input.userText,
    });
  }
  messages.push({
    learner_id: input.learnerId,
    author_user_id: input.authorUserId,
    role: "assistant",
    content: input.summary,
    proposal_id: data.id,
  });
  const inserted = await supabase.from("planner_messages").insert(messages);
  if (inserted.error) throw inserted.error;
  return data.id;
}

export async function saveHouseholdLocality(supabase: Client, ownerUserId: string, locality: string): Promise<void> {
  const { error } = await supabase.from("households").update({ locality: locality.trim() }).eq("owner_id", ownerUserId);
  if (error) throw error;
}

export async function storeChatTurn(
  supabase: Client,
  input: { learnerId: string; authorUserId: string; userText: string; assistantText: string }
): Promise<void> {
  const rows: Database["public"]["Tables"]["planner_messages"]["Insert"][] = [];
  if (input.userText.trim()) {
    rows.push({
      learner_id: input.learnerId,
      author_user_id: input.authorUserId,
      role: "user",
      content: input.userText.trim(),
    });
  }
  rows.push({
    learner_id: input.learnerId,
    author_user_id: input.authorUserId,
    role: "assistant",
    content: input.assistantText.trim(),
  });
  const inserted = await supabase.from("planner_messages").insert(rows);
  if (inserted.error) throw inserted.error;
}
