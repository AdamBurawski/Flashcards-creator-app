/**
 * ElevenLabs TTS Service
 * Generates speech audio from text using the ElevenLabs API.
 * Used for real-time Polish feedback in the English learning module.
 */

const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1/text-to-speech";
const DEFAULT_MODEL_ID = "eleven_multilingual_v2";

interface TTSOptions {
  stability?: number;
  similarity_boost?: number;
  model_id?: string;
}

/**
 * Generate speech audio and return as base64-encoded data URL.
 * Returns null if ElevenLabs is not configured (graceful degradation).
 */
export async function generateSpeechBase64(
  text: string,
  voiceId: string,
  options: TTSOptions = {}
): Promise<string | null> {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn("[elevenlabs] ELEVENLABS_API_KEY not configured, skipping TTS");
    return null;
  }

  if (!voiceId) {
    console.warn("[elevenlabs] No voice ID provided, skipping TTS");
    return null;
  }

  try {
    const response = await fetch(`${ELEVENLABS_API_URL}/${voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: options.model_id ?? DEFAULT_MODEL_ID,
        voice_settings: {
          stability: options.stability ?? 0.5,
          similarity_boost: options.similarity_boost ?? 0.75,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[elevenlabs] TTS API error ${response.status}: ${errorText}`);
      return null;
    }

    const audioBuffer = await response.arrayBuffer();
    const base64 = bufferToBase64(audioBuffer);
    return `data:audio/mpeg;base64,${base64}`;
  } catch (error) {
    console.error("[elevenlabs] TTS generation failed:", error);
    return null;
  }
}

/**
 * Get the ElevenLabs API key from environment variables.
 */
function getApiKey(): string | undefined {
  try {
    return import.meta.env.ELEVENLABS_API_KEY;
  } catch {
    return process.env.ELEVENLABS_API_KEY;
  }
}

/**
 * Get the feedback voice ID for Polish TTS.
 */
export function getFeedbackVoiceId(): string {
  try {
    return import.meta.env.ELEVENLABS_FEEDBACK_VOICE_ID ?? "";
  } catch {
    return process.env.ELEVENLABS_FEEDBACK_VOICE_ID ?? "";
  }
}

/**
 * Convert an ArrayBuffer to a base64 string.
 */
function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
