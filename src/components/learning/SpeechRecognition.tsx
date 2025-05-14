import React, { useState, useEffect, useCallback } from "react";

interface SpeechRecognitionProps {
  onTranscriptionComplete: (transcript: string) => void;
  isEnabled: boolean;
}

const SpeechRecognition: React.FC<SpeechRecognitionProps> = ({ onTranscriptionComplete, isEnabled }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);

  // Sprawdzenie, czy przeglądarka obsługuje API nagrywania
  const isBrowserSupported = useCallback(() => {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }, []);

  // Rozpocznij nagrywanie
  const startRecording = useCallback(async () => {
    try {
      // Reset stanu
      setError(null);
      setAudioChunks([]);

      // Sprawdź wsparcie przeglądarki
      if (!isBrowserSupported()) {
        throw new Error("Twoja przeglądarka nie obsługuje nagrywania dźwięku.");
      }

      // Poproś o dostęp do mikrofonu
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Utwórz MediaRecorder
      const recorder = new MediaRecorder(stream);
      setMediaRecorder(recorder);

      // Konfiguracja handler'ów zdarzeń
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setAudioChunks((currentChunks) => [...currentChunks, event.data]);
        }
      };

      // Gdy nagrywanie zakończy się
      recorder.onstop = async () => {
        // Zatrzymaj wszystkie ścieżki dźwiękowe
        stream.getTracks().forEach((track) => track.stop());

        // Przygotuj blob z nagranym audio
        const audioBlob = new Blob(audioChunks, { type: "audio/webm" });

        try {
          setIsProcessing(true);

          // Wysłanie nagrania do transkrypcji przez API (np. Whisper)
          await sendAudioForTranscription(audioBlob);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Wystąpił błąd podczas transkrypcji.");
        } finally {
          setIsProcessing(false);
        }
      };

      // Rozpocznij nagrywanie
      recorder.start();
      setIsRecording(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wystąpił nieznany błąd podczas inicjalizacji nagrywania.");
      console.error("Błąd nagrywania:", err);
    }
  }, [audioChunks, isBrowserSupported]);

  // Zatrzymaj nagrywanie
  const stopRecording = useCallback(() => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  }, [mediaRecorder]);

  // Wysłanie audio do transkrypcji
  const sendAudioForTranscription = async (audioBlob: Blob) => {
    // Utworzenie obiektu FormData z nagraniem
    const formData = new FormData();
    formData.append("audio", audioBlob);

    // Wysłanie nagrania do API
    try {
      const response = await fetch("/api/learn/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Błąd podczas transkrypcji nagrania.");
      }

      const data = await response.json();

      // Przekaż transkrypcję z powrotem do rodzica
      if (data.transcript) {
        onTranscriptionComplete(data.transcript);
      } else {
        throw new Error("Nie udało się rozpoznać mowy.");
      }
    } catch (err) {
      console.error("Błąd transkrypcji:", err);
      throw err;
    }
  };

  // Obsługa naciśnięcia przycisku nagrywania
  const handleRecordingToggle = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Wyłącz nagrywanie, gdy komponent jest dezaktywowany
  useEffect(() => {
    if (!isEnabled && isRecording) {
      stopRecording();
    }
  }, [isEnabled, isRecording, stopRecording]);

  // Cleanup przy odmontowaniu komponentu
  useEffect(() => {
    return () => {
      if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
      }
    };
  }, [mediaRecorder]);

  if (!isEnabled) {
    return null;
  }

  return (
    <div className="mb-4">
      {error && <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg mb-3 text-sm">{error}</div>}

      <button
        type="button"
        onClick={handleRecordingToggle}
        disabled={isProcessing}
        className={`
          flex items-center justify-center w-full py-3 px-4 rounded-lg font-medium mb-2
          ${isRecording ? "bg-red-500 hover:bg-red-600 text-white" : "bg-blue-500 hover:bg-blue-600 text-white"}
          ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}
        `}
      >
        {isProcessing ? (
          <>
            <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></span>
            Przetwarzanie...
          </>
        ) : isRecording ? (
          <>
            <span className="relative flex h-3 w-3 mr-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            Zatrzymaj nagrywanie
          </>
        ) : (
          <>
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
            </svg>
            Nagraj odpowiedź
          </>
        )}
      </button>

      {isRecording && (
        <p className="text-sm text-center text-gray-600">
          Mów teraz... Nagrywanie aktywne. Kliknij ponownie, aby zatrzymać.
        </p>
      )}
    </div>
  );
};

export default SpeechRecognition;
