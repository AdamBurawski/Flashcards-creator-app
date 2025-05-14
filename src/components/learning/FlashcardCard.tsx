import React, { useState, useEffect } from "react";

interface FlashcardCardProps {
  front: string;
  back: string;
  showAnswer: boolean;
  isCorrect: boolean | null;
}

/**
 * Komponent karty fiszki z animacją przewracania
 */
const FlashcardCard: React.FC<FlashcardCardProps> = ({ front, back, showAnswer, isCorrect }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);

  // Obsługa animacji obrotu karty przy zmianie showAnswer
  useEffect(() => {
    if (showAnswer) {
      setIsFlipping(true);
      const timer = setTimeout(() => {
        setIsFlipped(true);
        setIsFlipping(false);
      }, 300); // Skrócony czas animacji dla lepszego UX

      return () => clearTimeout(timer);
    } else {
      setIsFlipped(false);
    }
  }, [showAnswer]);

  // Określamy kolor tła dla odpowiedzi
  const getResultBackgroundClass = () => {
    if (isCorrect === true) return "bg-green-50";
    if (isCorrect === false) return "bg-red-50";
    return "";
  };

  // Główny kontener karty
  return (
    <div className="w-full max-w-xl">
      {/* Karta z animacją odwracania */}
      <div
        className={`
          relative h-[400px] w-full
          rounded-3xl shadow-lg overflow-hidden
          transition-all duration-500 transform-gpu
          ${isFlipping ? "scale-[0.96]" : "scale-100"}
        `}
      >
        {/* Przód karty (pytanie) */}
        <div
          className={`
            absolute inset-0 bg-white p-8 rounded-3xl flex flex-col
            transition-all duration-500 transform-gpu backface-visibility-hidden
            ${isFlipped ? "opacity-0 rotate-y-180" : "opacity-100 rotate-y-0"}
          `}
        >
          <h3 className="text-gray-500 text-sm mb-2">Pytanie:</h3>
          <p className="text-2xl font-medium">{front}</p>
        </div>

        {/* Tył karty (odpowiedź) */}
        <div
          className={`
            absolute inset-0 p-8 rounded-3xl flex flex-col
            transition-all duration-500 transform-gpu backface-visibility-hidden
            ${getResultBackgroundClass()}
            ${isFlipped ? "opacity-100 rotate-y-0" : "opacity-0 rotate-y-180"}
          `}
        >
          <div className="mb-4">
            <h3 className="text-gray-500 text-sm mb-2">Pytanie:</h3>
            <p className="text-lg font-medium">{front}</p>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200">
            <h3 className="text-gray-500 text-sm mb-2">Poprawna odpowiedź:</h3>
            <p className="text-xl font-medium">{back || "Brak odpowiedzi"}</p>

            {isCorrect !== null && (
              <div
                className={`mt-6 p-4 rounded-lg font-medium text-center 
                  ${
                    isCorrect
                      ? "bg-green-100 text-green-700 border border-green-200"
                      : "bg-red-100 text-red-700 border border-red-200"
                  }`}
              >
                {isCorrect ? "Poprawna odpowiedź!" : "Niepoprawna odpowiedź."}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Debugowanie - wyświetla informacje o stanie karty */}
      {process.env.NODE_ENV === "development" && (
        <div className="mt-2 text-xs text-gray-500">
          <p>
            Debug: showAnswer={String(showAnswer)}, isCorrect={String(isCorrect)}, isFlipped={String(isFlipped)}
          </p>
          <p>Front: {front ? `"${front}"` : "pusty"}</p>
          <p>Back: {back ? `"${back}"` : "pusty"}</p>
        </div>
      )}
    </div>
  );
};

export default FlashcardCard;
