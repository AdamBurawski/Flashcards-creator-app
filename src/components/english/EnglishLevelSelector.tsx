import { useEffect, useState } from "react";
import type { LevelSummary, CEFRLevel } from "../../types/english";

/** Color and label config for each CEFR level */
const LEVEL_CONFIG: Record<CEFRLevel, { label: string; description: string; color: string; bgColor: string }> = {
  A1: {
    label: "A1 – Beginner",
    description: "Podstawowe zwroty, powitania, proste pytania",
    color: "text-emerald-700",
    bgColor: "bg-emerald-50 border-emerald-200 hover:border-emerald-400",
  },
  A2: {
    label: "A2 – Elementary",
    description: "Codzienne sytuacje, zakupy, podróże",
    color: "text-blue-700",
    bgColor: "bg-blue-50 border-blue-200 hover:border-blue-400",
  },
  B1: {
    label: "B1 – Intermediate",
    description: "Opinie, plany, doświadczenia",
    color: "text-violet-700",
    bgColor: "bg-violet-50 border-violet-200 hover:border-violet-400",
  },
  B2: {
    label: "B2 – Upper-Intermediate",
    description: "Dyskusje, argumentacja, złożone tematy",
    color: "text-orange-700",
    bgColor: "bg-orange-50 border-orange-200 hover:border-orange-400",
  },
};

/** Progress bar color based on CEFR level */
const PROGRESS_COLORS: Record<CEFRLevel, string> = {
  A1: "bg-emerald-500",
  A2: "bg-blue-500",
  B1: "bg-violet-500",
  B2: "bg-orange-500",
};

export default function EnglishLevelSelector() {
  const [levels, setLevels] = useState<LevelSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLevels = async () => {
      try {
        const response = await fetch("/api/english/levels");
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Nie udało się pobrać poziomów");
        }
        const data = await response.json();
        setLevels(data.levels ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Wystąpił nieznany błąd");
      } finally {
        setIsLoading(false);
      }
    };

    fetchLevels();
  }, []);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {(["A1", "A2", "B1", "B2"] as CEFRLevel[]).map((level) => (
          <div key={level} className="border rounded-xl p-6 animate-pulse bg-gray-50">
            <div className="h-6 bg-gray-200 rounded w-1/2 mb-3" />
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-4" />
            <div className="h-2 bg-gray-200 rounded w-full mb-2" />
            <div className="h-4 bg-gray-200 rounded w-1/3" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-red-700 font-medium">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-3 text-sm text-red-600 underline hover:text-red-800"
        >
          Spróbuj ponownie
        </button>
      </div>
    );
  }

  // If API returns no levels, show all 4 with zero progress
  const displayLevels: LevelSummary[] =
    levels.length > 0
      ? levels
      : (["A1", "A2", "B1", "B2"] as CEFRLevel[]).map((level) => ({
          level,
          total_lessons: 0,
          total_dialogues: 0,
          completed_dialogues: 0,
          completion_percent: 0,
        }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {displayLevels.map((levelData) => {
        const config = LEVEL_CONFIG[levelData.level];
        const progressColor = PROGRESS_COLORS[levelData.level];
        const hasContent = levelData.total_dialogues > 0;

        return (
          <a
            key={levelData.level}
            href={hasContent ? `/english/${levelData.level}` : undefined}
            className={`block border rounded-xl p-6 transition-all duration-200 ${
              hasContent ? `${config.bgColor} cursor-pointer shadow-sm hover:shadow-md` : "bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed"
            }`}
            onClick={(e) => {
              if (!hasContent) e.preventDefault();
            }}
          >
            {/* Level badge and title */}
            <div className="flex items-center justify-between mb-2">
              <h2 className={`text-xl font-bold ${hasContent ? config.color : "text-gray-400"}`}>{config.label}</h2>
              {levelData.completion_percent === 100 && levelData.total_dialogues > 0 && (
                <span className="text-green-600 text-lg" title="Ukończono">
                  ✓
                </span>
              )}
            </div>

            {/* Description */}
            <p className={`text-sm mb-4 ${hasContent ? "text-gray-600" : "text-gray-400"}`}>{config.description}</p>

            {/* Progress bar */}
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
              <div
                className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
                style={{ width: `${levelData.completion_percent}%` }}
              />
            </div>

            {/* Stats */}
            <div className="flex justify-between text-xs text-gray-500">
              <span>
                {levelData.completed_dialogues} / {levelData.total_dialogues} dialogów
              </span>
              <span>{Math.round(levelData.completion_percent)}%</span>
            </div>

            {/* Lesson count */}
            {hasContent && (
              <p className="mt-3 text-xs text-gray-500">{levelData.total_lessons} lekcji dostępnych</p>
            )}

            {/* Empty state */}
            {!hasContent && <p className="mt-3 text-xs text-gray-400 italic">Brak dostępnych lekcji</p>}
          </a>
        );
      })}
    </div>
  );
}
