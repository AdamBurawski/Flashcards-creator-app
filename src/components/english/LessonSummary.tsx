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
    if (pct >= 60) return { color: "text-yellow-600", bg: "bg-yellow-50", label: "Dobra robota! 👍" };
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
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${scoreInfo.bg} mb-4`}>
          <span className={`text-4xl font-bold ${scoreInfo.color}`}>{score}%</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Podsumowanie lekcji</h2>
        <p className={`text-lg font-medium ${scoreInfo.color}`}>{scoreInfo.label}</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">
            {correctTurns}/{totalTurns}
          </div>
          <div className="text-xs text-gray-500 mt-1">Poprawne odpowiedzi</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{formatDuration(durationSeconds)}</div>
          <div className="text-xs text-gray-500 mt-1">Czas sesji</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{dialogues.length}</div>
          <div className="text-xs text-gray-500 mt-1">Dialogi</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>Postęp</span>
          <span>{score}%</span>
        </div>
        <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              score >= 80 ? "bg-green-500" : score >= 60 ? "bg-yellow-500" : "bg-orange-500"
            }`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      {/* Vocabulary list */}
      {allVocab.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Przerobione słownictwo:</h3>
          <div className="flex flex-wrap gap-2">
            {allVocab.map((word) => (
              <span key={word} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                {word}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Save status */}
      {isSaving && <div className="text-center text-sm text-gray-500 mb-4">Zapisywanie postępu...</div>}
      {saveError && <div className="text-center text-sm text-red-600 mb-4">{saveError}</div>}

      {/* Navigation buttons */}
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={onRetry}
          className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium
            hover:bg-blue-700 transition-colors"
        >
          Powtórz lekcję
        </button>
        <a
          href={`/english/${level}`}
          className="w-full py-3 bg-white border border-gray-300 text-gray-700 rounded-xl font-medium
            hover:bg-gray-50 transition-colors text-center block"
        >
          Wróć do listy lekcji
        </a>
        <a
          href="/english"
          className="w-full py-3 text-gray-500 text-sm text-center hover:text-gray-700 transition-colors block"
        >
          Wybór poziomu
        </a>
      </div>
    </div>
  );
};

export default LessonSummary;
