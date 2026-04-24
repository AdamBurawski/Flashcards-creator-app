import React, { useState, useEffect } from "react";
import AudioPlayer from "./AudioPlayer";
import ReplayButton from "./ReplayButton";
import type { IntroDemoTurn } from "../../types/english";
import { SYSTEM_TTS_VOICE_PREFERENCES, USE_SYSTEM_TTS_ONLY } from "../../lib/audio-settings";

interface TeacherBubbleProps {
  /** Teacher's question/statement text */
  text: string;
  /** Optional hint text */
  hint?: string;
  /** Dialogue ID used to resolve the local image path */
  dialogueId?: string;
  /** Optional override image URL (e.g. from DB or external source) */
  imageUrl?: string;
  /** Whether dialogue image should be rendered in this bubble */
  showImage?: boolean;
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
  /**
   * Matching demo pair (teacher + peer turns) for this question.
   * When provided, a "Przypomnij" toggle appears below the question.
   */
  demoPair?: IntroDemoTurn[];
}

/** Resolve image source: explicit URL takes priority, then local asset by dialogue ID */
function resolveImageSrc(dialogueId?: string, imageUrl?: string): string | null {
  // Prefer local asset mapped by dialogue ID to avoid DB placeholder URLs.
  if (dialogueId) return `/images/english/${dialogueId}.webp`;
  if (imageUrl && !imageUrl.includes("placehold.co")) return imageUrl;
  return null;
}

