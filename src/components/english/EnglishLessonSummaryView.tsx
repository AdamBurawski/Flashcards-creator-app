import { useEffect, useState } from "react";
import type { CEFRLevel, EnglishDialogue } from "../../types/english";
import LessonSummary from "./LessonSummary";

interface EnglishLessonSummaryViewProps {
  level: CEFRLevel;
  stage: number;
  lesson: number;
}

interface LessonSummaryApiResponse {
  level: CEFRLevel;
  stage: number;
  lesson: number;
  correct_turns: number;
  total_turns: number;
  duration_seconds: number;
  dialogues: EnglishDialogue[];
}

export default function EnglishLessonSummaryView({ level, stage, lesson }: EnglishLessonSummaryViewProps) {
  const [data, setData] = useState<LessonSummaryApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadSummary = async () => {
      try {
        const response = await fetch(`/api/english/lessons/${lesson}/summary?level=${level}&stage=${stage}`);
        if (!response.ok) {
          const responseData = await response.json();
          throw new Error(responseData.error ?? "Nie udało się pobrać podsumowania");
        }

        const responseData: LessonSummaryApiResponse = await response.json();
        if (!cancelled) {
          setData(responseData);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Wystąpił nieznany błąd";
        if (!cancelled) {
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadSummary();
    return () => {
      cancelled = true;
    };
  }, [level, stage, lesson]);

  if (isLoading) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center px-4 py-10">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
          <p className="text-sm text-slate-600">Ładowanie podsumowania...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="font-medium text-red-700">{error ?? "Nie udało się wczytać podsumowania lekcji"}</p>
        <a
          href={`/english/${level}`}
          className="mt-4 inline-block rounded-lg bg-white px-4 py-2 text-sm font-medium text-red-700 ring-1 ring-red-200 transition-colors hover:bg-red-100"
        >
          Wróć do listy lekcji
        </a>
      </div>
    );
  }

  const firstDialogueId = data.dialogues[0]?.id;
  const retryUrl = firstDialogueId
    ? `/english/lesson/${level}/${stage}/${lesson}?dialogueId=${encodeURIComponent(firstDialogueId)}`
    : `/english/${level}`;

  return (
    <LessonSummary
      correctTurns={data.correct_turns}
      totalTurns={data.total_turns}
      durationSeconds={data.duration_seconds}
      dialogues={data.dialogues}
      level={level}
      stage={stage}
      lesson={lesson}
      saveProgressOnMount={false}
      onRetry={() => {
        window.location.href = retryUrl;
      }}
    />
  );
}
