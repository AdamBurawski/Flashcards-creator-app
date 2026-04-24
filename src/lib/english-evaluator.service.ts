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
  const systemPrompt = `You are an English-learning assistant for Polish children (age 6-12).
You evaluate a student's answer to a teacher question in a dialogue.

Rules:
- Respond ONLY in JSON format.
- Mark an answer as correct if it is:
  1) logically correct in context,
  2) grammatically acceptable for learner level,
  3) communicatively equivalent, even with different wording.
- Do NOT require exact wording from the model answer.
- Accept natural variants, e.g.:
  - contractions/full forms (it's / it is, I'm / I am),
  - shorter or longer valid answers (e.g. "No" or full sentence),
  - minor lexical differences when meaning is preserved,
  - valid paraphrases.
- Field 'is_correct' (boolean): true for semantically and linguistically correct answers, even if not identical to expected answer.
- Field 'feedback_text' (string): short feedback in POLISH (max 2 sentences), child-friendly.
  - If correct: short praise.
  - If incorrect: gentle correction with an example of the correct form.
- Field 'grammar_ok' (boolean): grammar quality.
- Field 'vocabulary_ok' (boolean): vocabulary suitability for context.
- Field 'structure_ok' (boolean): structure suitability for target pattern (not necessarily identical).
- Be gentle and encouraging. This is a child. Never say the answer is "bad". Use phrases like "almost", "try", "listen".
- The student is a girl. In Polish feedback, use feminine forms when needed.
`;

  const userPrompt = `Teacher question: ${command.context.teacher_question}
Expected answer: ${command.expected_answer}
Accepted answers (examples): ${command.accepted_answers.join(" | ")}
Target structures: ${command.target_structures.join(", ")}
Student answer: ${command.user_answer}

Evaluate flexibly: prioritize meaning, correctness, and naturalness over literal matching.
Respond ONLY in JSON format:
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
