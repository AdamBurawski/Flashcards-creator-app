import type { CEFRLevel } from "../types/english";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const CONVERSATION_MODEL = "openai/gpt-4o-mini";

export interface ConversationHistoryEntry {
  role: "student" | "teacher";
  text: string;
}

export interface GenerateConversationReplyCommand {
  question: string;
  level: CEFRLevel;
  lesson_title: string;
  target_vocab: string[];
  target_structures: string[];
  history: ConversationHistoryEntry[];
}

export interface ConversationReplyResult {
  correction_text?: string;
  answer_text: string;
  teacher_question?: string;
  suggestions: string[];
}

export async function generateConversationReply(
  command: GenerateConversationReplyCommand,
  openrouterApiKey: string | undefined
): Promise<ConversationReplyResult> {
  if (!openrouterApiKey) {
    return createFallbackReply(command);
  }

  try {
    const result = await callOpenRouterConversation(command, openrouterApiKey);
    if (!result.answer_text.trim()) {
      return createFallbackReply(command);
    }
    return result;
  } catch (error) {
    console.error("[english-conversation] LLM conversation failed:", error);
    return createFallbackReply(command);
  }
}

async function callOpenRouterConversation(
  command: GenerateConversationReplyCommand,
  apiKey: string
): Promise<ConversationReplyResult> {
  const historyText = command.history
    .slice(-8)
    .map((entry) => `${entry.role === "student" ? "Student" : "Teacher"}: ${entry.text}`)
    .join("\n");

  const systemPrompt = `You are a friendly English teacher for Polish kids (age 6-12).
You are in a free conversation mode after a structured dialogue exercise.

Rules:
- Answer in SIMPLE ENGLISH only.
- Keep answers short: 1-3 sentences.
- Encourage speaking confidence and curiosity.
- Stay on child-safe topics.
- Use CEFR level guidance from the input.
- If the student asks in Polish, gently answer in easy English anyway.
- ALWAYS answer the student's question first. Do not dodge it.
- Ask a follow-up question only when it feels natural (not every turn).
- Follow-up question must be connected to the current lesson vocabulary/structures.
- Rotate topics gently; avoid drilling the same micro-topic repeatedly.
- Avoid unnatural or awkward questions (e.g. "What do you like about triangles?").
- If asked about unknown scene details, give a simple plausible classroom answer and continue naturally.
- Return ONLY valid JSON:
{
  "correction_text": "optional gentle correction in English, empty when not needed",
  "answer_text": "teacher reply in English",
  "teacher_question": "optional one short follow-up question in English",
  "suggestions": ["short follow-up question 1", "question 2", "question 3"]
}
- "teacher_question" is optional.
- If the student's sentence has a grammar mistake, set "correction_text" to one short,
  kind correction, e.g. "Almost! You can say: 'Is it a pen?'".
- If the student's sentence is fine, keep "correction_text" empty.
- Suggestions must be short, child-friendly questions in English (max 8 words each).`;

  const userPrompt = `CEFR level: ${command.level}
Lesson title: ${command.lesson_title}
Target vocabulary: ${command.target_vocab.join(", ")}
Target structures: ${command.target_structures.join(", ")}

Conversation history:
${historyText || "(empty)"}

Student question:
${command.question}
`;

  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: CONVERSATION_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.5,
      max_tokens: 260,
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
    throw new Error("Empty conversation response");
  }

  const parsed = JSON.parse(content) as {
    correction_text?: unknown;
    answer_text?: unknown;
    teacher_question?: unknown;
    suggestions?: unknown;
  };
  const correctionText = typeof parsed.correction_text === "string" ? parsed.correction_text.trim() : "";
  const answerText = typeof parsed.answer_text === "string" ? parsed.answer_text.trim() : "";
  const teacherQuestion = typeof parsed.teacher_question === "string" ? parsed.teacher_question.trim() : "";
  const suggestions = Array.isArray(parsed.suggestions)
    ? parsed.suggestions.filter((item): item is string => typeof item === "string").map((item) => item.trim())
    : [];

  return {
    correction_text: correctionText || undefined,
    answer_text: answerText,
    teacher_question: normalizeTeacherQuestion(teacherQuestion, command),
    suggestions: normalizeSuggestions(suggestions, command),
  };
}

