import React, { useMemo, useRef, useState } from "react";
import AudioPlayer from "./AudioPlayer";
import StudentAnswerInput from "./StudentAnswerInput";
import { SYSTEM_TTS_VOICE_PREFERENCES, USE_SYSTEM_TTS_ONLY } from "../../lib/audio-settings";
import type { CEFRLevel, EnglishDialogue } from "../../types/english";

interface FreeConversationPanelProps {
  level: CEFRLevel;
  dialogue: EnglishDialogue;
  onFinish: () => void;
  finishLabel?: string;
}

interface ChatMessage {
  id: number;
  role: "student" | "teacher";
  text: string;
  audioUrl?: string;
}

interface ConversationApiResponse {
  correction_text?: string;
  answer_text: string;
  teacher_question: string;
  suggestions: string[];
}

async function fetchTeacherAudio(text: string): Promise<string | undefined> {
  if (USE_SYSTEM_TTS_ONLY) return undefined;
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

function buildInitialSuggestions(dialogue: EnglishDialogue): string[] {
  const vocab = dialogue.target_vocab.filter((item) => item.trim().length > 0).slice(0, 3);
  const seeded = vocab.flatMap((word) => [`What is ${word}?`, `Where can I see ${word}?`]);
  const fallback = ["What can you see in this picture?", "Can you ask me an easy question?"];
  return Array.from(new Set([...seeded, ...fallback])).slice(0, 4);
}

const FreeConversationPanel: React.FC<FreeConversationPanelProps> = ({ level, dialogue, onFinish, finishLabel }) => {
  const idRef = useRef(1);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: idRef.current++,
      role: "teacher",
      text: "Great job! Now let's have a free conversation. Ask me a question in English.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>(() => buildInitialSuggestions(dialogue));

  const lastTeacherId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "teacher") return messages[i].id;
    }
    return -1;
  }, [messages]);

  const sendQuestion = async (questionText?: string): Promise<void> => {
    if (isSending) return;
    const question = (questionText ?? input).trim();
    if (!question) return;

    setError(null);
    setIsSending(true);

    const studentMessage: ChatMessage = {
      id: idRef.current++,
      role: "student",
      text: question,
    };

    const nextMessages = [...messages, studentMessage];
    setMessages(nextMessages);
    setInput("");

    try {
      const response = await fetch("/api/english/conversation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          level,
          lesson_title: dialogue.title,
          target_vocab: dialogue.target_vocab,
          target_structures: dialogue.target_structures,
          history: nextMessages.slice(-10).map((entry) => ({ role: entry.role, text: entry.text })),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Nie udało się pobrać odpowiedzi lektora");
      }

      const data = (await response.json()) as ConversationApiResponse;
      const teacherReply = [data.correction_text, data.answer_text, data.teacher_question]
        .filter((part): part is string => Boolean(part && part.trim().length > 0))
        .join("\n\n")
        .trim();
      const teacherAudioUrl = await fetchTeacherAudio(teacherReply);
      const teacherMessage: ChatMessage = {
        id: idRef.current++,
        role: "teacher",
        text: teacherReply,
        audioUrl: teacherAudioUrl,
      };

      setMessages((prev) => [...prev, teacherMessage]);
      setSuggestions((data.suggestions ?? []).filter((item) => item.trim().length > 0).slice(0, 4));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Wystąpił nieoczekiwany błąd rozmowy";
      setError(message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 py-6">
      <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4">
        <h3 className="text-lg font-semibold text-indigo-900">Luźna rozmowa z lektorem</h3>
        <p className="mt-1 text-sm text-indigo-700">
          Zadawaj pytania po angielsku i ćwicz mówienie. Możesz skorzystać z gotowych sugestii.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white/90 p-4">
        <div className="mb-4 flex flex-wrap gap-2">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => void sendQuestion(suggestion)}
              disabled={isSending}
              className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-100 disabled:opacity-50"
            >
              {suggestion}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {messages.map((message) => (
            <div key={message.id} className={message.role === "teacher" ? "flex justify-start" : "flex justify-end"}>
              <div
                className={`max-w-2xl rounded-2xl border px-4 py-3 shadow-sm ${
                  message.role === "teacher"
                    ? "border-blue-200 bg-blue-50 text-blue-900"
                    : "border-indigo-200 bg-indigo-600 text-white"
                }`}
              >
                <p className="text-sm leading-relaxed">{message.text}</p>
                {message.role === "teacher" && (
                  <div className="mt-2">
                    <AudioPlayer
                      src={message.audioUrl}
                      fallbackText={message.text}
                      fallbackLang="en-US"
                      preferredVoiceNames={SYSTEM_TTS_VOICE_PREFERENCES.enTeacher}
                      autoPlay={message.id === lastTeacherId}
                      showControls={true}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-4">
          <StudentAnswerInput
            value={input}
            onChange={setInput}
            onSubmit={() => void sendQuestion()}
            isRecording={false}
            disabled={isSending}
            placeholder="Zadaj pytanie po angielsku..."
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onFinish}
          className="rounded-2xl bg-indigo-700 px-6 py-2.5 font-semibold text-white shadow-sm transition-colors hover:bg-indigo-800"
        >
          {finishLabel ?? "Zakończ rozmowę i zobacz podsumowanie"}
        </button>
      </div>
    </div>
  );
};

export default FreeConversationPanel;
