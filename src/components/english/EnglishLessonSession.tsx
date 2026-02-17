import React, { useState, useEffect, useCallback, useRef } from "react";
import type {
  CEFRLevel,
  EnglishDialogue,
  LessonPhase,
  EvaluationResult,
  DialogueTurn,
  TeacherTurn,
  StudentTurn,
} from "../../types/english";
import TeacherBubble from "./TeacherBubble";
import StudentAnswerInput from "./StudentAnswerInput";
import FeedbackDisplay from "./FeedbackDisplay";
import LessonSummary from "./LessonSummary";

// ---------- PURE HELPER FUNCTIONS (outside component) ----------

function isTeacherTurn(turn: DialogueTurn): turn is TeacherTurn {
  return turn.role === "teacher";
}

function isStudentTurn(turn: DialogueTurn): turn is StudentTurn {
  return turn.role === "student";
}

/** Advance state to the next turn/dialogue or summary (pure function) */
function advanceToNextTurn(prev: SessionState): SessionState {
  const dialogue = prev.dialogues[prev.currentDialogueIndex];
  if (!dialogue) return { ...prev, phase: "summary" };

  const nextTurnIndex = prev.currentTurnIndex + 1;

  // More turns in current dialogue
  if (nextTurnIndex < dialogue.turns.length) {
    const nextTurn = dialogue.turns[nextTurnIndex];
    if (isTeacherTurn(nextTurn)) {
      return {
        ...prev,
        currentTurnIndex: nextTurnIndex,
        phase: "teacher_speaking",
        teacherSubPhase: "question",
        userAnswer: "",
        evaluationResult: null,
      };
    }
    if (isStudentTurn(nextTurn)) {
      return {
        ...prev,
        currentTurnIndex: nextTurnIndex,
        phase: "student_turn",
        userAnswer: "",
        evaluationResult: null,
      };
    }
  }

  // Move to next dialogue
  const nextDialogueIndex = prev.currentDialogueIndex + 1;
  if (nextDialogueIndex < prev.dialogues.length) {
    const nextDialogue = prev.dialogues[nextDialogueIndex];
    const firstTurn = nextDialogue.turns[0];

    return {
      ...prev,
      currentDialogueIndex: nextDialogueIndex,
      currentTurnIndex: 0,
      phase: firstTurn && isTeacherTurn(firstTurn) ? "teacher_speaking" : "student_turn",
      teacherSubPhase: "question",
      userAnswer: "",
      evaluationResult: null,
    };
  }

  // All dialogues complete
  return { ...prev, phase: "summary" };
}

// ---------- TYPES ----------

interface EnglishLessonSessionProps {
  level: CEFRLevel;
  stage: number;
  lesson: number;
}

type TeacherSubPhase = "question" | "repeat" | "hint";

interface SessionState {
  dialogues: EnglishDialogue[];
  currentDialogueIndex: number;
  currentTurnIndex: number;
  phase: LessonPhase;
  teacherSubPhase: TeacherSubPhase;
  userAnswer: string;
  isRecording: boolean;
  evaluationResult: EvaluationResult | null;
  sessionScore: { correct: number; total: number };
  isLoading: boolean;
  error: string | null;
  sessionStartTime: number;
}

interface ConversationEntry {
  type: "teacher" | "student" | "feedback";
  text: string;
  hint?: string;
  /** Dialogue ID used to resolve local image asset */
  dialogueId?: string;
  /** Optional explicit image URL override */
  imageUrl?: string;
  evaluationResult?: EvaluationResult;
}

/**
 * Main lesson session orchestrator component.
 * Manages the full conversation flow: teacher speaking → student answer → evaluation → feedback.
 */