function createFallbackReply(command: GenerateConversationReplyCommand): ConversationReplyResult {
  const answer = buildFallbackAnswer(command.question);
  const teacherQuestion = shouldAskFollowUp(command)
    ? buildVocabFollowUpQuestion(command)
    : undefined;

  return {
    correction_text: undefined,
    answer_text: answer,
    teacher_question: teacherQuestion,
    suggestions: normalizeSuggestions([], command),
  };
}

function normalizeTeacherQuestion(
  question: string,
  command: GenerateConversationReplyCommand
): string | undefined {
  const cleaned = question.replace(/\s+/g, " ").trim();
  if (cleaned.length > 0 && isQuestionRelevantToLesson(cleaned, command)) {
    return cleaned;
  }

  if (!shouldAskFollowUp(command)) {
    return undefined;
  }

  return buildVocabFollowUpQuestion(command);
}

function normalizeSuggestions(
  suggestions: string[],
  command: GenerateConversationReplyCommand
): string[] {
  const cleaned = suggestions
    .map((item) => item.replace(/\s+/g, " ").trim())
    .filter((item) => item.length > 0 && isQuestionRelevantToLesson(item, command))
    .slice(0, 3);

  if (cleaned.length === 3) {
    return cleaned;
  }

  const vocabSeed = command.target_vocab
    .filter((word) => typeof word === "string" && word.trim().length > 0)
    .slice(0, 3);

  const fallbackFromVocab = vocabSeed.flatMap((word) => [
    `What is ${word}?`,
    `Can you say ${word} in a sentence?`,
  ]);

  const genericFallback = [
    "Where is the chair?",
    "What can you see?",
    "Can you ask me another question?",
  ];

  const merged = [...cleaned, ...fallbackFromVocab, ...genericFallback];
  const unique = Array.from(new Set(merged));
  return unique.slice(0, 3);
}

function shouldAskFollowUp(command: GenerateConversationReplyCommand): boolean {
  const studentTurns = command.history.filter((entry) => entry.role === "student").length;
  return studentTurns % 2 === 0;
}

function isQuestionRelevantToLesson(question: string, command: GenerateConversationReplyCommand): boolean {
  const normalizedQuestion = question.toLowerCase();
  const vocab = command.target_vocab.map((item) => item.toLowerCase().trim()).filter(Boolean);
  const structures = command.target_structures.map((item) => item.toLowerCase().trim()).filter(Boolean);

  if (vocab.some((word) => normalizedQuestion.includes(word))) {
    return true;
  }

  if (structures.some((item) => normalizedQuestion.includes(item))) {
    return true;
  }

  // Accept basic scene-oriented prompts as a fallback when explicit vocab is absent.
  return /(picture|classroom|room|desk|chair|window|book|pen|clock)/i.test(question);
}

function buildVocabFollowUpQuestion(command: GenerateConversationReplyCommand): string {
  const vocab = command.target_vocab.filter((item) => item.trim().length > 0);
  const recentTeacherText = command.history
    .filter((entry) => entry.role === "teacher")
    .slice(-4)
    .map((entry) => entry.text.toLowerCase())
    .join(" ");

  const nextWord = vocab.find((word) => !recentTeacherText.includes(word.toLowerCase())) ?? vocab[0];

  if (nextWord) {
    return `Can you ask a question with "${nextWord}"?`;
  }

  return "Can you ask about something in this picture?";
}

function buildFallbackAnswer(question: string): string {
  const normalized = question.toLowerCase();

  if (normalized.includes("who")) {
    return "He looks like a student in the classroom.";
  }

  if (normalized.includes("where")) {
    return "It seems to be in the classroom.";
  }

  if (normalized.includes("what")) {
    return "I can see classroom objects like a desk and a chair.";
  }

  return "Good question! Let's keep practicing with simple English.";
}
