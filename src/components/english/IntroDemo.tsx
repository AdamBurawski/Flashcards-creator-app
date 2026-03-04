import React, { useState, useCallback, useEffect, useRef } from "react";
import AudioPlayer from "./AudioPlayer";
import type { IntroDemoTurn } from "../../types/english";

interface IntroDemoProps {
  demo: IntroDemoTurn[];
  /** Called when user clicks "Zaczynamy!" after all turns are shown */
  onFinish: () => void;
}

async function fetchTeacherAudio(text: string): Promise<string | undefined> {
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

/**
 * Plays through a modelled demo dialogue turn by turn.
 * Each turn plays EN audio first, then the PL translation audio.
 * After all turns finish, a "Zaczynamy!" button appears.
 */
const IntroDemo: React.FC<IntroDemoProps> = ({ demo, onFinish }) => {
  const [visibleCount, setVisibleCount] = useState(0);
  // How many turns have their PL translation text revealed
  const [plRevealedCount, setPlRevealedCount] = useState(0);
  // Audio phase for the currently active turn
  const [activePhase, setActivePhase] = useState<"en" | "pl">("en");
  const [enAudioCache, setEnAudioCache] = useState<Record<number, string | null>>({});
  const [plAudioCache, setPlAudioCache] = useState<Record<number, string | null>>({});
  const [isAllDone, setIsAllDone] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showNext = useCallback(() => {
    setActivePhase("en");
    setVisibleCount((prev) => Math.min(prev + 1, demo.length));
  }, [demo.length]);

  // Reveal first turn after a short delay on mount
  useEffect(() => {
    timerRef.current = setTimeout(showNext, 600);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [showNext]);

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
      // Reveal PL text and switch to PL audio phase
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

  const enAudioReady = activeIdx < 0 || !demo[activeIdx] || !!demo[activeIdx].audio_url || activeIdx in enAudioCache;

  const plAudioReady =
    activePhase !== "pl" ||
    !demo[activeIdx]?.translation_pl ||
    !!demo[activeIdx].translation_audio_url ||
    activeIdx in plAudioCache;

  const allVisible = visibleCount >= demo.length;

  return (
    <div className="flex flex-col gap-4 py-6 px-4 max-w-lg mx-auto w-full">
      {/* Label */}
      <div className="flex items-center gap-2 justify-center">
        <span className="text-xl">🎬</span>
        <span className="text-sm font-semibold text-indigo-600 uppercase tracking-wider">Przykładowa rozmowa</span>
      </div>

      {/* Animated turn bubbles */}
      <div className="space-y-3 min-h-[120px]">
        {demo.slice(0, visibleCount).map((turn, idx) => {
          const isTeacher = turn.role === "teacher";
          const isActive = idx === activeIdx && !isAllDone;
          const enSrc = turn.audio_url ?? enAudioCache[idx] ?? undefined;
          const plSrc = turn.translation_audio_url ?? plAudioCache[idx] ?? undefined;
          const showPl = idx < plRevealedCount && !!turn.translation_pl;

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
                  className={`max-w-xs rounded-2xl px-4 py-2.5 shadow-sm
                    ${
                      isTeacher
                        ? "bg-indigo-50 border border-indigo-100 rounded-bl-sm"
                        : "bg-green-50 border border-green-100 rounded-br-sm"
                    }`}
                >
                  <p className="text-gray-800 text-base leading-snug">{turn.text}</p>

                  {/* EN AudioPlayer — auto-plays for active turn in "en" phase */}
                  {isActive && activePhase === "en" && enAudioReady && (
                    <AudioPlayer
                      src={enSrc}
                      fallbackText={turn.text}
                      fallbackLang="en-US"
                      autoPlay={true}
                      onEnded={handleEnAudioEnd}
                      showControls={false}
                    />
                  )}
                </div>

                {/* PL translation row — fades in after EN plays */}
                {showPl && (
                  <div
                    className={`max-w-xs rounded-xl px-4 py-1.5 bg-amber-50 border border-amber-100
                      animate-[fadeIn_0.4s_ease-in]`}
                  >
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
                        autoPlay={true}
                        onEnded={handlePlAudioEnd}
                        showControls={false}
                      />
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
            <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
              <span className="text-base">{demo[visibleCount]?.role === "teacher" ? "🎓" : "👦"}</span>
            </div>
            {!enAudioReady ? (
              <div className="bg-gray-100 rounded-2xl px-4 py-3 flex items-center gap-2">
                <div className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-gray-400">...</span>
              </div>
            ) : (
              <div className="bg-gray-100 rounded-2xl px-4 py-3 flex gap-1 items-center">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
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
            className="px-10 py-3.5 bg-green-600 text-white font-bold text-lg rounded-2xl
              hover:bg-green-700 active:bg-green-800 transition-colors shadow-md
              animate-[fadeIn_0.4s_ease-in]"
          >
            Zaczynamy! 🚀
          </button>
        </div>
      )}
    </div>
  );
};

export default IntroDemo;
