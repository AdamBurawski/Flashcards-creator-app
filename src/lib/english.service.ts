import type { SupabaseClient } from "../db/supabase.client";
import type {
  CEFRLevel,
  LevelSummary,
  LessonOverview,
  DialogueOverview,
  EnglishDialogue,
  DialogueTurn,
  TeacherTurn,
  StudentTurn,
  EnglishProgress,
  SaveProgressCommand,
  ProgressSummaryResponse,
} from "../types/english";

// ============================================================================
// getLevels — returns CEFR levels with user progress
// ============================================================================

export async function getLevels(
  supabase: SupabaseClient,
  userId: string
): Promise<{ data?: { levels: LevelSummary[] }; error?: string; status?: number }> {
  // 1. Get unique levels with dialogue counts and lesson counts
  const { data: dialogues, error: dialoguesError } = await supabase
    .from("english_dialogues")
    .select("id, level, lesson, stage");

  if (dialoguesError) {
    console.error("[english.service] getLevels dialogues error:", dialoguesError.message);
    return { error: "Błąd pobierania danych dialogów", status: 500 };
  }

  if (!dialogues || dialogues.length === 0) {
    return { data: { levels: [] } };
  }

  // 2. Get user's completed dialogues (score >= 50)
  const { data: progress, error: progressError } = await supabase
    .from("english_progress")
    .select("dialogue_id, score")
    .eq("user_id", userId);

  if (progressError) {
    console.error("[english.service] getLevels progress error:", progressError.message);
    return { error: "Błąd pobierania postępów", status: 500 };
  }

  // Build set of completed dialogue IDs (best score >= 50)
  const completedDialogueIds = new Set<string>();
  if (progress) {
    const bestScores = new Map<string, number>();
    for (const p of progress) {
      const current = bestScores.get(p.dialogue_id) ?? 0;
      if (p.score > current) {
        bestScores.set(p.dialogue_id, p.score);
      }
    }
    for (const [dialogueId, score] of bestScores) {
      if (score >= 50) {
        completedDialogueIds.add(dialogueId);
      }
    }
  }

  // 3. Aggregate per level
  const levelMap = new Map<string, { totalDialogues: number; lessons: Set<string>; completedDialogues: number }>();

  for (const d of dialogues) {
    const level = d.level as string;
    if (!levelMap.has(level)) {
      levelMap.set(level, { totalDialogues: 0, lessons: new Set(), completedDialogues: 0 });
    }
    const entry = levelMap.get(level);
    if (!entry) continue;
    entry.totalDialogues++;
    entry.lessons.add(`${d.stage}-${d.lesson}`);
    if (completedDialogueIds.has(d.id)) {
      entry.completedDialogues++;
    }
  }

  // 4. Build response sorted by level order
  const levelOrder: CEFRLevel[] = ["A1", "A2", "B1", "B2"];
  const levels: LevelSummary[] = levelOrder
    .filter((l) => levelMap.has(l))
    .map((level) => {
      const entry = levelMap.get(level);
      if (!entry) return undefined;
      return {
        level,
        total_lessons: entry.lessons.size,
        total_dialogues: entry.totalDialogues,
        completed_dialogues: entry.completedDialogues,
        completion_percent:
          entry.totalDialogues > 0 ? Math.round((entry.completedDialogues / entry.totalDialogues) * 100) : 0,
      };
    })
    .filter((item): item is LevelSummary => item !== undefined);

  return { data: { levels } };
}

// ============================================================================
// getLessons — returns lessons for a given CEFR level with user progress
// ============================================================================

