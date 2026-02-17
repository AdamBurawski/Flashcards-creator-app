import React, { useState } from "react";
import AudioPlayer from "./AudioPlayer";

interface TeacherBubbleProps {
  /** Teacher's question/statement text */
  text: string;
  /** Optional hint text */
  hint?: string;
  /** Dialogue ID used to resolve the local image path */
  dialogueId?: string;
  /** Optional override image URL (e.g. from DB or external source) */
  imageUrl?: string;
  /** Audio URLs for the teacher's turn */
  audio?: {
    question?: string;
    question_repeat?: string;
    hint?: string;
  };
  /** Current sub-phase: question, repeat, or hint */
  subPhase: "question" | "repeat" | "hint";
  /** Called when all audio in this phase finishes */
  onAudioComplete: () => void;
  /** Whether this is an active (current) bubble */
  isActive: boolean;
}

/** Resolve image source: explicit URL takes priority, then local asset by dialogue ID */
function resolveImageSrc(dialogueId?: string, imageUrl?: string): string | null {
  if (imageUrl) return imageUrl;
  if (dialogueId) return `/images/english/${dialogueId}.webp`;
  return null;
}

/**
 * Displays a teacher speech bubble with text, optional image, and audio playback.
 * Handles sequential playback: question → repeat → hint.
 */
const TeacherBubble: React.FC<TeacherBubbleProps> = ({
  text,
  hint,
  dialogueId,
  imageUrl,
  audio,
  subPhase,
  onAudioComplete,
  isActive,
}) => {
  const showHint = subPhase === "hint" && hint;
  const [imageError, setImageError] = useState(false);

  const imageSrc = resolveImageSrc(dialogueId, imageUrl);

  return (
    <div className={`flex items-start gap-3 mb-4 ${isActive ? "opacity-100" : "opacity-60"}`}>
      {/* Teacher avatar */}
      <div className="flex-shrink-0 w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
        <span className="text-lg" role="img" aria-label="Nauczyciel">
          🎓
        </span>
      </div>

      {/* Bubble content */}
      <div className="flex-1 max-w-lg">
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl rounded-tl-sm px-4 py-3">
          {/* Dialogue image — visual context */}
          {imageSrc && !imageError && (
            <div className="mb-3 -mx-1 -mt-1">
              <img
                src={imageSrc}
                alt="Kontekst wizualny dialogu"
                className="w-full max-h-48 object-contain rounded-xl bg-white"
                onError={() => setImageError(true)}
                loading="lazy"
              />
            </div>
          )}

          <p className="text-gray-800 text-base leading-relaxed">{text}</p>

          {showHint && <p className="mt-2 text-indigo-600 text-sm italic border-t border-indigo-100 pt-2">💡 {hint}</p>}
        </div>

        {/* Audio player */}
        {isActive && (
          <div className="mt-1 ml-1">
            <AudioPlayer
              src={
                subPhase === "question" ? audio?.question : subPhase === "repeat" ? audio?.question_repeat : audio?.hint
              }
              fallbackText={subPhase === "hint" && hint ? hint : text}
              fallbackLang="en-US"
              autoPlay={true}
              onEnded={onAudioComplete}
              showControls={true}
            />
          </div>
        )}

        {/* Phase indicator */}
        {isActive && (
          <div className="mt-1 ml-1">
            <span className="text-xs text-gray-400">
              {subPhase === "question" && "Posłuchaj pytania..."}
              {subPhase === "repeat" && "Posłuchaj raz jeszcze..."}
              {subPhase === "hint" && "Podpowiedź:"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherBubble;
