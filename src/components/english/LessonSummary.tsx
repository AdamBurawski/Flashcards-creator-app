import React, { useEffect, useState } from "react";
import type { CEFRLevel, EnglishDialogue } from "../../types/english";

interface LessonSummaryProps {
  /** Score: correct answers count */
  correctTurns: number;
  /** Score: total student turns */
  totalTurns: number;
  /** Session duration in seconds */
  durationSeconds: number;
  /** Dialogue data (for vocab display) */
  dialogues: EnglishDialogue[];
  /** Current CEFR level */
  level: CEFRLevel;
  /** Current stage number */
  stage: number;
  /** Current lesson number */
  lesson: number;
  /** Called when user wants to retry */
  onRetry: () => void;
}

/**
 * Summary screen shown after completing all dialogues in a lesson.
 * Displays score, duration, vocabulary, and navigation options.
 */
const LessonSummary: React.FC<LessonSummaryProps> = ({
  correctTurns,
  totalTurns,
  durationSeconds,
  dialogues,
  level,
  stage: _stage,
  lesson: _lesson,
  onRetry,
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [_saved, setSaved] = useState(false);

  const score = totalTurns > 0 ? Math.round((correctTurns / totalTurns) * 100) : 0;

  // Collect unique vocab from all dialogues
  const allVocab = [...new Set(dialogues.flatMap((d) => d.target_vocab))];

  // Format duration as mm:ss
  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Get score color and label
  const getScoreInfo = (pct: number) => {
    if (pct >= 80) return { color: "text-green-600", bg: "bg-green-50", label: "Świetny wynik! 🎉" };
    if (pct >= 60) return { color: "text-amber-600", bg: "bg-amber-50", label: "Dobra robota! 👍" };
    return { color: "text-orange-600", bg: "bg-orange-50", label: "Ćwicz dalej! 💪" };
  };

  const scoreInfo = getScoreInfo(score);

  // Save progress on mount
  useEffect(() => {
    let cancelled = false;

    async function doSaveProgress() {
      if (dialogues.length === 0) return;

      setIsSaving(true);
      setSaveError(null);

      try {
        for (const dialogue of dialogues) {
          const response = await fetch("/api/english/progress", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              dialogue_id: dialogue.id,
              total_turns: totalTurns,
              correct_turns: correctTurns,
              duration_seconds: durationSeconds,
            }),
          });

          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || "Nie udało się zapisać postępu");
          }
        }

        if (!cancelled) setSaved(true);
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Błąd zapisu postępu";
          setSaveError(message);
        }
      } finally {
        if (!cancelled) setIsSaving(false);
      }
    }

    doSaveProgress();
    return () => {
      cancelled = true;
    };
  }, [dialogues, totalTurns, correctTurns, durationSeconds]);

  return (
    <div className="mx-auto max-w-lg rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm sm:p-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className={`mb-4 inline-flex h-20 w-20 items-center justify-center rounded-full ${scoreInfo.bg}`}>
          <span className={`text-4xl font-bold ${scoreInfo.color}`}>{score}%</span>
        </div>
        <h2 className="mb-1 text-2xl font-bold text-slate-900">Podsumowanie lekcji</h2>
        <p className={`text-lg font-medium ${scoreInfo.color}`}>{scoreInfo.label}</p>
      </div>

      {/* Stats grid */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-center">
          <div className="text-2xl font-bold text-slate-900">
            {correctTurns}/{totalTurns}
          </div>
          <div className="mt-1 text-xs text-slate-500">Poprawne odpowiedzi</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-center">
          <div className="text-2xl font-bold text-slate-900">{formatDuration(durationSeconds)}</div>
          <div className="mt-1 text-xs text-slate-500">Czas sesji</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-center">
          <div className="text-2xl font-bold text-slate-900">{dialogues.length}</div>
          <div className="mt-1 text-xs text-slate-500">Dialogi</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="mb-1 flex justify-between text-sm text-slate-600">
          <span>Postęp</span>
          <span>{score}%</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              score >= 80 ? "bg-green-500" : score >= 60 ? "bg-amber-500" : "bg-orange-500"
            }`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      {/* Vocabulary list */}
      {allVocab.length > 0 && (
        <div className="mb-6">
          <h3 className="mb-2 text-sm font-semibold text-slate-700">Przerobione słownictwo:</h3>
          <div className="flex flex-wrap gap-2">
            {allVocab.map((word) => (
              <span key={word} className="rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700">
                {word}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Save status */}
      {isSaving && <div className="mb-4 text-center text-sm text-slate-500">Zapisywanie postępu...</div>}
      {saveError && <div className="mb-4 text-center text-sm text-red-600">{saveError}</div>}

      {/* Navigation buttons */}
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={onRetry}
          className="w-full rounded-xl bg-indigo-600 py-3 font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
        >
          Powtórz lekcję
        </button>
        <a
          href={`/english/${level}`}
          className="block w-full rounded-xl border border-slate-300 bg-white py-3 text-center font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          Wróć do listy lekcji
        </a>
        <a
          href="/english"
          className="block w-full py-3 text-center text-sm text-slate-500 transition-colors hover:text-slate-700"
        >
          Wybór poziomu
        </a>
      </div>
    </div>
  );
};

export default LessonSummary;
