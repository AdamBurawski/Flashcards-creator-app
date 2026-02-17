import React, { useState, useCallback, useRef, useEffect } from "react";

interface StudentAnswerInputProps {
  /** Current answer text */
  value: string;
  /** Called when answer text changes */
  onChange: (value: string) => void;
  /** Called when user submits the answer */
  onSubmit: () => void;
  /** Whether recording is in progress */
  isRecording: boolean;
  /** Whether the input is disabled */
  disabled: boolean;
  /** Placeholder text for the input */
  placeholder?: string;
}

/**
 * Student answer input component with microphone recording and text input.
 * Uses MediaRecorder API to capture audio and sends it to /api/learn/transcribe.
 */
const StudentAnswerInput: React.FC<StudentAnswerInputProps> = ({
  value,
  onChange,
  onSubmit,
  isRecording: _externalIsRecording,
  disabled,
  placeholder = "Wpisz lub nagraj swoją odpowiedź...",
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const onChangeRef = useRef(onChange);

  // Keep ref in sync with latest onChange
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const transcribeAudio = useCallback(async (chunks: Blob[], mimeType: string) => {
    setIsTranscribing(true);
    setError(null);

    try {
      const audioBlob = new Blob(chunks, { type: mimeType || "audio/webm" });

      const extMap: Record<string, string> = {
        "audio/webm": "webm",
        "audio/webm;codecs=opus": "webm",
        "audio/mp4": "mp4",
        "audio/ogg": "ogg",
        "audio/wav": "wav",
        "audio/mpeg": "mp3",
      };
      const ext = extMap[mimeType] || "webm";

      const formData = new FormData();
      formData.append("audio", audioBlob, `recording.${ext}`);
      formData.append("language", "en"); // Force English transcription

      const response = await fetch("/api/learn/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Błąd transkrypcji");
      }

      const data = await response.json();
      if (data.transcript) {
        onChangeRef.current(data.transcript);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Nie udało się przetworzyć nagrania";
      setError(message);
    } finally {
      setIsTranscribing(false);
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      audioChunksRef.current = [];

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Twoja przeglądarka nie obsługuje nagrywania dźwięku.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, sampleRate: 44100 },
      });

      // Find supported MIME type
      const mimeTypes = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg", "audio/wav"];
      let selectedMime = "";
      for (const mime of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mime)) {
          selectedMime = mime;
          break;
        }
      }

      const recorder = new MediaRecorder(stream, selectedMime ? { mimeType: selectedMime } : {});
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());

        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        setIsRecording(false);
        setRecordingDuration(0);

        if (audioChunksRef.current.length > 0) {
          await transcribeAudio(audioChunksRef.current, recorder.mimeType);
        }
      };

      recorder.start(250);
      setIsRecording(true);

      setRecordingDuration(0);
      timerRef.current = window.setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Nie udało się rozpocząć nagrywania";
      setError(message);
      setIsRecording(false);
    }
  }, [transcribeAudio]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && value.trim()) {
      e.preventDefault();
      onSubmit();
    }
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-3">
      {/* Recording / Input area */}
      <div className="flex items-end gap-3">
        {/* Microphone button */}
        <button
          type="button"
          onClick={toggleRecording}
          disabled={disabled || isTranscribing}
          className={`flex-shrink-0 p-3 rounded-full transition-all ${
            isRecording
              ? "bg-red-500 text-white animate-pulse shadow-lg shadow-red-200"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          aria-label={isRecording ? "Zatrzymaj nagrywanie" : "Nagraj odpowiedź"}
        >
          {isRecording ? (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
            </svg>
          )}
        </button>

        {/* Text input */}
        <div className="flex-1">
          <label htmlFor="student-answer-input" className="sr-only">
            Twoja odpowiedź
          </label>
          <textarea
            id="student-answer-input"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled || isRecording || isTranscribing}
            placeholder={isRecording ? "Nagrywanie..." : isTranscribing ? "Transkrypcja..." : placeholder}
            rows={2}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-base resize-none
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
              disabled:bg-gray-50 disabled:text-gray-500"
          />
        </div>

        {/* Submit button */}
        <button
          type="button"
          onClick={onSubmit}
          disabled={disabled || isRecording || isTranscribing || !value.trim()}
          className="flex-shrink-0 px-5 py-3 bg-blue-600 text-white rounded-xl font-medium
            hover:bg-blue-700 transition-colors
            disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
        >
          Wyślij
        </button>
      </div>

      {/* Status indicators */}
      <div className="flex items-center gap-3 min-h-[1.5rem]">
        {isRecording && (
          <span className="text-sm text-red-600 flex items-center gap-1">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            Nagrywanie... {formatDuration(recordingDuration)}
          </span>
        )}

        {isTranscribing && (
          <span className="text-sm text-blue-600 flex items-center gap-2">
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Rozpoznawanie mowy...
          </span>
        )}

        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </div>
  );
};

export default StudentAnswerInput;
