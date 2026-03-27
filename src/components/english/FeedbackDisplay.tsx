import React, { useState, useEffect } from "react";
import AudioPlayer from "./AudioPlayer";
import type { EvaluationResult } from "../../types/english";
import { SYSTEM_TTS_VOICE_PREFERENCES, USE_SYSTEM_TTS_ONLY } from "../../lib/audio-settings";

interface FeedbackDisplayProps {
  /** Evaluation result from the API */
  result: EvaluationResult;
  /** Called when user clicks "Next" */
  onNext: () => void;
  /** Whether this is the last turn in the dialogue */
  isLastTurn: boolean;
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

/**
 * Displays feedback after evaluating a student's answer.
 * Shows correctness, Polish feedback text, correct answer, and plays TTS audio.
 * Fetches narrator PL audio on demand if no pre-baked URL is provided.
 */
const FeedbackDisplay: React.FC<FeedbackDisplayProps> = ({ result, onNext, isLastTurn }) => {
  const [audioSrc, setAudioSrc] = useState<string | undefined>(result.feedback_audio_url);
  const [audioReady, setAudioReady] = useState(!!result.feedback_audio_url);

  useEffect(() => {
    if (USE_SYSTEM_TTS_ONLY) {
      setAudioSrc(undefined);
      setAudioReady(true);
      return;
    }

    if (result.feedback_audio_url) {
      setAudioSrc(result.feedback_audio_url);
      setAudioReady(true);
      return;
    }
    setAudioReady(false);
    let cancelled = false;
    fetchNarratorAudio(result.feedback_text).then((url) => {
      if (!cancelled) {
        setAudioSrc(url);
        setAudioReady(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [result.feedback_text, result.feedback_audio_url]);

  return (
    <div className="mb-4">
      {/* Feedback card */}
      <div
        className={`rounded-2xl border-2 px-5 py-4 ${
          result.is_correct ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"
        }`}
      >
        {/* Header with icon */}
        <div className="flex items-center gap-2 mb-2">
          {result.is_correct ? (
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          ) : (
            <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
              <span className="text-lg">💡</span>
            </div>
          )}
          <span className={`font-semibold ${result.is_correct ? "text-green-700" : "text-amber-700"}`}>
            {result.is_correct ? "Poprawna odpowiedź!" : "Prawie dobrze!"}
          </span>
        </div>

        {/* Feedback text (in Polish) */}
        <p className="text-gray-700 text-base mb-3">{result.feedback_text}</p>

        {/* Show correct answer if wrong */}
        {!result.is_correct && result.correct_answer && (
          <div className="bg-white/60 rounded-lg px-3 py-2 mb-3">
            <span className="text-sm text-gray-500">Poprawna odpowiedź:</span>
            <p className="text-gray-800 font-medium mt-0.5">{result.correct_answer}</p>
          </div>
        )}

        {/* Correction details badges */}
        {!result.is_correct && result.correction_details && (
          <div className="flex flex-wrap gap-2 mb-3">
            <DetailBadge label="Gramatyka" ok={result.correction_details.grammar_ok} />
            <DetailBadge label="Słownictwo" ok={result.correction_details.vocabulary_ok} />
            <DetailBadge label="Struktura" ok={result.correction_details.structure_ok} />
          </div>
        )}

        {/* Feedback audio — fetched from narrator-audio API or falls back to browser TTS */}
        <div className="mb-2">
          {audioReady ? (
            <AudioPlayer
              src={audioSrc}
              fallbackText={result.feedback_text}
              fallbackLang="pl-PL"
              preferredVoiceNames={SYSTEM_TTS_VOICE_PREFERENCES.plNarrator}
              autoPlay={true}
              showControls={true}
            />
          ) : (
            <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
              <div className="w-3 h-3 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
              <span>Ładowanie audio...</span>
            </div>
          )}
        </div>
      </div>

      {/* Next button */}
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={onNext}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium
            hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          {isLastTurn ? "Zobacz podsumowanie" : "Dalej"}
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
};

/** Small badge showing if a correction category is OK or not */
function DetailBadge({ label, ok }: { label: string; ok: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
        ok ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
      }`}
    >
      {ok ? "✓" : "✗"} {label}
    </span>
  );
}

export default FeedbackDisplay;
