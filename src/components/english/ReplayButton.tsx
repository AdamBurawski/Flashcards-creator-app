import React, { useState, useCallback } from "react";
import { USE_SYSTEM_TTS_ONLY } from "../../lib/audio-settings";
import { resolvePreferredVoice } from "../../lib/system-tts";

interface ReplayButtonProps {
  text: string;
  lang: string;
  audioSrc: string | null | undefined;
  label?: string;
  preferredVoiceNames?: readonly string[];
}

const ReplayButton: React.FC<ReplayButtonProps> = ({ text, lang, audioSrc, label, preferredVoiceNames = [] }) => {
  const [isPlaying, setIsPlaying] = useState(false);

  const speakTTS = useCallback((t: string, l: string) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(t);
    utt.lang = l;
    utt.rate = 0.9;
    const preferredVoice = resolvePreferredVoice(l, preferredVoiceNames);
    if (preferredVoice) {
      utt.voice = preferredVoice;
    }
    setIsPlaying(true);
    utt.onend = () => setIsPlaying(false);
    utt.onerror = () => setIsPlaying(false);
    window.speechSynthesis.speak(utt);
  }, [preferredVoiceNames]);

  const play = useCallback(() => {
    if (isPlaying) return;
    const src = USE_SYSTEM_TTS_ONLY ? undefined : (audioSrc ?? undefined);
    if (src) {
      const audio = new Audio(src);
      setIsPlaying(true);
      audio.onended = () => setIsPlaying(false);
      audio.onerror = () => {
        setIsPlaying(false);
        if (text) speakTTS(text, lang);
      };
      audio.play().catch(() => {
        setIsPlaying(false);
        if (text) speakTTS(text, lang);
      });
    } else if (text) {
      speakTTS(text, lang);
    }
  }, [isPlaying, audioSrc, text, lang, speakTTS]);

  return (
    <button
      type="button"
      onClick={play}
      disabled={isPlaying}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold shadow-sm transition-all ${
        isPlaying
          ? "cursor-default border-indigo-200 bg-indigo-100 text-indigo-700 animate-pulse"
          : "border-violet-200 bg-white text-violet-600 hover:-translate-y-px hover:border-violet-300 hover:bg-violet-50"
      }`}
      title="Odsłuchaj ponownie"
    >
      {isPlaying ? (
        <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
        </svg>
      ) : (
        <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z" />
        </svg>
      )}
      {label && <span>{label}</span>}
    </button>
  );
};

export default ReplayButton;
