import React, { useState, useEffect } from "react";
import { useCallback } from "react";
import FlashcardCard from "./FlashcardCard";
import SpeechRecognition from "./SpeechRecognition";

// Definicja typów
interface Flashcard {
  id: number;
  front: string;
  back: string;
}

interface SessionScore {
  correct: number;
  total: number;
}

interface LearningSessionProps {
  collectionId: number;
}

// Losowe kolory tła dla sesji nauki (pastelowe) - zdefiniowane poza komponentem
const backgroundColors = [
  "#f0f9ff", // jasnoniebieski
  "#f0fdf4", // jasnozielony
  "#fdf4ff", // jasnofioletowy
  "#fff7ed", // jasnopomarańczowy
  "#fef2f2", // jasnoczerwony
  "#f8fafc", // jasnoszary
  "#fffbeb", // jasnożółty
];

const LearningSession: React.FC<LearningSessionProps> = ({ collectionId }) => {
  // Stan komponentu
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionScore, setSessionScore] = useState<SessionScore>({ correct: 0, total: 0 });
  const [userAnswer, setUserAnswer] = useState("");
  const [showAnswer, setShowAnswer] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<boolean | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [backgroundColor, setBackgroundColor] = useState("#f0f9ff"); // Domyślny jasnoniebieski
  const [useSpeechRecognition, setUseSpeechRecognition] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [sessionDuration, setSessionDuration] = useState<number>(0);

  // Zmiana losowego koloru tła
  const changeBackgroundColor = useCallback(() => {
    const currentColor = backgroundColor;
    let newColor;
    do {
      newColor = backgroundColors[Math.floor(Math.random() * backgroundColors.length)];
    } while (newColor === currentColor);
    setBackgroundColor(newColor);
  }, [backgroundColor]);

  // Pobranie fiszek dla sesji nauki
  useEffect(() => {
    const fetchFlashcards = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/collections/${collectionId}/learn`);

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(errorData?.error || `Błąd podczas pobierania fiszek: ${response.status}`);
        }

        const data = await response.json();

        if (!data.flashcards || !Array.isArray(data.flashcards) || data.flashcards.length === 0) {
          throw new Error("Brak fiszek w tej kolekcji.");
        }

        setFlashcards(data.flashcards);
        setSessionScore({ correct: 0, total: data.flashcards.length });
        // Ustawienie początkowego koloru tła bezpośrednio
        const initialColor = backgroundColors[Math.floor(Math.random() * backgroundColors.length)];
        setBackgroundColor(initialColor);

        // Ustawienie czasu rozpoczęcia sesji
        setSessionStartTime(Date.now());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Wystąpił nieznany błąd.");
      } finally {
        setIsLoading(false);
      }
    };

    if (collectionId) {
      // Dodatkowe zabezpieczenie
      fetchFlashcards();
    }
  }, [collectionId]); // Usunięto changeBackgroundColor z zależności

  // Obsługa przesłania odpowiedzi
  const handleSubmitAnswer = async () => {
    if (!userAnswer.trim()) {
      return; // Nie oceniaj pustej odpowiedzi
    }

    try {
      setIsEvaluating(true);

      const currentFlashcard = flashcards[currentFlashcardIndex];
      const response = await fetch("/api/learn/evaluate-answer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          questionText: currentFlashcard.front,
          expectedAnswerText: currentFlashcard.back,
          userAnswerText: userAnswer,
        }),
      });

      if (!response.ok) {
        throw new Error("Błąd podczas oceny odpowiedzi.");
      }

      const result = await response.json();
      setEvaluationResult(result.isCorrect);

      // Aktualizuj wynik sesji
      if (result.isCorrect) {
        setSessionScore((prev) => ({ ...prev, correct: prev.correct + 1 }));
      }

      // Pokaż odpowiedź
      setShowAnswer(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wystąpił błąd podczas oceny odpowiedzi.");
    } finally {
      setIsEvaluating(false);
    }
  };

  // Przejście do następnej fiszki
  const handleNextFlashcard = () => {
    if (currentFlashcardIndex < flashcards.length - 1) {
      setCurrentFlashcardIndex((prev) => prev + 1);
      setUserAnswer("");
      setShowAnswer(false);
      setEvaluationResult(null);
      changeBackgroundColor();
    } else {
      // Ostatnia fiszka - zakończenie sesji
      if (sessionStartTime) {
        const duration = Math.floor((Date.now() - sessionStartTime) / 1000); // w sekundach
        setSessionDuration(duration);
      }
      setCurrentFlashcardIndex((prev) => prev + 1);
    }
  };

  // Restart sesji nauki
  const handleRestartSession = () => {
    setCurrentFlashcardIndex(0);
    setUserAnswer("");
    setShowAnswer(false);
    setEvaluationResult(null);
    setSessionScore({ correct: 0, total: flashcards.length });
    changeBackgroundColor();
  };

  // Obsługa wpisywania odpowiedzi
  const handleAnswerChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setUserAnswer(e.target.value);
  };

  // Obsługa transkrypcji mowy
  const handleTranscriptionComplete = (transcript: string) => {
    console.log("Otrzymano transkrypcję:", transcript); // Debugowanie
    setUserAnswer(transcript);
    // Dodaj komunikat, że transkrypcja została zakończona
    if (transcript) {
      setError(null); // Wyczyść stare błędy
    }
  };

  // Przełączanie między wpisywaniem a nagrywaniem
  const toggleInputMethod = () => {
    setUseSpeechRecognition(!useSpeechRecognition);
  };

  // Funkcja formatująca czas w formacie MM:SS
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? "0" : ""}${remainingSeconds}`;
  };

  // Gdy dane się ładują
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Ładowanie sesji nauki...</p>
        </div>
      </div>
    );
  }

  // Gdy wystąpił błąd
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md w-full">
          <h2 className="text-red-600 text-xl font-medium mb-3">Wystąpił błąd</h2>
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={() => (window.location.href = `/collections/${collectionId}`)}
            className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded"
          >
            Wróć do kolekcji
          </button>
        </div>
      </div>
    );
  }

  // Gdy sesja nauki zakończona
  if (currentFlashcardIndex >= flashcards.length) {
    return (
      <div
        className="flex items-center justify-center min-h-screen p-4 transition-colors duration-500"
        style={{ backgroundColor }}
      >
        <div className="bg-white rounded-3xl shadow-lg p-8 max-w-md w-full">
          <h2 className="text-2xl font-bold text-center mb-6">Sesja zakończona!</h2>

          <div className="text-center mb-6">
            <p className="text-xl mb-2">
              Twój wynik: <span className="font-bold">{sessionScore.correct}</span> / {sessionScore.total}
            </p>
            <p className="text-gray-600">
              {sessionScore.correct === sessionScore.total
                ? "Świetnie! Wszystkie odpowiedzi poprawne!"
                : `${Math.round((sessionScore.correct / sessionScore.total) * 100)}% poprawnych odpowiedzi.`}
            </p>
          </div>

          {/* Tabela podsumowania */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg mb-6 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-3 px-4 text-left text-sm font-medium text-gray-700">Kategoria</th>
                  <th className="py-3 px-4 text-right text-sm font-medium text-gray-700">Wynik</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="py-3 px-4 text-sm text-gray-700">Fiszki poprawne</td>
                  <td className="py-3 px-4 text-right text-sm font-medium text-green-600">{sessionScore.correct}</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-sm text-gray-700">Fiszki błędne</td>
                  <td className="py-3 px-4 text-right text-sm font-medium text-red-600">
                    {sessionScore.total - sessionScore.correct}
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-sm text-gray-700">Skuteczność</td>
                  <td className="py-3 px-4 text-right text-sm font-medium text-blue-600">
                    {Math.round((sessionScore.correct / sessionScore.total) * 100)}%
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-sm text-gray-700">Całkowity czas</td>
                  <td className="py-3 px-4 text-right text-sm font-medium text-gray-700">
                    {formatTime(sessionDuration)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleRestartSession}
              className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-lg flex-1"
            >
              Ucz się ponownie
            </button>
            <button
              onClick={() => (window.location.href = `/collections/${collectionId}`)}
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-3 px-4 rounded-lg flex-1"
            >
              Wróć do kolekcji
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Aktualna fiszka
  const currentFlashcard = flashcards[currentFlashcardIndex];

  // Główny widok sesji nauki
  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen p-4 transition-colors duration-500"
      style={{ backgroundColor }}
    >
      {/* Pasek postępu i wynik */}
      <div className="w-full max-w-3xl mb-8 px-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-700 font-medium">
            Fiszka {currentFlashcardIndex + 1} z {flashcards.length}
          </span>
          <span className="text-gray-700 font-medium">
            Wynik: {sessionScore.correct} / {flashcards.length}
          </span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${(currentFlashcardIndex / flashcards.length) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Karta z pytaniem/odpowiedzią - używamy komponentu FlashcardCard */}
      <FlashcardCard
        front={currentFlashcard.front}
        back={currentFlashcard.back}
        showAnswer={showAnswer}
        isCorrect={evaluationResult}
      />

      {/* Obszar odpowiedzi użytkownika */}
      <div className="w-full max-w-xl mt-6">
        {!showAnswer ? (
          <>
            {/* Przełącznik trybu odpowiedzi */}
            <div className="flex justify-end mb-2">
              <button
                type="button"
                onClick={toggleInputMethod}
                className="text-sm text-gray-600 hover:text-blue-600 flex items-center"
              >
                {useSpeechRecognition ? (
                  <>
                    <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M10 14L20 4"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M16 4h4v4"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Przełącz na wpisywanie
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"
                        fill="currentColor"
                      />
                      <path
                        d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"
                        fill="currentColor"
                      />
                    </svg>
                    Przełącz na nagrywanie
                  </>
                )}
              </button>
            </div>

            {/* Komponent transkrypcji mowy */}
            <SpeechRecognition onTranscriptionComplete={handleTranscriptionComplete} isEnabled={useSpeechRecognition} />

            {/* Nowa implementacja wyświetlania transkrypcji */}
            {useSpeechRecognition && (
              <div className="mb-4">
                {userAnswer ? (
                  <>
                    <label className="block text-gray-700 font-medium mb-2">Transkrypcja:</label>
                    <div className="w-full px-4 py-3 border border-gray-300 bg-gray-50 rounded-lg text-gray-700 mb-2">
                      {userAnswer}
                    </div>
                    <p className="text-sm text-gray-500 mb-4">
                      Jeśli transkrypcja nie jest dokładna, możesz nagrać ponownie lub przełączyć się na wpisywanie
                      ręczne.
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-gray-500 mb-4">Po nagraniu, transkrypcja pojawi się tutaj.</p>
                )}
              </div>
            )}

            {/* Input tekstowy (widoczny, gdy nie używamy nagrywania) */}
            {!useSpeechRecognition && (
              <div className="mb-4">
                <label htmlFor="userAnswer" className="block text-gray-700 font-medium mb-2">
                  Twoja odpowiedź:
                </label>
                <textarea
                  id="userAnswer"
                  value={userAnswer}
                  onChange={handleAnswerChange}
                  className="w-full h-20 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Wpisz swoją odpowiedź..."
                  disabled={isEvaluating}
                />
              </div>
            )}

            {/* Przycisk oceny odpowiedzi */}
            <button
              onClick={handleSubmitAnswer}
              disabled={isEvaluating || !userAnswer.trim()}
              className={`
                w-full py-3 px-4 rounded-lg font-medium
                ${
                  isEvaluating
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : userAnswer.trim()
                      ? "bg-blue-500 hover:bg-blue-600 text-white"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }
              `}
            >
              {isEvaluating ? (
                <span className="flex items-center justify-center">
                  <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></span>
                  Ocenianie...
                </span>
              ) : (
                "Sprawdź odpowiedź"
              )}
            </button>
          </>
        ) : (
          <button
            onClick={handleNextFlashcard}
            className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-8 rounded-lg w-full"
          >
            Następne pytanie
          </button>
        )}
      </div>
    </div>
  );
};

export default LearningSession;