export async function getLessons(
  supabase: SupabaseClient,
  userId: string,
  level: CEFRLevel
): Promise<{ data?: { lessons: LessonOverview[] }; error?: string; status?: number }> {
  // 1. Fetch dialogues for the level
  const { data: dialogues, error: dialoguesError } = await supabase
    .from("english_dialogues")
    .select("id, stage, lesson, title, tags, estimated_duration_seconds, sort_order")
    .eq("level", level)
    .order("lesson", { ascending: true })
    .order("sort_order", { ascending: true });

  if (dialoguesError) {
    console.error("[english.service] getLessons dialogues error:", dialoguesError.message);
    return { error: "Błąd pobierania lekcji", status: 500 };
  }

  if (!dialogues || dialogues.length === 0) {
    return { data: { lessons: [] } };
  }

  // 2. Get user progress for these dialogues
  const dialogueIds = dialogues.map((d) => d.id);
  const { data: progress, error: progressError } = await supabase
    .from("english_progress")
    .select("dialogue_id, score")
    .eq("user_id", userId)
    .in("dialogue_id", dialogueIds);

  if (progressError) {
    console.error("[english.service] getLessons progress error:", progressError.message);
    return { error: "Błąd pobierania postępów", status: 500 };
  }

  // Build map of best scores per dialogue
  const bestScores = new Map<string, number>();
  if (progress) {
    for (const p of progress) {
      const current = bestScores.get(p.dialogue_id) ?? -1;
      if (p.score > current) {
        bestScores.set(p.dialogue_id, p.score);
      }
    }
  }

  // 3. Group dialogues by lesson
  const lessonMap = new Map<string, { lesson: number; stage: number; dialogues: DialogueOverview[] }>();

  for (const d of dialogues) {
    const key = `${d.stage}-${d.lesson}`;
    if (!lessonMap.has(key)) {
      lessonMap.set(key, { lesson: d.lesson, stage: d.stage, dialogues: [] });
    }

    const bestScore = bestScores.get(d.id);
    const completed = bestScore !== undefined && bestScore >= 50;

    const lessonEntry = lessonMap.get(key);
    if (!lessonEntry) continue;
    lessonEntry.dialogues.push({
      id: d.id,
      title: d.title,
      tags: d.tags as string[],
      estimated_duration_seconds: d.estimated_duration_seconds ?? 0,
      completed,
      best_score: bestScore ?? null,
    });
  }

  // 4. Build response
  const lessons: LessonOverview[] = [...lessonMap.values()].map((entry) => ({
    lesson: entry.lesson,
    stage: entry.stage,
    level,
    dialogues: entry.dialogues,
    total_dialogues: entry.dialogues.length,
    completed_dialogues: entry.dialogues.filter((d) => d.completed).length,
  }));

  return { data: { lessons } };
}

// ============================================================================
// getDialoguesForLesson — returns full dialogues with turns and audio URLs
// ============================================================================

export async function getDialoguesForLesson(
  supabase: SupabaseClient,
  lessonId: number,
  level: CEFRLevel,
  stage: number
): Promise<{
  data?: { lesson: number; stage: number; level: CEFRLevel; dialogues: EnglishDialogue[] };
  error?: string;
  status?: number;
}> {
  // 1. Fetch dialogues
  const { data: rawDialogues, error: dialoguesError } = await supabase
    .from("english_dialogues")
    .select("*")
    .eq("lesson", lessonId)
    .eq("level", level)
    .eq("stage", stage)
    .order("sort_order", { ascending: true });

  if (dialoguesError) {
    console.error("[english.service] getDialoguesForLesson error:", dialoguesError.message);
    return { error: "Błąd pobierania dialogów", status: 500 };
  }

  if (!rawDialogues || rawDialogues.length === 0) {
    return { error: "Nie znaleziono dialogów dla podanej lekcji", status: 404 };
  }

  // 2. Fetch audio files for these dialogues
  const dialogueIds = rawDialogues.map((d) => d.id);
  const { data: audioFiles, error: audioError } = await supabase
    .from("english_audio_files")
    .select("dialogue_id, turn_index, audio_type, audio_url")
    .in("dialogue_id", dialogueIds);

  if (audioError) {
    console.error("[english.service] getDialoguesForLesson audio error:", audioError.message);
    // Non-fatal: continue without audio
  }

  // Build audio lookup: dialogueId -> turnIndex -> { question, question_repeat, hint }
  const audioMap = new Map<string, Map<number, Record<string, string>>>();
  if (audioFiles) {
    for (const af of audioFiles) {
      if (!audioMap.has(af.dialogue_id)) {
        audioMap.set(af.dialogue_id, new Map());
      }
      const turnMap = audioMap.get(af.dialogue_id);
      if (!turnMap) continue;
      if (!turnMap.has(af.turn_index)) {
        turnMap.set(af.turn_index, {});
      }
      const audioEntry = turnMap.get(af.turn_index);
      if (audioEntry) {
        audioEntry[af.audio_type] = af.audio_url;
      }
    }
  }

  // 3. Map raw DB rows to typed EnglishDialogue objects with indexed turns and audio
  const dialogues: EnglishDialogue[] = rawDialogues.map((d) => {
    const rawTurns = d.turns as {
      role: string;
      text: string;
      repeat?: boolean;
      hint?: string;
      accept?: string[];
    }[];

    const turnAudioMap = audioMap.get(d.id);

    const turns: DialogueTurn[] = rawTurns.map((t, index) => {
      if (t.role === "teacher") {
        const audio = turnAudioMap?.get(index);
        const teacherTurn: TeacherTurn = {
          index,
          role: "teacher",
          text: t.text,
          repeat: t.repeat ?? false,
          hint: t.hint,
        };
        if (audio) {
          teacherTurn.audio = {
            question: audio.question || "",
            question_repeat: audio.question_repeat,
            hint: audio.hint,
          };
        }
        return teacherTurn;
      }

      // Student turn
      const studentTurn: StudentTurn = {
        index,
        role: "student",
        text: t.text,
        accept: t.accept ?? [t.text],
      };
      return studentTurn;
    });

    return {
      id: d.id,
      stage: d.stage,
      lesson: d.lesson,
      level: d.level as CEFRLevel,
      title: d.title,
      tags: d.tags as string[],
      target_vocab: d.target_vocab as string[],
      target_structures: d.target_structures as string[],
      turns,
      revision_from: (d.revision_from as string[]) ?? [],
      estimated_duration_seconds: d.estimated_duration_seconds ?? 0,
      sort_order: d.sort_order,
    };
  });

  return {
    data: {
      lesson: lessonId,
      stage,
      level,
      dialogues,
    },
  };
}

