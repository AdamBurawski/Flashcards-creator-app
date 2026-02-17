// ============================================
// English Module Types
// ============================================

/** CEFR proficiency level */
export type CEFRLevel = "A1" | "A2" | "B1" | "B2";

// --------------------------------------------
// Dialogue & Turn types
// --------------------------------------------

/** Full dialogue entity as stored in the database */
export interface EnglishDialogue {
  id: string;
  stage: number;
  lesson: number;
  level: CEFRLevel;
  title: string;
  tags: string[];
  target_vocab: string[];
  target_structures: string[];
  turns: DialogueTurn[];
  revision_from: string[];
  estimated_duration_seconds: number;
  sort_order: number;
  /** URL to a visual context image for the dialogue (Google Drive, etc.) */
  image_url?: string;
}

/** Union type for dialogue turns — either teacher or student */
export type DialogueTurn = TeacherTurn | StudentTurn;

/** Teacher turn with optional repeat and hint */
export interface TeacherTurn {
  index: number;
  role: "teacher";
  text: string;
  repeat: boolean;
  hint?: string;
  audio?: {
    question: string; // URL to .mp3
    question_repeat?: string; // URL to .mp3
    hint?: string; // URL to .mp3
  };
}

/** Student turn with expected answer and acceptable variants */
export interface StudentTurn {
  index: number;
  role: "student";
  text: string; // model answer
  accept: string[]; // acceptable answer variants
}

// --------------------------------------------
// Evaluation types
// --------------------------------------------

/** Result of evaluating a student's answer */
export interface EvaluationResult {
  is_correct: boolean;
  feedback_text: string;
  feedback_audio_url?: string; // base64 data URL of feedback audio
  correct_answer: string;
  correction_details: {
    grammar_ok: boolean;
    vocabulary_ok: boolean;
    structure_ok: boolean;
  };
}

// --------------------------------------------
// Progress types
// --------------------------------------------

/** Progress record for a completed dialogue */
export interface EnglishProgress {
  id: number;
  user_id: string;
  dialogue_id: string;
  score: number;
  total_turns: number;
  correct_turns: number;
  duration_seconds: number;
  completed_at: string;
}

// --------------------------------------------
// API response DTOs
// --------------------------------------------

/** Summary of a CEFR level with progress */
export interface LevelSummary {
  level: CEFRLevel;
  total_lessons: number;
  total_dialogues: number;
  completed_dialogues: number;
  completion_percent: number;
}

/** Lesson overview with dialogue list and progress */
export interface LessonOverview {
  lesson: number;
  stage: number;
  level: CEFRLevel;
  dialogues: DialogueOverview[];
  total_dialogues: number;
  completed_dialogues: number;
}

/** Single dialogue overview in lesson list */
export interface DialogueOverview {
  id: string;
  title: string;
  tags: string[];
  estimated_duration_seconds: number;
  completed: boolean;
  best_score: number | null;
}

// --------------------------------------------
// Command DTOs (request bodies)
// --------------------------------------------

/** DTO for POST /api/english/evaluate */
export interface EvaluateAnswerCommand {
  dialogue_id: string;
  turn_index: number;
  expected_answer: string;
  accepted_answers: string[];
  user_answer: string;
  target_structures: string[];
  context: {
    teacher_question: string;
    lesson_title: string;
  };
}

/** DTO for POST /api/english/progress */
export interface SaveProgressCommand {
  dialogue_id: string;
  total_turns: number;
  correct_turns: number;
  duration_seconds: number;
}

// --------------------------------------------
// Progress summary (GET /api/english/progress)
// --------------------------------------------

/** Full progress summary response */
export interface ProgressSummaryResponse {
  summary: {
    total_dialogues_completed: number;
    total_time_seconds: number;
    average_score: number;
    current_streak_days: number;
  };
  by_level: {
    level: CEFRLevel;
    completed: number;
    total: number;
    average_score: number;
  }[];
  recent_sessions: {
    dialogue_id: string;
    title: string;
    score: number;
    completed_at: string;
  }[];
}

// --------------------------------------------
// Lesson session state (frontend)
// --------------------------------------------

/** Phase of the lesson session flow */
export type LessonPhase = "teacher_speaking" | "student_turn" | "evaluating" | "feedback" | "summary";

/** State of the lesson session component */
export interface LessonSessionState {
  dialogues: EnglishDialogue[];
  currentDialogueIndex: number;
  currentTurnIndex: number;
  phase: LessonPhase;
  userAnswer: string;
  isRecording: boolean;
  evaluationResult: EvaluationResult | null;
  sessionScore: { correct: number; total: number };
  isLoading: boolean;
  error: string | null;
  sessionStartTime: number;
}

// --------------------------------------------
// JSONL import types (for the import script)
// --------------------------------------------

/** Raw teacher turn as stored in JSONL file (no index or audio) */
export interface RawTeacherTurn {
  role: "teacher";
  text: string;
  repeat: boolean;
  hint?: string;
}

/** Raw student turn as stored in JSONL file (no index) */
export interface RawStudentTurn {
  role: "student";
  text: string;
  accept: string[];
}

/** Raw turn union type from JSONL */
export type RawDialogueTurn = RawTeacherTurn | RawStudentTurn;

/** Raw dialogue record from JSONL file */
export interface RawDialogueRecord {
  id: string;
  stage: number;
  lesson: number;
  level: string;
  title: string;
  tags: string[];
  target_vocab: string[];
  target_structures: string[];
  turns: RawDialogueTurn[];
  revision_from: string[];
  estimated_duration_seconds: number;
  sort_order?: number;
  /** Optional URL to a visual context image */
  image_url?: string;
}
