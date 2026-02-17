import React from "react";
import AudioPlayer from "./AudioPlayer";
import type { EvaluationResult } from "../../types/english";

interface FeedbackDisplayProps {
  /** Evaluation result from the API */
  result: EvaluationResult;
  /** Called when user clicks "Next" */
  onNext: () => void;
  /** Whether this is the last turn in the dialogue */
  isLastTurn: boolean;
}

/**
 * Displays feedback after evaluating a student's answer.
 * Shows correctness, Polish feedback text, correct answer, and plays TTS audio.
 */
const FeedbackDisplay: React.FC<FeedbackDisplayProps> = ({ result, onNext, isLastTurn }) => {
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

        {/* Feedback audio */}
        {result.feedback_audio_url && (
          <div className="mb-2">
            <AudioPlayer
              src={result.feedback_audio_url}
              fallbackText={result.feedback_text}
              fallbackLang="pl-PL"
              autoPlay={true}
              showControls={true}
            />
          </div>
        )}
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
