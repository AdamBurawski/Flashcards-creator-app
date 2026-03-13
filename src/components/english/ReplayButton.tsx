import React, { useState, useCallback } from "react";

interface ReplayButtonProps {
  text: string;
  lang: string;
  audioSrc: string | null | undefined;
  label?: string;
}

const ReplayButton: React.FC<ReplayButtonProps> = ({ text, lang, audioSrc, label }) => {
  const [isPlaying, setIsPlaying] = useState(false);

  const speakTTS = useCallback((t: string, l: string) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(t);
    utt.lang = l;
    utt.rate = 0.9;
    setIsPlaying(true);
    utt.onend = () => setIsPlaying(false);
    utt.onerror = () => setIsPlaying(false);
    window.speechSynthesis.speak(utt);
  }, []);

  const play = useCallback(() => {
    if (isPlaying) return;
    const src = audioSrc ?? undefined;
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
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all ${
        isPlaying
          ? "bg-blue-100 text-blue-600 animate-pulse cursor-default"
          : "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
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