const EnglishLessonSession: React.FC<EnglishLessonSessionProps> = ({ level, stage, lesson }) => {
  const [state, setState] = useState<SessionState>({
    dialogues: [],
    currentDialogueIndex: 0,
    currentTurnIndex: 0,
    phase: "teacher_speaking",
    teacherSubPhase: "question",
    userAnswer: "",
    isRecording: false,
    evaluationResult: null,
    sessionScore: { correct: 0, total: 0 },
    isLoading: true,
    error: null,
    sessionStartTime: Date.now(),
  });

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [conversationHistory, setConversationHistory] = useState<ConversationEntry[]>([]);

  // ---------- DATA LOADING ----------

  useEffect(() => {
    let cancelled = false;

    async function loadDialogues() {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      try {
        const url = `/api/english/lessons/${lesson}/dialogues?level=${level}&stage=${stage}`;
        const response = await fetch(url);

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Nie udało się pobrać danych lekcji");
        }

        const data = await response.json();
        const dialogues: EnglishDialogue[] = data.dialogues || [];

        if (dialogues.length === 0) {
          throw new Error("Brak dialogów w tej lekcji");
        }

        if (cancelled) return;

        setState((prev) => ({
          ...prev,
          dialogues,
          isLoading: false,
          currentDialogueIndex: 0,
          currentTurnIndex: 0,
          phase: "teacher_speaking",
          teacherSubPhase: "question",
          sessionStartTime: Date.now(),
        }));

        // Add first teacher turn to history
        const firstDialogue = dialogues[0];
        const firstTurn = firstDialogue.turns[0];
        if (firstTurn && firstTurn.role === "teacher") {
          setConversationHistory([
            {
              type: "teacher",
              text: firstTurn.text,
              hint: firstTurn.hint,
              dialogueId: firstDialogue.id,
              imageUrl: firstDialogue.image_url,
            },
          ]);
        }
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Wystąpił nieoczekiwany błąd";
        setState((prev) => ({ ...prev, isLoading: false, error: message }));
      }
    }

    loadDialogues();
    return () => {
      cancelled = true;
    };
  }, [level, stage, lesson]);

  // ---------- CURRENT TURN HELPERS ----------

  const getCurrentDialogue = useCallback((): EnglishDialogue | null => {
    return state.dialogues[state.currentDialogueIndex] ?? null;
  }, [state.dialogues, state.currentDialogueIndex]);

  const getCurrentTurn = useCallback((): DialogueTurn | null => {
    const dialogue = getCurrentDialogue();
    if (!dialogue) return null;
    return dialogue.turns[state.currentTurnIndex] ?? null;
  }, [getCurrentDialogue, state.currentTurnIndex]);

  const getLastTeacherTurn = useCallback((): TeacherTurn | null => {
    const dialogue = getCurrentDialogue();
    if (!dialogue) return null;

    for (let i = state.currentTurnIndex - 1; i >= 0; i--) {
      const turn = dialogue.turns[i];
      if (isTeacherTurn(turn)) return turn;
    }
    return null;
  }, [getCurrentDialogue, state.currentTurnIndex]);

  const getTotalStudentTurns = useCallback((): number => {
    return state.dialogues.reduce(
      (sum, dialogue) => sum + dialogue.turns.filter((t) => t.role === "student").length,
      0
    );
  }, [state.dialogues]);

  const isLastTurnInSession = useCallback((): boolean => {
    const dialogue = getCurrentDialogue();
    if (!dialogue) return true;

    const isLast = state.currentTurnIndex >= dialogue.turns.length - 1;
    const isLastDlg = state.currentDialogueIndex >= state.dialogues.length - 1;
    return isLast && isLastDlg;
  }, [getCurrentDialogue, state.currentTurnIndex, state.currentDialogueIndex, state.dialogues.length]);

  // ---------- PHASE TRANSITIONS ----------

  const handleTeacherAudioComplete = useCallback(() => {
    setState((prev) => {
      const dialogue = prev.dialogues[prev.currentDialogueIndex];
      if (!dialogue) return prev;

      const currentTurn = dialogue.turns[prev.currentTurnIndex];
      if (!currentTurn || !isTeacherTurn(currentTurn)) return prev;

      // Transition: question → repeat → hint → student_turn
      if (prev.teacherSubPhase === "question" && currentTurn.repeat) {
        return { ...prev, teacherSubPhase: "repeat" };
      }

      if ((prev.teacherSubPhase === "question" || prev.teacherSubPhase === "repeat") && currentTurn.hint) {
        return { ...prev, teacherSubPhase: "hint" };
      }

      // Move to the next turn (should be student turn)
      const nextIndex = prev.currentTurnIndex + 1;
      const nextTurn = dialogue.turns[nextIndex];

      if (nextTurn && isStudentTurn(nextTurn)) {
        return {
          ...prev,
          currentTurnIndex: nextIndex,
          phase: "student_turn",
          userAnswer: "",
          evaluationResult: null,
        };
      }

      // If no student turn follows, advance further
      return advanceToNextTurn(prev);
    });
  }, []);

  const handleSubmitAnswer = useCallback(async () => {
    const answer = state.userAnswer.trim();
    if (!answer) return;

    const dialogue = getCurrentDialogue();
    const turn = getCurrentTurn();
    if (!dialogue || !turn || !isStudentTurn(turn)) return;

    const teacherTurn = getLastTeacherTurn();

    // Add student answer to history
    setConversationHistory((prev) => [...prev, { type: "student", text: answer }]);

    // Move to evaluating phase
    setState((prev) => ({ ...prev, phase: "evaluating" }));

    try {
      const response = await fetch("/api/english/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dialogue_id: dialogue.id,
          turn_index: turn.index,
          expected_answer: turn.text,
          accepted_answers: turn.accept,
          user_answer: answer,
          target_structures: dialogue.target_structures,
          context: {
            teacher_question: teacherTurn?.text ?? "",
            lesson_title: dialogue.title,
          },
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Błąd oceny odpowiedzi");
      }

      const result: EvaluationResult = await response.json();

      // Update score
      setState((prev) => ({
        ...prev,
        phase: "feedback",
        evaluationResult: result,
        sessionScore: {
          correct: prev.sessionScore.correct + (result.is_correct ? 1 : 0),
          total: prev.sessionScore.total + 1,
        },
      }));

      // Add feedback to history
      setConversationHistory((prev) => [
        ...prev,
        { type: "feedback", text: result.feedback_text, evaluationResult: result },
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Wystąpił błąd oceny";
      setState((prev) => ({ ...prev, phase: "student_turn", error: message }));
    }
  }, [state.userAnswer, getCurrentDialogue, getCurrentTurn, getLastTeacherTurn]);

  const handleNextAfterFeedback = useCallback(() => {
    setState((prev) => {
      const next = advanceToNextTurn(prev);

      // If we're moving to a teacher turn, add it to history
      const dialogue = next.dialogues[next.currentDialogueIndex];
      if (dialogue && next.phase === "teacher_speaking") {
        const turn = dialogue.turns[next.currentTurnIndex];
        if (turn && isTeacherTurn(turn)) {
          setConversationHistory((h) => [
            ...h,
            {
              type: "teacher",
              text: turn.text,
              hint: turn.hint,
              dialogueId: dialogue.id,
              imageUrl: dialogue.image_url,
            },
          ]);
        }
      }

      return next;
    });
  }, []);

  const handleRetry = useCallback(() => {
    setConversationHistory([]);
    setState((prev) => {
      const firstDialogue = prev.dialogues[0];
      const firstTurn = firstDialogue?.turns[0];

      if (firstTurn && isTeacherTurn(firstTurn)) {
        setConversationHistory([
          {
            type: "teacher",
            text: firstTurn.text,
            hint: firstTurn.hint,
            dialogueId: firstDialogue?.id,
            imageUrl: firstDialogue?.image_url,
          },
        ]);
      }

      return {
        ...prev,
        currentDialogueIndex: 0,
        currentTurnIndex: 0,
        phase: "teacher_speaking",
        teacherSubPhase: "question",
        userAnswer: "",
        isRecording: false,
        evaluationResult: null,
        sessionScore: { correct: 0, total: 0 },
        error: null,
        sessionStartTime: Date.now(),
      };
    });
  }, []);

  // ---------- AUTO-SCROLL ----------

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [conversationHistory, state.phase]);

  // ---------- RENDER ----------

  if (state.isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Ładowanie lekcji...</p>
        </div>
      </div>
    );
  }

  if (state.error && state.dialogues.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">❌</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Błąd ładowania</h2>
          <p className="text-gray-600 mb-4">{state.error}</p>
          <a
            href={`/english/${level}`}
            className="inline-block px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
          >
            Wróć do listy lekcji
          </a>
        </div>
      </div>
    );
  }

  if (state.phase === "summary") {
    const durationSeconds = Math.round((Date.now() - state.sessionStartTime) / 1000);
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <LessonSummary
          correctTurns={state.sessionScore.correct}
          totalTurns={state.sessionScore.total || getTotalStudentTurns()}
          durationSeconds={durationSeconds}
          dialogues={state.dialogues}
          level={level}
          stage={stage}
          lesson={lesson}
          onRetry={handleRetry}
        />
      </div>
    );
  }

  const currentDialogue = getCurrentDialogue();
  const currentTurn = getCurrentTurn();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <a href={`/english/${level}`} className="text-gray-500 hover:text-gray-700 flex items-center gap-1 text-sm">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Wróć
        </a>

        <div className="text-center">
          <div className="text-sm font-semibold text-gray-900">{currentDialogue?.title ?? "Lekcja"}</div>
          <div className="text-xs text-gray-500">
            {level} • Etap {stage} • Lekcja {lesson}
          </div>
        </div>

        <div className="text-right">
          <div className="text-sm font-medium text-gray-700">
            {state.sessionScore.correct}/{state.sessionScore.total}
          </div>
          <div className="text-xs text-gray-500">wynik</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-white px-4 py-1">
        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-500"
            style={{
              width: `${getTotalStudentTurns() > 0 ? (state.sessionScore.total / getTotalStudentTurns()) * 100 : 0}%`,
            }}
          />
        </div>
      </div>

      {/* Chat area */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-2">
        {conversationHistory.map((entry, idx) => {
          if (entry.type === "teacher") {
            const isActive = state.phase === "teacher_speaking" && idx === conversationHistory.length - 1;
            const teacherTurnData = isActive ? (currentTurn as TeacherTurn) : null;

            return (
              <TeacherBubble
                key={`conv-${idx}`}
                text={entry.text}
                hint={entry.hint}
                dialogueId={entry.dialogueId}
                imageUrl={entry.imageUrl}
                audio={teacherTurnData?.audio}
                subPhase={isActive ? state.teacherSubPhase : "question"}
                onAudioComplete={handleTeacherAudioComplete}
                isActive={isActive}
              />
            );
          }

          if (entry.type === "student") {
            return (
              <div key={`conv-${idx}`} className="flex justify-end mb-4">
                <div className="max-w-lg bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-3">
                  <p className="text-base">{entry.text}</p>
                </div>
              </div>
            );
          }

          if (entry.type === "feedback" && entry.evaluationResult) {
            const isActive = state.phase === "feedback" && idx === conversationHistory.length - 1;

            if (isActive) {
              return (
                <FeedbackDisplay
                  key={`conv-${idx}`}
                  result={entry.evaluationResult}
                  onNext={handleNextAfterFeedback}
                  isLastTurn={isLastTurnInSession()}
                />
              );
            }

            return (
              <div
                key={`conv-${idx}`}
                className={`mb-2 px-3 py-2 rounded-lg text-sm ${
                  entry.evaluationResult.is_correct ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
                }`}
              >
                {entry.evaluationResult.is_correct ? "✓" : "✗"} {entry.text}
              </div>
            );
          }

          return null;
        })}

        {state.phase === "evaluating" && (
          <div className="flex items-center gap-3 mb-4 px-3">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-gray-500 text-sm">Sprawdzam odpowiedź...</span>
          </div>
        )}
      </div>

      {/* Input area */}
      {state.phase === "student_turn" && (
        <div className="bg-white border-t border-gray-200 px-4 py-4">
          {state.error && (
            <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {state.error}
            </div>
          )}
          <StudentAnswerInput
            value={state.userAnswer}
            onChange={(val) => setState((prev) => ({ ...prev, userAnswer: val }))}
            onSubmit={handleSubmitAnswer}
            isRecording={state.isRecording}
            disabled={state.phase !== "student_turn"}
          />
        </div>
      )}
    </div>
  );
};

export default EnglishLessonSession;
