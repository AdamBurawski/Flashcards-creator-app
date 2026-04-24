import { useEffect, useState } from "react";
import type { CEFRLevel, LessonOverview, DialogueOverview } from "../../types/english";

interface EnglishLessonListProps {
  level: CEFRLevel;
}

/** Format seconds to "Xm" display */
function formatDuration(seconds: number): string {
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} min`;
}

export default function EnglishLessonList({ level }: EnglishLessonListProps) {
  const [lessons, setLessons] = useState<LessonOverview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLessons = async () => {
      try {
        const response = await fetch(`/api/english/lessons?level=${level}`);
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Nie udało się pobrać lekcji");
        }
        const data = await response.json();
        setLessons(data.lessons ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Wystąpił nieznany błąd");
      } finally {
        setIsLoading(false);
      }
    };

    fetchLessons();
  }, [level]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm">
            <div className="mb-4 h-6 w-1/3 rounded bg-slate-200" />
            <div className="space-y-3">
              <div className="h-16 rounded bg-slate-200" />
              <div className="h-16 rounded bg-slate-200" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center shadow-sm">
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

  if (lessons.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white/80 p-10 text-center shadow-sm">
        <p className="text-gray-500 text-lg">Brak dostępnych lekcji dla poziomu {level}</p>
        <a href="/english" className="mt-3 inline-block text-sm text-blue-600 underline hover:text-blue-800">
          Wróć do wyboru poziomu
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {lessons.map((lesson) => (
        <LessonCard key={`${lesson.stage}-${lesson.lesson}`} lesson={lesson} level={level} />
      ))}
    </div>
  );
}

// ============================================
// LessonCard component
// ============================================

interface LessonCardProps {
  lesson: LessonOverview;
  level: CEFRLevel;
}

function LessonCard({ lesson, level }: LessonCardProps) {
  const completionPercent =
    lesson.total_dialogues > 0 ? (lesson.completed_dialogues / lesson.total_dialogues) * 100 : 0;
  const isFullyCompleted = lesson.completed_dialogues === lesson.total_dialogues && lesson.total_dialogues > 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-sm">
      {/* Lesson header */}
      <div className="border-b border-slate-200/70 bg-slate-50/70 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-slate-900">
              Lekcja {lesson.lesson}
              {lesson.stage > 1 && (
                <span className="ml-2 text-sm font-normal text-slate-500">(Etap {lesson.stage})</span>
              )}
            </h2>
            {isFullyCompleted && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                ✓ Ukończona
              </span>
            )}
          </div>
          <span className="text-sm text-slate-500">
            {lesson.completed_dialogues}/{lesson.total_dialogues} dialogów
          </span>
        </div>

        {/* Progress bar */}
        {lesson.total_dialogues > 0 && (
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${completionPercent}%` }}
            />
          </div>
        )}
      </div>

      {/* Dialogues list */}
      <div className="divide-y divide-slate-100">
        {lesson.dialogues.map((dialogue) => (
          <DialogueRow
            key={dialogue.id}
            dialogue={dialogue}
            level={level}
            stage={lesson.stage}
            lesson={lesson.lesson}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================
// DialogueRow component
// ============================================

interface DialogueRowProps {
  dialogue: DialogueOverview;
  level: CEFRLevel;
  stage: number;
  lesson: number;
}

function DialogueRow({ dialogue, level, stage, lesson }: DialogueRowProps) {
  const lessonUrl = `/english/lesson/${level}/${stage}/${lesson}?dialogueId=${encodeURIComponent(dialogue.id)}`;

  return (
    <a
      href={lessonUrl}
      className="group flex items-center justify-between px-6 py-4 transition-colors hover:bg-slate-50/70"
    >
      <div className="flex items-center gap-4 min-w-0">
        {/* Status icon */}
        <div className="flex-shrink-0">
          {dialogue.completed ? (
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center" title="Ukończony">
              <span className="text-green-600 text-sm">✓</span>
            </div>
          ) : (
            <div
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-blue-100"
              title="Do wykonania"
            >
              <span className="text-gray-400 group-hover:text-blue-500 text-sm">▶</span>
            </div>
          )}
        </div>

        {/* Title and tags */}
        <div className="min-w-0">
          <h3 className="truncate text-sm font-medium text-slate-900">{dialogue.title}</h3>
          {dialogue.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {dialogue.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="inline-block rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
                  {tag}
                </span>
              ))}
              {dialogue.tags.length > 3 && <span className="text-xs text-slate-400">+{dialogue.tags.length - 3}</span>}
            </div>
          )}
        </div>
      </div>

      {/* Right side: duration & score */}
      <div className="flex items-center gap-4 flex-shrink-0 ml-4">
        {/* Best score */}
        {dialogue.best_score !== null && (
          <span className="text-sm font-medium text-green-600">{Math.round(dialogue.best_score)}%</span>
        )}

        {/* Estimated time */}
        <span className="text-xs text-slate-400">{formatDuration(dialogue.estimated_duration_seconds)}</span>

        {/* Arrow */}
        <span className="text-slate-300 transition-colors group-hover:text-slate-500">→</span>
      </div>
    </a>
  );
}
