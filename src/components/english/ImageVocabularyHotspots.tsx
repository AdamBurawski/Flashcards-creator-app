import React, { useMemo, useRef, useState } from "react";
import { SYSTEM_TTS_VOICE_PREFERENCES, USE_SYSTEM_TTS_ONLY } from "../../lib/audio-settings";
import { getDialogueImageHotspots, type ImageVocabularyHotspot } from "../../lib/english-image-hotspots";
import ReplayButton from "./ReplayButton";
import { resolvePreferredVoice } from "../../lib/system-tts";

interface ImageVocabularyHotspotsProps {
  dialogueId?: string;
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

async function fetchNarratorAudio(text: string): Promise<string | undefined> {
  if (USE_SYSTEM_TTS_ONLY) return undefined;
  try {
    const res = await fetch("/api/english/narrator-audio", {
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

async function playAudioSource(src: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const audio = new Audio(src);
    audio.onended = () => resolve();
    audio.onerror = () => reject(new Error("Audio playback failed"));
    void audio.play().catch(reject);
  });
}

async function speakWithSystemTTS(
  text: string,
  lang: string,
  preferredVoiceNames: readonly string[],
  playbackToken: number,
  activeTokenRef: React.MutableRefObject<number>
): Promise<void> {
  if (!("speechSynthesis" in window)) return;
  if (activeTokenRef.current !== playbackToken) return;

  await new Promise<void>((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.92;
    const preferredVoice = resolvePreferredVoice(lang, preferredVoiceNames);
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}

const ImageVocabularyHotspots: React.FC<ImageVocabularyHotspotsProps> = ({ dialogueId }) => {
  const hotspots = useMemo(() => getDialogueImageHotspots(dialogueId), [dialogueId]);
  const [activeHotspotId, setActiveHotspotId] = useState<string | null>(null);
  const [enAudioCache, setEnAudioCache] = useState<Record<string, string | null>>({});
  const [plAudioCache, setPlAudioCache] = useState<Record<string, string | null>>({});
  const activePlaybackTokenRef = useRef(0);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeHotspot = hotspots.find((hotspot) => hotspot.id === activeHotspotId) ?? null;

  if (!hotspots.length) return null;

  const clearCloseTimer = (): void => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const scheduleClose = (): void => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      setActiveHotspotId(null);
    }, 180);
  };

  const ensureHotspotAudio = async (
    hotspot: ImageVocabularyHotspot,
    lang: "en" | "pl"
  ): Promise<string | undefined> => {
    const cache = lang === "en" ? enAudioCache : plAudioCache;
    const cached = cache[hotspot.id];
    if (cached !== undefined) return cached ?? undefined;

    const fetched =
      lang === "en" ? await fetchTeacherAudio(hotspot.word_en) : await fetchNarratorAudio(hotspot.word_pl);

    if (lang === "en") {
      setEnAudioCache((prev) => ({ ...prev, [hotspot.id]: fetched ?? null }));
    } else {
      setPlAudioCache((prev) => ({ ...prev, [hotspot.id]: fetched ?? null }));
    }
    return fetched;
  };

  const playHotspotAudio = async (hotspot: ImageVocabularyHotspot): Promise<void> => {
    const playbackToken = activePlaybackTokenRef.current + 1;
    activePlaybackTokenRef.current = playbackToken;
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    const enSrc = await ensureHotspotAudio(hotspot, "en");
    if (activePlaybackTokenRef.current !== playbackToken) return;

    if (enSrc) {
      try {
        await playAudioSource(enSrc);
      } catch {
        await speakWithSystemTTS(
          hotspot.word_en,
          "en-US",
          SYSTEM_TTS_VOICE_PREFERENCES.enTeacher,
          playbackToken,
          activePlaybackTokenRef
        );
      }
    } else {
      await speakWithSystemTTS(
        hotspot.word_en,
        "en-US",
        SYSTEM_TTS_VOICE_PREFERENCES.enTeacher,
        playbackToken,
        activePlaybackTokenRef
      );
    }

    if (activePlaybackTokenRef.current !== playbackToken) return;

    const plSrc = await ensureHotspotAudio(hotspot, "pl");
    if (activePlaybackTokenRef.current !== playbackToken) return;

    if (plSrc) {
      try {
        await playAudioSource(plSrc);
      } catch {
        await speakWithSystemTTS(
          hotspot.word_pl,
          "pl-PL",
          SYSTEM_TTS_VOICE_PREFERENCES.plNarrator,
          playbackToken,
          activePlaybackTokenRef
        );
      }
      return;
    }

    await speakWithSystemTTS(
      hotspot.word_pl,
      "pl-PL",
      SYSTEM_TTS_VOICE_PREFERENCES.plNarrator,
      playbackToken,
      activePlaybackTokenRef
    );
  };

  const activateHotspot = (hotspot: ImageVocabularyHotspot): void => {
    clearCloseTimer();
    setActiveHotspotId(hotspot.id);
    void playHotspotAudio(hotspot);
  };

  return (
    <div className="pointer-events-none absolute inset-0" onMouseLeave={scheduleClose}>
      {hotspots.map((hotspot) => {
        const isActive = hotspot.id === activeHotspotId;
        return (
          <button
            key={hotspot.id}
            type="button"
            aria-label={`${hotspot.word_en} — ${hotspot.word_pl}`}
            className={`pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-all ${
              isActive
                ? "h-6 w-6 border-indigo-600 bg-indigo-300/85 shadow-[0_0_0_6px_rgba(99,102,241,0.24)]"
                : "h-5 w-5 border-amber-500 bg-amber-300/80 hover:scale-110 hover:bg-amber-300/95"
            }`}
            style={{ left: `${hotspot.x}%`, top: `${hotspot.y}%` }}
            onMouseEnter={() => activateHotspot(hotspot)}
            onMouseLeave={scheduleClose}
            onFocus={() => activateHotspot(hotspot)}
            onBlur={scheduleClose}
            onClick={() => activateHotspot(hotspot)}
          />
        );
      })}

      {activeHotspot && (
        <div
          className="pointer-events-auto absolute z-20 w-64 -translate-x-1/2 rounded-2xl border border-indigo-100 bg-gradient-to-br from-white via-indigo-50/70 to-white p-3 shadow-[0_12px_28px_rgba(15,23,42,0.18)] backdrop-blur-sm"
          style={{
            left: `${activeHotspot.x}%`,
            top: `${Math.max(activeHotspot.y - 12, 10)}%`,
          }}
          onMouseEnter={clearCloseTimer}
          onMouseLeave={scheduleClose}
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="rounded-full border border-indigo-200 bg-indigo-100/80 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-indigo-700">
              SLOWKO
            </span>
            <span className="text-[10px] font-medium text-slate-400">hover / tap</span>
          </div>
          <p className="text-base font-semibold leading-none text-indigo-900">{activeHotspot.word_en}</p>
          <p className="mt-1 text-sm text-slate-600">{activeHotspot.word_pl}</p>
          <div className="mt-3 flex gap-2">
            <ReplayButton
              text={activeHotspot.word_en}
              lang="en-US"
              audioSrc={enAudioCache[activeHotspot.id] ?? undefined}
              label="EN"
              preferredVoiceNames={SYSTEM_TTS_VOICE_PREFERENCES.enTeacher}
            />
            <ReplayButton
              text={activeHotspot.word_pl}
              lang="pl-PL"
              audioSrc={plAudioCache[activeHotspot.id] ?? undefined}
              label="PL"
              preferredVoiceNames={SYSTEM_TTS_VOICE_PREFERENCES.plNarrator}
            />
          </div>
          <div className="pointer-events-none absolute -bottom-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-b border-r border-indigo-100 bg-white/95" />
        </div>
      )}
    </div>
  );
};

export default ImageVocabularyHotspots;