async function fetchTeacherAudio(text: string): Promise<string | undefined> {
  if (USE_SYSTEM_TTS_ONLY) return undefined;
  try {
    const res = await fetch("/api/english/teacher-audio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) return undefined;
    const data = await res.json();
    return data.audio_url as string | undefined;
  } catch {
    return undefined;
  }
}

async function fetchNarratorAudio(text: string): Promise<string | undefined> {
  if (USE_SYSTEM_TTS_ONLY) return undefined;
  try {
    const res = await fetch("/api/english/narrator-audio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) return undefined;
    const data = await res.json();
    return data.audio_url as string | undefined;
  } catch {
    return undefined;
  }
}

// ── Inline demo pair hint ──────────────────────────────────────────────────────

interface DemoPairHintProps {
  pair: IntroDemoTurn[];
}

const DemoPairHint: React.FC<DemoPairHintProps> = ({ pair }) => {
  const [enAudioCache, setEnAudioCache] = useState<Record<number, string | null>>({});
  const [plAudioCache, setPlAudioCache] = useState<Record<number, string | null>>({});

  // Fetch all audio on first mount
  useEffect(() => {
    pair.forEach((turn, idx) => {
      if (!turn.audio_url) {
        fetchTeacherAudio(turn.text).then((url) => {
          setEnAudioCache((prev) => ({ ...prev, [idx]: url ?? null }));
        });
      }
      if (turn.translation_pl && !turn.translation_audio_url) {
        fetchNarratorAudio(turn.translation_pl).then((url) => {
          setPlAudioCache((prev) => ({ ...prev, [idx]: url ?? null }));
        });
      }
    });
  }, [pair]);

  return (
    <div className="mt-2 space-y-2.5 rounded-2xl border border-amber-200 bg-amber-50/40 px-3 py-2.5">
      {pair.map((turn, idx) => {
        const isTeacher = turn.role === "teacher";
        const enSrc = turn.audio_url ?? enAudioCache[idx] ?? undefined;
        const plSrc = turn.translation_audio_url ?? plAudioCache[idx] ?? undefined;

        return (
          <div key={idx} className={`flex items-start gap-2 ${isTeacher ? "" : "flex-row-reverse"}`}>
            <span className="text-sm flex-shrink-0 mt-0.5">{isTeacher ? "🎓" : "👦"}</span>
            <div className={`flex flex-col gap-1 ${isTeacher ? "items-start" : "items-end"}`}>
              {/* EN bubble */}
              <div
                className={`rounded-xl px-3 py-1.5 text-sm ${
                  isTeacher
                    ? "rounded-bl-sm border border-blue-200 bg-blue-100 text-blue-900"
                    : "rounded-br-sm border border-amber-200 bg-amber-100 text-amber-900"
                }`}
              >
                <p className="leading-snug">{turn.text}</p>
                <div className={`mt-1 flex ${isTeacher ? "justify-start" : "justify-end"}`}>
                  <ReplayButton
                    text={turn.text}
                    lang="en-US"
                    audioSrc={enSrc}
                    label="EN"
                    preferredVoiceNames={
                      isTeacher ? SYSTEM_TTS_VOICE_PREFERENCES.enTeacher : SYSTEM_TTS_VOICE_PREFERENCES.enPeer
                    }
                  />
                </div>
              </div>

              {/* PL translation */}
              {turn.translation_pl && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-1 text-xs text-amber-800">
                  <p className="italic leading-snug">{turn.translation_pl}</p>
                  <div className={`mt-1 flex ${isTeacher ? "justify-start" : "justify-end"}`}>
                    <ReplayButton
                      text={turn.translation_pl}
                      lang="pl-PL"
                      audioSrc={plSrc}
                      label="PL"
                      preferredVoiceNames={SYSTEM_TTS_VOICE_PREFERENCES.plNarrator}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

/**
 * Displays a teacher speech bubble with text, optional image, and audio playback.
 * Handles sequential playback: question → repeat → hint.
 * When no pre-generated audio is provided, fetches ElevenLabs EN TTS on demand.
 * When `demoPair` is provided, shows a "Przypomnij" toggle to reveal the matching
 * example exchange inline below the question.
 */
const TeacherBubble: React.FC<TeacherBubbleProps> = ({
  text,
  hint,
  dialogueId,
  imageUrl,
  showImage = true,
  audio,
  subPhase,
  onAudioComplete,
  isActive,
  demoPair,
}) => {
  const showHint = subPhase === "hint" && hint;
  const [imageError, setImageError] = useState(false);

  // ElevenLabs audio fetched on demand when no pre-generated audio exists
  const [elAudio, setElAudio] = useState<{ text?: string; hint?: string }>({});
  const [audioReady, setAudioReady] = useState(false);

  // Demo pair toggle — once opened, keep DemoPairHint mounted to preserve audio cache
  const [showDemoHint, setShowDemoHint] = useState(false);
  const [demoHintEverOpened, setDemoHintEverOpened] = useState(false);

  useEffect(() => {
    if (!isActive) return;

    if (USE_SYSTEM_TTS_ONLY) {
      setAudioReady(true);
      setElAudio({});
      return;
    }

    // Pre-generated audio available — no need to fetch
    if (audio?.question) {
      setAudioReady(true);
      return;
    }

    let cancelled = false;
    setAudioReady(false);

    async function load() {
      const [textAudio, hintAudio] = await Promise.all([
        fetchTeacherAudio(text),
        hint ? fetchTeacherAudio(hint) : Promise.resolve(undefined),
      ]);
      if (cancelled) return;
      setElAudio({ text: textAudio, hint: hintAudio });
      setAudioReady(true);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [isActive, text, hint, audio?.question]);

  const resolvedSrc =
    subPhase === "question"
      ? (audio?.question ?? elAudio.text)
      : subPhase === "repeat"
        ? (audio?.question_repeat ?? elAudio.text)
        : (audio?.hint ?? elAudio.hint);

  const imageSrc = resolveImageSrc(dialogueId, imageUrl);

  const handleToggleDemoHint = () => {
    if (!demoHintEverOpened) setDemoHintEverOpened(true);
    setShowDemoHint((prev) => !prev);
  };

  return (
    <div className={`mb-4 flex items-start gap-3 transition-opacity ${isActive ? "opacity-100" : "opacity-80"}`}>
      {/* Teacher avatar */}
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-amber-200 bg-amber-50 shadow-sm">
        <span className="text-lg" role="img" aria-label="Nauczyciel">
          🎓
        </span>
      </div>

      {/* Bubble content */}
      <div className="flex-1 max-w-4xl">
        <div className="rounded-3xl rounded-tl-sm border border-amber-200 bg-white px-4 py-3 shadow-sm">
          {/* Dialogue image — visual context */}
          {showImage && imageSrc && !imageError && (
            <div className="-mx-1 -mt-1 mb-3 flex justify-center">
              <img
                src={imageSrc}
                alt="Kontekst wizualny dialogu"
                className="max-h-[520px] w-full max-w-3xl rounded-xl border border-slate-200 bg-slate-50 object-contain"
                onError={() => setImageError(true)}
                loading="lazy"
              />
            </div>
          )}

          <p className="text-base leading-relaxed text-slate-800">{text}</p>

          {showHint && <p className="mt-2 border-t border-amber-200 pt-2 text-sm italic text-amber-800">💡 {hint}</p>}

          {/* "Przypomnij" toggle button */}
          {demoPair && demoPair.length > 0 && (
            <div className="mt-2.5 border-t border-amber-200 pt-2">
              <button
                type="button"
                onClick={handleToggleDemoHint}
                className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-semibold shadow-sm transition-all ${
                  showDemoHint
                    ? "border border-amber-200 bg-amber-100 text-amber-800 hover:bg-amber-200"
                    : "border border-amber-200 bg-white text-slate-700 hover:bg-amber-50"
                }`}
              >
                <span>{showDemoHint ? "✕" : "💡"}</span>
                <span>{showDemoHint ? "Zamknij" : "Przypomnij"}</span>
              </button>

              {/* Keep mounted after first open to preserve audio cache */}
              {demoHintEverOpened && (
                <div className={showDemoHint ? "" : "hidden"}>
                  <DemoPairHint pair={demoPair} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Audio player — shown after audio is ready */}
        {isActive && (
          <div className="mt-1 ml-1">
            {!audioReady ? (
              <div className="flex items-center gap-2 py-1">
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
                <span className="text-xs text-slate-400">Przygotowuję audio...</span>
              </div>
            ) : (
              <AudioPlayer
                src={resolvedSrc}
                fallbackText={subPhase === "hint" && hint ? hint : text}
                fallbackLang="en-US"
                preferredVoiceNames={SYSTEM_TTS_VOICE_PREFERENCES.enTeacher}
                autoPlay={true}
                onEnded={onAudioComplete}
                showControls={true}
              />
            )}
          </div>
        )}

        {/* Phase indicator */}
        {isActive && audioReady && (
          <div className="mt-1 ml-1">
            <span className="text-xs text-slate-400">
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
