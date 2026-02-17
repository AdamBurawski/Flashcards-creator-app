/**
 * English Answer Evaluator Service
 * Evaluates student answers using exact match and LLM fallback.
 * Generates Polish feedback with optional TTS audio.
 */

import type { EvaluateAnswerCommand, EvaluationResult } from "../types/english";
import { generateSpeechBase64, getFeedbackVoiceId } from "./elevenlabs.service";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const EVALUATION_MODEL = "openai/gpt-4o-mini";

/** Normalize text for comparison: lowercase, trim, collapse whitespace, remove trailing punctuation */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[.!?]+$/, "");
}

/** Check if user answer matches any accepted answer exactly */
function checkExactMatch(userAnswer: string, acceptedAnswers: string[]): boolean {
  const normalized = normalizeText(userAnswer);
  return acceptedAnswers.some((accepted) => normalizeText(accepted) === normalized);
}

/** Short praise phrases for correct answers */
const PRAISE_PHRASES = [
  "Świetnie! Dokładnie tak!",
  "Bardzo dobrze! Brawo!",
  "Super! Poprawna odpowiedź!",
  "Doskonale! Tak trzymaj!",
  "Rewelacja! Idealnie!",
];

function getRandomPraise(): string {
  return PRAISE_PHRASES[Math.floor(Math.random() * PRAISE_PHRASES.length)];
}

/**
 * Evaluate a student's answer using exact match and LLM fallback.
 * Returns evaluation result with Polish feedback text and optional audio.
 */
export async function evaluateStudentAnswer(
  command: EvaluateAnswerCommand,
  openrouterApiKey: string | undefined
): Promise<EvaluationResult> {
  // 1. Try exact match first
  if (checkExactMatch(command.user_answer, command.accepted_answers)) {
    const feedbackText = getRandomPraise();
    const feedbackAudio = await generateFeedbackAudio(feedbackText);

    return {
      is_correct: true,
      feedback_text: feedbackText,
      feedback_audio_url: feedbackAudio ?? undefined,
      correct_answer: command.expected_answer,
      correction_details: {
        grammar_ok: true,
        vocabulary_ok: true,
        structure_ok: true,
      },
    };
  }

  // 2. LLM evaluation fallback
  if (!openrouterApiKey) {
    // No API key — do simple comparison and return basic feedback
    return createBasicFeedback(command);
  }

  try {
    const llmResult = await callLLMEvaluation(command, openrouterApiKey);
    const feedbackAudio = await generateFeedbackAudio(llmResult.feedback_text);

    return {
      ...llmResult,
      feedback_audio_url: feedbackAudio ?? undefined,
    };
  } catch (error) {
    console.error("[english-evaluator] LLM evaluation failed:", error);
    return createBasicFeedback(command);
  }
}

/** Call LLM for answer evaluation */
async function callLLMEvaluation(command: EvaluateAnswerCommand, apiKey: string): Promise<EvaluationResult> {
  const systemPrompt = `Jesteś asystentem nauczyciela angielskiego dla polskich dzieci (wiek 6-12 lat).
Oceniasz odpowiedź ucznia na pytanie nauczyciela w dialogu konwersacyjnym.

Zasady:
- Odpowiedz w formacie JSON.
- Pole 'is_correct' (boolean): true jeśli odpowiedź jest poprawna gramatycznie i sensownie, nawet jeśli nie jest identyczna z wzorcem.
- Pole 'feedback_text' (string): krótki feedback PO POLSKU (max 2 zdania), przyjazny dla dziecka.
  - Jeśli poprawna: krótka pochwała, np. 'Świetnie!', 'Bardzo dobrze!', 'Super!'
  - Jeśli błędna: delikatna korekta wskazująca błąd i podająca poprawną formę. Np. 'Prawie! Zamiast X powiedz Y.'
- Pole 'grammar_ok' (boolean): czy gramatyka jest poprawna.
- Pole 'vocabulary_ok' (boolean): czy użyte słownictwo jest poprawne w kontekście.
- Pole 'structure_ok' (boolean): czy struktura zdania jest zgodna z ćwiczoną.
- Bądź DELIKATNY i ZACHĘCAJĄCY. To jest dziecko. Nigdy nie mów, że odpowiedź jest 'zła'. Używaj 'prawie', 'spróbuj', 'posłuchaj'.`;

  const userPrompt = `Pytanie nauczyciela: ${command.context.teacher_question}
Oczekiwana odpowiedź: ${command.expected_answer}
Ćwiczona struktura: ${command.target_structures.join(", ")}
Odpowiedź ucznia: ${command.user_answer}

Oceń odpowiedź ucznia. Odpowiedz WYŁĄCZNIE w formacie JSON:
{"is_correct": boolean, "feedback_text": string, "grammar_ok": boolean, "vocabulary_ok": boolean, "structure_ok": boolean}`;

  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: EVALUATION_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 300,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("Empty LLM response");
  }

  const parsed = JSON.parse(content);

  return {
    is_correct: Boolean(parsed.is_correct),
    feedback_text: String(parsed.feedback_text || ""),
    correct_answer: command.expected_answer,
    correction_details: {
      grammar_ok: Boolean(parsed.grammar_ok),
      vocabulary_ok: Boolean(parsed.vocabulary_ok),
      structure_ok: Boolean(parsed.structure_ok),
    },
  };
}

/** Create basic feedback without LLM (fallback) */
function createBasicFeedback(command: EvaluateAnswerCommand): EvaluationResult {
  const userNorm = normalizeText(command.user_answer);
  const expectedNorm = normalizeText(command.expected_answer);

  // Simple similarity check
  const isClose = userNorm.includes(expectedNorm) || expectedNorm.includes(userNorm);

  return {
    is_correct: false,
    feedback_text: isClose
      ? `Prawie dobrze! Poprawna odpowiedź to: "${command.expected_answer}"`
      : `Spróbuj jeszcze raz. Poprawna odpowiedź to: "${command.expected_answer}"`,
    correct_answer: command.expected_answer,
    correction_details: {
      grammar_ok: false,
      vocabulary_ok: false,
      structure_ok: false,
    },
  };
}

/** Generate TTS audio for feedback text (graceful degradation) */
async function generateFeedbackAudio(text: string): Promise<string | null> {
  const voiceId = getFeedbackVoiceId();
  if (!voiceId) {
    return null;
  }

  return generateSpeechBase64(text, voiceId);
}
