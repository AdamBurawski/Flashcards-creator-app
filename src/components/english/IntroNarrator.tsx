import React, { useRef, useCallback, useEffect, useState } from "react";
import AudioPlayer from "./AudioPlayer";
import type { DialogueIntro } from "../../types/english";
import { SYSTEM_TTS_VOICE_PREFERENCES, USE_SYSTEM_TTS_ONLY } from "../../lib/audio-settings";

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
    if (USE_SYSTEM_TTS_ONLY) {
      setAudioSrc(undefined);
      setAudioReady(true);
      return;
    }

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
    <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-5 px-4 py-8">
      {/* Label */}
      <div className="flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1.5">
        <span className="text-xl">📖</span>
        <span className="text-sm font-semibold uppercase tracking-wider text-indigo-700">Wstęp do ćwiczenia</span>
      </div>

      {/* Context image */}
      {imageSrc && !imageError && (
        <div className="w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <img
            src={imageSrc}
            alt="Kontekst wizualny"
            className="mx-auto max-h-[560px] w-full object-contain"
            onError={() => setImageError(true)}
            loading="lazy"
          />
        </div>
      )}

      {/* Narration bubble */}
      <div className="w-full rounded-3xl border border-amber-200 bg-gradient-to-b from-amber-50/80 to-white px-5 py-4 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="text-2xl flex-shrink-0" role="img" aria-label="Narrator">
            🎙️
          </span>
          <p className="text-base leading-relaxed text-slate-800">{intro.narrator_pl}</p>
        </div>

        <div className="mt-3 ml-10">
          {!audioReady ? (
            <div className="flex items-center gap-2 text-xs text-indigo-600">
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
              Przygotowuję narrację...
            </div>
          ) : (
            <>
              <AudioPlayer
                src={audioSrc}
                fallbackText={intro.narrator_pl}
                fallbackLang="pl-PL"
                preferredVoiceNames={SYSTEM_TTS_VOICE_PREFERENCES.plNarrator}
                autoPlay={true}
                onEnded={handleComplete}
                showControls={true}
              />
              <p className="mt-1 text-xs text-indigo-600">Posłuchaj opisu sytuacji...</p>
            </>
          )}
        </div>
      </div>

      {/* Manual "Continue" button */}
      <button
        type="button"
        onClick={handleComplete}
        className="rounded-2xl bg-gradient-to-r from-amber-400 to-orange-400 px-8 py-3 font-bold text-white shadow-md transition-all hover:-translate-y-px hover:from-amber-500 hover:to-orange-500 active:from-amber-600 active:to-orange-600"
      >
        Dalej 🚀
      </button>
    </div>
  );
};

export default IntroNarrator;