// ============================================================================
// saveProgress — saves a completed dialogue result
// ============================================================================

export async function saveProgress(
  supabase: SupabaseClient,
  userId: string,
  command: SaveProgressCommand
): Promise<{ data?: EnglishProgress; error?: string; status?: number }> {
  const score = Math.round((command.correct_turns / command.total_turns) * 100);

  const { data, error } = await supabase
    .from("english_progress")
    .insert({
      user_id: userId,
      dialogue_id: command.dialogue_id,
      score,
      total_turns: command.total_turns,
      correct_turns: command.correct_turns,
      duration_seconds: command.duration_seconds,
    })
    .select()
    .single();

  if (error) {
    console.error("[english.service] saveProgress error:", error.message);

    // Check for foreign key violation (invalid dialogue_id)
    if (error.code === "23503") {
      return { error: "Podany dialog nie istnieje", status: 404 };
    }

    return { error: "Błąd zapisu postępów", status: 500 };
  }

  return {
    data: {
      id: data.id,
      user_id: data.user_id,
      dialogue_id: data.dialogue_id,
      score: data.score,
      total_turns: data.total_turns,
      correct_turns: data.correct_turns,
      duration_seconds: data.duration_seconds ?? 0,
      completed_at: data.completed_at,
    },
  };
}

// ============================================================================
// getProgressSummary — returns user's progress summary
// ============================================================================

