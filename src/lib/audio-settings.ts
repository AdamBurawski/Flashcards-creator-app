/**
 * Temporary audio mode switch.
 * When true, the app uses browser/system SpeechSynthesis only.
 */
export const USE_SYSTEM_TTS_ONLY = true;

/**
 * Preferred browser/system TTS voice names.
 * The app picks the first available match (case-insensitive substring).
 */
export const SYSTEM_TTS_VOICE_PREFERENCES = {
  enTeacher: ["Samantha", "Google US English", "Microsoft Aria", "Allison"],
  enPeer: ["Daniel", "Alex", "Google UK English Male", "Microsoft Ryan"],
  plNarrator: ["Zosia", "Google polski", "Microsoft Paulina", "Microsoft Zofia"],
} as const;
