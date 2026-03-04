import React, { useRef, useCallback, useEffect, useState } from "react";
import AudioPlayer from "./AudioPlayer";
import type { DialogueIntro } from "../../types/english";

interface IntroNarratorProps {
  intro: DialogueIntro;
  imageUrl?: string;
  dialogueId?: string;
  /** Called when narration audio ends or user clicks "Dalej" */
  onComplete: () => void;
}

function resolveImageSrc(dialogueId?: string, imageUrl?: string): string | null {
  if (imageUrl) return imageUrl;
  if (dialogueId) return `/images/english/${dialogueId}.webp`;
  return null;
}

/**
 * Shows a Polish context narration + optional image before the exercise begins.
 * Fetches ElevenLabs TTS audio from the server; falls back to browser TTS if unavailable.
 */
const IntroNarrator: React.FC<IntroNarratorProps> = ({ intro, imageUrl, dialogueId, onComplete }) => {
  const completedRef = useRef(false);
  const [imageError, setImageError] = useState(false);
  const [audioSrc, setAudioSrc] = useState<string | undefined>(intro.narrator_audio_url);
  const [audioReady, setAudioReady] = useState(!!intro.narrator_audio_url);

  const handleComplete = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    onComplete();
  }, [onComplete]);

  // Fetch ElevenLabs narrator audio from server (unless pre-baked URL already exists)
  useEffect(() => {
    if (intro.narrator_audio_url) {
      setAudioSrc(intro.narrator_audio_url);
      setAudioReady(true);
      return;
    }

    let cancelled = false;

    async function fetchNarratorAudio() {
      try {
        const response = await fetch("/api/english/narrator-audio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: intro.narrator_pl }),
        });

        if (cancelled) return;

        if (response.ok) {
          const data = await response.json();
          setAudioSrc(data.audio_url);
        }
        // 204 = no ElevenLabs configured → fall back to browser TTS (audioSrc stays undefined)
      } catch {
        // Network error → fall back to browser TTS
      } finally {
        if (!cancelled) setAudioReady(true);
      }
    }

    fetchNarratorAudio();
    return () => {
      cancelled = true;
    };
  }, [intro.narrator_audio_url, intro.narrator_pl]);

  const imageSrc = resolveImageSrc(dialogueId, imageUrl);

  return (
    <div className="flex flex-col items-center gap-5 py-8 px-4 max-w-lg mx-auto w-full">
      {/* Label */}
      <div className="flex items-center gap-2">
        <span className="text-xl">📖</span>
        <span className="text-sm font-semibold text-amber-700 uppercase tracking-wider">Wstęp do ćwiczenia</span>
      </div>

      {/* Context image */}
      {imageSrc && !imageError && (
        <div className="w-full rounded-2xl overflow-hidden border border-gray-200 bg-white shadow-sm">
          <img
            src={imageSrc}
            alt="Kontekst wizualny"
            className="w-full max-h-56 object-contain"
            onError={() => setImageError(true)}
            loading="lazy"
          />
        </div>
      )}

      {/* Narration bubble */}
      <div className="w-full bg-amber-50 border-2 border-amber-200 rounded-2xl px-5 py-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl flex-shrink-0" role="img" aria-label="Narrator">
            🎙️
          </span>
          <p className="text-gray-800 text-base leading-relaxed">{intro.narrator_pl}</p>
        </div>

        <div className="mt-3 ml-10">
          {!audioReady ? (
            <div className="flex items-center gap-2 text-amber-600 text-xs">
              <div className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
              Przygotowuję narrację...
            </div>
          ) : (
            <>
              <AudioPlayer
                src={audioSrc}
                fallbackText={intro.narrator_pl}
                fallbackLang="pl-PL"
                autoPlay={true}
                onEnded={handleComplete}
                showControls={true}
              />
              <p className="text-xs text-amber-600 mt-1">Posłuchaj opisu sytuacji...</p>
            </>
          )}
        </div>
      </div>

      {/* Manual "Continue" button */}
      <button
        type="button"
        onClick={handleComplete}
        className="px-8 py-3 bg-amber-500 text-white font-semibold rounded-xl
          hover:bg-amber-600 active:bg-amber-700 transition-colors shadow-sm"
      >
        Dalej →
      </button>
    </div>
  );
};

export default IntroNarrator;
