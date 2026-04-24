import React, { useState, useCallback, useEffect, useRef } from "react";
import AudioPlayer from "./AudioPlayer";
import ReplayButton from "./ReplayButton";
import type { IntroDemoTurn } from "../../types/english";
import { SYSTEM_TTS_VOICE_PREFERENCES, USE_SYSTEM_TTS_ONLY } from "../../lib/audio-settings";

interface IntroDemoProps {
  demo: IntroDemoTurn[];
  /** Called when user clicks the finish button after all turns are shown */
  onFinish: () => void;
  /**
   * When true the component skips sequential auto-play and opens directly
   * in the "all done" state — all bubbles visible with replay buttons ready.
   * Used when the child revisits the demo mid-exercise.
   */
  initiallyDone?: boolean;
  /** Label for the finish button. Defaults to "Zaczynamy! 🚀" */
  finishLabel?: string;
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

// ── Main component ────────────────────────────────────────────────────────────

/**
 * Plays through a modelled demo dialogue turn by turn.
 * Each turn plays EN audio first, then the PL translation audio.
 * Completed turns show replay buttons so the child can listen again.
 * After all turns finish, a "Zaczynamy!" button appears.
 */
const IntroDemo: React.FC<IntroDemoProps> = ({ demo, onFinish, initiallyDone = false, finishLabel }) => {
  const [visibleCount, setVisibleCount] = useState(initiallyDone ? demo.length : 0);
  // How many turns have their PL translation text revealed
  const [plRevealedCount, setPlRevealedCount] = useState(initiallyDone ? demo.length : 0);
  // Audio phase for the currently active turn
  const [activePhase, setActivePhase] = useState<"en" | "pl">("en");
  const [enAudioCache, setEnAudioCache] = useState<Record<number, string | null>>({});
  const [plAudioCache, setPlAudioCache] = useState<Record<number, string | null>>({});
  const [isAllDone, setIsAllDone] = useState(initiallyDone);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showNext = useCallback(() => {
    setActivePhase("en");
    setVisibleCount((prev) => Math.min(prev + 1, demo.length));
  }, [demo.length]);

  // Reveal first turn after a short delay on mount (skipped when initiallyDone)
  useEffect(() => {
    if (initiallyDone) return;
    timerRef.current = setTimeout(showNext, 600);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [showNext, initiallyDone]);

  // Pre-fetch all audio in the background when opening in initiallyDone mode
  useEffect(() => {
    if (!initiallyDone) return;
    demo.forEach((turn, idx) => {
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
  }, [initiallyDone, demo]);

  // Fetch EN audio when a new turn becomes visible
  useEffect(() => {
    if (visibleCount === 0) return;
    const idx = visibleCount - 1;
    const turn = demo[idx];
    if (!turn || idx in enAudioCache || turn.audio_url) return;

    let cancelled = false;
    fetchTeacherAudio(turn.text).then((url) => {
      if (!cancelled) setEnAudioCache((prev) => ({ ...prev, [idx]: url ?? null }));
    });
    return () => {
      cancelled = true;
    };
  }, [visibleCount, demo, enAudioCache]);

  // Fetch PL translation audio when entering "pl" phase
  useEffect(() => {
    if (activePhase !== "pl" || visibleCount === 0) return;
    const idx = visibleCount - 1;
    const turn = demo[idx];
    if (!turn?.translation_pl || idx in plAudioCache || turn.translation_audio_url) return;

    let cancelled = false;
    fetchNarratorAudio(turn.translation_pl).then((url) => {
      if (!cancelled) setPlAudioCache((prev) => ({ ...prev, [idx]: url ?? null }));
    });
    return () => {
      cancelled = true;
    };
  }, [activePhase, visibleCount, demo, plAudioCache]);

  const activeIdx = visibleCount - 1;

  const handleEnAudioEnd = useCallback(() => {
    const turn = demo[activeIdx];
    if (turn?.translation_pl) {
      setPlRevealedCount((prev) => Math.max(prev, activeIdx + 1));
      setActivePhase("pl");
    } else if (activeIdx >= demo.length - 1) {
      timerRef.current = setTimeout(() => setIsAllDone(true), 500);
    } else {
      timerRef.current = setTimeout(showNext, 500);
    }
  }, [activeIdx, demo, showNext]);

  const handlePlAudioEnd = useCallback(() => {
    if (activeIdx >= demo.length - 1) {
      timerRef.current = setTimeout(() => setIsAllDone(true), 600);
    } else {
      timerRef.current = setTimeout(showNext, 600);
    }
  }, [activeIdx, demo.length, showNext]);

  // EN audio has finished for turn idx (available for replay)
  const enPlayedForTurn = useCallback(
    (idx: number): boolean => isAllDone || idx < activeIdx || (idx === activeIdx && activePhase === "pl"),
    [isAllDone, activeIdx, activePhase]
  );

  // PL audio has finished for turn idx (available for replay)
  const plPlayedForTurn = useCallback(
    (idx: number): boolean => !!demo[idx]?.translation_pl && idx < plRevealedCount && (isAllDone || idx < activeIdx),
    [demo, plRevealedCount, isAllDone, activeIdx]
  );

  const enAudioReady = activeIdx < 0 || !demo[activeIdx] || !!demo[activeIdx].audio_url || activeIdx in enAudioCache;

  const plAudioReady =
    activePhase !== "pl" ||
    !demo[activeIdx]?.translation_pl ||
    !!demo[activeIdx].translation_audio_url ||
    activeIdx in plAudioCache;

  const allVisible = visibleCount >= demo.length;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6">
      {/* Label */}
      <div className="flex justify-center">
        <div className="flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5">
          <span className="text-xl">🎬</span>
          <span className="text-sm font-semibold uppercase tracking-wider text-amber-800">Przykładowa rozmowa</span>
        </div>
      </div>

      {/* Animated turn bubbles */}
      <div className="min-h-[120px] space-y-3">
        {demo.slice(0, visibleCount).map((turn, idx) => {
          const isTeacher = turn.role === "teacher";
          const isActive = idx === activeIdx && !isAllDone;
          const enSrc = turn.audio_url ?? enAudioCache[idx] ?? undefined;
          const plSrc = turn.translation_audio_url ?? plAudioCache[idx] ?? undefined;
          const showPl = idx < plRevealedCount && !!turn.translation_pl;
          const canReplayEn = enPlayedForTurn(idx);
          const canReplayPl = plPlayedForTurn(idx);

          return (
            <div
              key={idx}
              className={`flex items-start gap-3 ${isTeacher ? "" : "flex-row-reverse"} animate-[fadeIn_0.3s_ease-in]`}
            >
              {/* Avatar */}
              <div
                className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center mt-1
                  ${isTeacher ? "bg-indigo-100" : "bg-green-100"}`}
              >
                <span className="text-base" role="img" aria-label={isTeacher ? "Nauczyciel" : "Uczeń"}>
                  {isTeacher ? "🎓" : "👦"}
                </span>
              </div>

              {/* Bubble + PL translation stacked vertically */}
              <div className={`flex flex-col gap-1 ${isTeacher ? "items-start" : "items-end"}`}>
                {/* EN bubble */}
                <div
                  className={`max-w-sm rounded-3xl px-4 py-2.5 shadow-sm
                    ${
                      isTeacher
                        ? "rounded-bl-sm border border-blue-200 bg-blue-50/55"
                        : "rounded-br-sm border border-amber-200 bg-amber-50/55"
                    }`}
                >
                  <p className="text-base leading-snug text-slate-800">{turn.text}</p>

                  {/* EN AudioPlayer — auto-plays for active turn in "en" phase */}
                  {isActive && activePhase === "en" && enAudioReady && (
                    <AudioPlayer
                      src={enSrc}
                      fallbackText={turn.text}
                      fallbackLang="en-US"
                      preferredVoiceNames={
                        isTeacher ? SYSTEM_TTS_VOICE_PREFERENCES.enTeacher : SYSTEM_TTS_VOICE_PREFERENCES.enPeer
                      }
                      autoPlay={true}
                      onEnded={handleEnAudioEnd}
                      showControls={false}
                    />
                  )}

                  {/* EN replay button — appears after EN audio has played */}
                  {canReplayEn && (
                    <div className={`mt-1.5 flex ${isTeacher ? "justify-start" : "justify-end"}`}>
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
                  )}
                </div>

                {/* PL translation row — fades in after EN plays */}
                {showPl && (
                  <div className="max-w-sm animate-[fadeIn_0.4s_ease-in] rounded-2xl border border-amber-200 bg-amber-50 px-4 py-1.5">
                    <p className="text-amber-800 text-sm italic leading-snug">{turn.translation_pl}</p>

                    {/* PL loading spinner while fetching narrator audio */}
                    {isActive && activePhase === "pl" && !plAudioReady && (
                      <div className="mt-1">
                        <div className="w-2.5 h-2.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}

                    {/* PL AudioPlayer — auto-plays for active turn in "pl" phase */}
                    {isActive && activePhase === "pl" && plAudioReady && (
                      <AudioPlayer
                        src={plSrc}
                        fallbackText={turn.translation_pl ?? ""}
                        fallbackLang="pl-PL"
                        preferredVoiceNames={SYSTEM_TTS_VOICE_PREFERENCES.plNarrator}
                        autoPlay={true}
                        onEnded={handlePlAudioEnd}
                        showControls={false}
                      />
                    )}

                    {/* PL replay button — appears after PL audio has played */}
                    {canReplayPl && (
                      <div className={`mt-1.5 flex ${isTeacher ? "justify-start" : "justify-end"}`}>
                        <ReplayButton
                          text={turn.translation_pl ?? ""}
                          lang="pl-PL"
                          audioSrc={plSrc}
                          label="PL"
                          preferredVoiceNames={SYSTEM_TTS_VOICE_PREFERENCES.plNarrator}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Typing indicator for the upcoming next turn (shown during EN phase only) */}
        {!allVisible && visibleCount > 0 && activePhase === "en" && (
          <div
            className={`flex items-center gap-2 ${demo[visibleCount]?.role !== "teacher" ? "flex-row-reverse" : ""}`}
          >
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-slate-100">
              <span className="text-base">{demo[visibleCount]?.role === "teacher" ? "🎓" : "👦"}</span>
            </div>
            {!enAudioReady ? (
              <div className="flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-3">
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
                <span className="text-xs text-slate-400">...</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 rounded-2xl bg-slate-100 px-4 py-3">
                <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:0ms]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:150ms]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:300ms]" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* "Let's go!" button — appears only after all audio (including last PL) finishes */}
      {isAllDone && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={onFinish}
            className="rounded-2xl bg-blue-700 px-10 py-3.5 text-lg font-semibold text-white
              shadow-sm transition-colors hover:bg-blue-800
              animate-[fadeIn_0.4s_ease-in]"
          >
            {finishLabel ?? "Zaczynamy! 🚀"}
          </button>
        </div>
      )}
    </div>
  );
};

export default IntroDemo;
