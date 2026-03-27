/**
 * Resolve preferred SpeechSynthesis voice by language and candidate names.
 */
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

  for (const preferred of normalizedPreferred) {
    const voice = voices.find((v) => v.name.toLowerCase().includes(preferred));
    if (voice) {
      return voice;
    }
  }

  const normalizedLang = lang.toLowerCase();
  const byExactLang = voices.find((v) => v.lang.toLowerCase() === normalizedLang);
  if (byExactLang) {
    return byExactLang;
  }

  const langPrefix = normalizedLang.split("-")[0];
  return voices.find((v) => v.lang.toLowerCase().startsWith(`${langPrefix}-`));
}