export async function getProgressSummary(
  supabase: SupabaseClient,
  userId: string,
  level?: CEFRLevel
): Promise<{ data?: ProgressSummaryResponse; error?: string; status?: number }> {
  // 1. Get all progress records for user
  const { data: progressRecords, error: progressError } = await supabase
    .from("english_progress")
    .select("dialogue_id, score, total_turns, correct_turns, duration_seconds, completed_at")
    .eq("user_id", userId)
    .order("completed_at", { ascending: false });

  if (progressError) {
    console.error("[english.service] getProgressSummary error:", progressError.message);
    return { error: "Błąd pobierania postępów", status: 500 };
  }

  // 2. Get dialogues info for titles and levels
  const { data: allDialogues, error: dialoguesError } = await supabase
    .from("english_dialogues")
    .select("id, title, level");

  if (dialoguesError) {
    console.error("[english.service] getProgressSummary dialogues error:", dialoguesError.message);
    return { error: "Błąd pobierania danych dialogów", status: 500 };
  }

  const dialogueMap = new Map<string, { title: string; level: string }>();
  if (allDialogues) {
    for (const d of allDialogues) {
      dialogueMap.set(d.id, { title: d.title, level: d.level });
    }
  }

  const records = progressRecords ?? [];

  // 3. Filter by level if specified
  const filteredRecords = level
    ? records.filter((r) => {
        const dialogue = dialogueMap.get(r.dialogue_id);
        return dialogue?.level === level;
      })
    : records;

  // 4. Calculate summary
  const uniqueDialogues = new Set(filteredRecords.map((r) => r.dialogue_id));
  const totalTime = filteredRecords.reduce((sum, r) => sum + (r.duration_seconds ?? 0), 0);
  const avgScore =
    filteredRecords.length > 0
      ? Math.round(filteredRecords.reduce((sum, r) => sum + r.score, 0) / filteredRecords.length)
      : 0;

  // 5. Calculate streak (consecutive days with activity)
  const streakDays = calculateStreak(filteredRecords.map((r) => r.completed_at));

  // 6. Progress by level
  const levelStats = new Map<string, { completed: Set<string>; totalScore: number; count: number }>();
  for (const r of records) {
    const dialogue = dialogueMap.get(r.dialogue_id);
    if (!dialogue) continue;
    const dlevel = dialogue.level;
    if (!levelStats.has(dlevel)) {
      levelStats.set(dlevel, { completed: new Set(), totalScore: 0, count: 0 });
    }
    const stat = levelStats.get(dlevel);
    if (!stat) continue;
    if (r.score >= 50) {
      stat.completed.add(r.dialogue_id);
    }
    stat.totalScore += r.score;
    stat.count++;
  }

  // Count total dialogues per level
  const totalDialoguesPerLevel = new Map<string, number>();
  if (allDialogues) {
    for (const d of allDialogues) {
      totalDialoguesPerLevel.set(d.level, (totalDialoguesPerLevel.get(d.level) ?? 0) + 1);
    }
  }

  const levelOrder: CEFRLevel[] = ["A1", "A2", "B1", "B2"];
  const byLevel = levelOrder
    .filter((l) => levelStats.has(l) || totalDialoguesPerLevel.has(l))
    .map((l) => {
      const stat = levelStats.get(l);
      return {
        level: l,
        completed: stat?.completed.size ?? 0,
        total: totalDialoguesPerLevel.get(l) ?? 0,
        average_score: stat && stat.count > 0 ? Math.round(stat.totalScore / stat.count) : 0,
      };
    });

  // 7. Recent sessions (last 10)
  const recentSessions = filteredRecords.slice(0, 10).map((r) => ({
    dialogue_id: r.dialogue_id,
    title: dialogueMap.get(r.dialogue_id)?.title ?? "Unknown",
    score: r.score,
    completed_at: r.completed_at,
  }));

  return {
    data: {
      summary: {
        total_dialogues_completed: uniqueDialogues.size,
        total_time_seconds: totalTime,
        average_score: avgScore,
        current_streak_days: streakDays,
      },
      by_level: byLevel,
      recent_sessions: recentSessions,
    },
  };
}

// ============================================================================
// Helper: calculate streak of consecutive days
// ============================================================================

function calculateStreak(completedDates: string[]): number {
  if (completedDates.length === 0) return 0;

  // Get unique dates (YYYY-MM-DD) sorted descending
  const uniqueDays = [...new Set(completedDates.map((d) => new Date(d).toISOString().split("T")[0]))].sort((a, b) =>
    b.localeCompare(a)
  );

  const today = new Date().toISOString().split("T")[0];

  // Streak must include today or yesterday
  if (uniqueDays[0] !== today) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    if (uniqueDays[0] !== yesterday) return 0;
  }

  let streak = 1;
  for (let i = 1; i < uniqueDays.length; i++) {
    const prev = new Date(uniqueDays[i - 1]);
    const curr = new Date(uniqueDays[i]);
    const diffDays = (prev.getTime() - curr.getTime()) / 86400000;
    if (Math.abs(diffDays - 1) < 0.01) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}
