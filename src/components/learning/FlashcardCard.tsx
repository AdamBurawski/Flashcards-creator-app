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
  const [isFlipping, setIsFlipping] = useState(false);

  // Obsługa animacji obrotu karty przy zmianie showAnswer
  useEffect(() => {
    if (showAnswer) {
      setIsFlipping(true);
      const timer = setTimeout(() => {
        setIsFlipping(false);
      }, 500); // Czas trwania animacji

      return () => clearTimeout(timer);
    }
  }, [showAnswer]);

  // Określamy kolor obramowania karty zależnie od oceny odpowiedzi
  const borderColor = showAnswer && isCorrect !== null ? (isCorrect ? "border-green-300" : "border-red-300") : "";

  return (
    <div
      className={`
        relative w-full max-w-xl h-[400px]
        perspective-1000 
        ${isFlipping ? "animate-flip-card" : ""}
      `}
    >
      <div
        className={`
        bg-white rounded-3xl shadow-lg p-8 w-full h-full
        transform-style-3d transition-all duration-500
        ${borderColor ? `border-4 ${borderColor}` : ""}
      `}
      >
        {/* Przód karty (pytanie) */}
        <div
          className={`
          absolute inset-0 p-8 rounded-3xl
          flex flex-col backface-hidden
          ${showAnswer ? "rotate-y-180" : ""}
        `}
        >
          <h3 className="text-gray-500 text-sm mb-2">Pytanie:</h3>
          <p className="text-2xl font-medium">{front}</p>
        </div>

        {/* Tył karty (odpowiedź) */}
        <div
          className={`
          absolute inset-0 p-8 rounded-3xl
          flex flex-col backface-hidden rotate-y-180
          ${showAnswer ? "rotate-y-0" : ""}
        `}
        >
          <div className="mb-6">
            <h3 className="text-gray-500 text-sm mb-2">Pytanie:</h3>
            <p className="text-lg font-medium">{front}</p>
          </div>

          <div className="mt-4 pt-6 border-t border-gray-200">
            <h3 className="text-gray-500 text-sm mb-2">Poprawna odpowiedź:</h3>
            <p className="text-xl">{back}</p>

            {isCorrect !== null && (
              <div
                className={`mt-4 p-3 rounded-lg ${isCorrect ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}
              >
                <p className="font-medium">{isCorrect ? "Poprawna odpowiedź!" : "Niepoprawna odpowiedź."}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlashcardCard;
