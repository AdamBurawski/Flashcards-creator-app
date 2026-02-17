import React, { useRef, useState, useEffect, useCallback } from "react";

interface AudioPlayerProps {
  /** URL or base64 data URL of the audio to play */
  src?: string;
  /** Text to speak via browser TTS (fallback when no src) */
  fallbackText?: string;
  /** Language for browser TTS fallback */
  fallbackLang?: string;
  /** Called when audio finishes playing */
  onEnded?: () => void;
  /** Auto-play when src changes */
  autoPlay?: boolean;
  /** Show player controls */
  showControls?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Reusable audio player component.
 * Plays audio from URL/base64 or falls back to browser SpeechSynthesis.
 */
const AudioPlayer: React.FC<AudioPlayerProps> = ({
  src,
  fallbackText,
  fallbackLang = "en-US",
  onEnded,
  autoPlay = false,
  showControls = true,
  className = "",
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [useTTS, setUseTTS] = useState(false);

  // Determine if we should use browser TTS
  useEffect(() => {
    setUseTTS(!src && !!fallbackText);
  }, [src, fallbackText]);

  const playTTS = useCallback(
    (text: string, lang: string) => {
      if (!("speechSynthesis" in window)) {
        // eslint-disable-next-line no-console
        console.warn("[AudioPlayer] SpeechSynthesis not supported");
        onEnded?.();
        return;
      }

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 0.9;
      utterance.pitch = 1.0;

      utterance.onstart = () => setIsPlaying(true);
      utterance.onend = () => {
        setIsPlaying(false);
        onEnded?.();
      };
      utterance.onerror = () => {
        setIsPlaying(false);
        onEnded?.();
      };

      window.speechSynthesis.speak(utterance);
    },
    [onEnded]
  );

  const play = useCallback(() => {
    if (useTTS && fallbackText) {
      playTTS(fallbackText, fallbackLang);
    } else if (src && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch((err) => {
        // eslint-disable-next-line no-console
        console.warn("[AudioPlayer] Playback failed:", err);
        // Try TTS fallback
        if (fallbackText) {
          playTTS(fallbackText, fallbackLang);
        }
      });
    }
  }, [useTTS, fallbackText, fallbackLang, src, playTTS]);

  // Auto-play effect
  useEffect(() => {
    if (autoPlay) {
      play();
    }
  }, [autoPlay, play]);

  const handlePlay = () => {
    play();
  };

  const handleAudioPlay = () => setIsPlaying(true);
  const handleAudioEnded = () => {
    setIsPlaying(false);
    onEnded?.();
  };
  const handleAudioPause = () => setIsPlaying(false);

  if (!showControls) {
    return src ? (
      // eslint-disable-next-line jsx-a11y/media-has-caption
      <audio ref={audioRef} src={src} onPlay={handleAudioPlay} onEnded={handleAudioEnded} onPause={handleAudioPause} />
    ) : null;
  }

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {src && (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <audio
          ref={audioRef}
          src={src}
          onPlay={handleAudioPlay}
          onEnded={handleAudioEnded}
          onPause={handleAudioPause}
        />
      )}
      <button
        type="button"
        onClick={handlePlay}
        className={`p-2 rounded-full transition-colors ${
          isPlaying ? "bg-blue-100 text-blue-600 animate-pulse" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
        }`}
        aria-label={isPlaying ? "Odtwarzanie..." : "Odtwórz"}
        disabled={isPlaying}
      >
        {isPlaying ? (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>
    </div>
  );
};

export default AudioPlayer;
