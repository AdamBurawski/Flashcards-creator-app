/**
 * Resolve preferred SpeechSynthesis voice by language and candidate names.
 */
const voiceCache = new Map<string, string>();

export function resolvePreferredVoice(
  lang: string,
  preferredNames: readonly string[] = []
): SpeechSynthesisVoice | undefined {
  if (!("speechSynthesis" in window)) {
    return undefined;
  }

  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) {
    return undefined;
  }

  const normalizedPreferred = preferredNames.map((name) => name.toLowerCase());
  const normalizedLang = lang.toLowerCase();
  const langPrefix = normalizedLang.split("-")[0];
  const cacheKey = `${normalizedLang}::${normalizedPreferred.join("|")}`;
  const isLangMatch = (voice: SpeechSynthesisVoice): boolean => {
    const voiceLang = voice.lang.toLowerCase();
    return voiceLang === normalizedLang || voiceLang.startsWith(`${langPrefix}-`);
  };
  const languageCandidates = voices.filter((voice) => isLangMatch(voice));

  if (languageCandidates.length === 0) {
    return undefined;
  }

  const cachedVoiceUri = voiceCache.get(cacheKey);
  if (cachedVoiceUri) {
    const cachedVoice = languageCandidates.find((voice) => voice.voiceURI === cachedVoiceUri);
    if (cachedVoice) {
      return cachedVoice;
    }
  }

  // Prefer voices that match both requested language and preferred name.
  for (const preferred of normalizedPreferred) {
    const voice = languageCandidates.find((v) => v.name.toLowerCase().includes(preferred));
    if (voice) {
      voiceCache.set(cacheKey, voice.voiceURI);
      return voice;
    }
  }

  // If no preferred match by language was found, keep a stable fallback:
  // 1) exact locale, 2) default voice, 3) local voice, 4) first language match.
  const exactLocaleCandidates = languageCandidates.filter((voice) => voice.lang.toLowerCase() === normalizedLang);
  const byExactLang = exactLocaleCandidates.find((voice) => voice.default) ?? exactLocaleCandidates[0];
  if (byExactLang) {
    voiceCache.set(cacheKey, byExactLang.voiceURI);
    return byExactLang;
  }

  const languageDefault = languageCandidates.find((voice) => voice.default);
  if (languageDefault) {
    voiceCache.set(cacheKey, languageDefault.voiceURI);
    return languageDefault;
  }

  const localVoice = languageCandidates.find((voice) => voice.localService);
  if (localVoice) {
    voiceCache.set(cacheKey, localVoice.voiceURI);
    return localVoice;
  }

  const fallbackVoice = languageCandidates[0];
  voiceCache.set(cacheKey, fallbackVoice.voiceURI);
  return fallbackVoice;
}
