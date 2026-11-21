import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../db/supabase.types";
import { z } from "zod";
import { approxAgeFromGrade, composeExtraChoices, researchArea } from "./extra-research";
import { ageYearsFromBirthDate } from "./household";
import { applyOperations, buildMonthSchedule, plannerProposalSchema, type PlannerOperation } from "./lesson-plan";
import { getUserTokenStatus, updateUserTokenUsage } from "./openai.service";
import { OpenRouterService } from "./openrouter.service";
import {
  clarifyingQuestion,
  describePlanContext,
  extrasMenu,
  extrasTools,
  menuChoices,
  placeChosenExtra,
  reviseProposedStart,
  executePlannerTools,
  interpretRequest,
  operationsForSavedPlan,
  type PlannerToolCall,
} from "./planner-skills";
import {
  completedEnglishSourceIds,
  loadLessonPlan,
  saveHouseholdLocality,
  storeChatTurn,
  storeProposal,
  unfinishedEnglishLessons,
  type LessonPlanSnapshot,
} from "./plan-store";

type Client = SupabaseClient<Database>;

const PROPOSAL_SCHEMA = {
  name: "lesson_plan_proposal",
  schema: {
    type: "object",
    required: ["summary", "operations"],
    properties: {
      summary: { type: "string" },
      operations: { type: "array" },
    },
  },
};

const TOOL_NAMES = [
  "plan_calendar",
  "add_subject",
  "place_subject",
  "remove_from_calendar",
  "ask",
  "read_locality",
  "set_locality",
  "propose_extras",
  "place_chosen_extra",
  "none",
] as const;

const argumentSchema = {
  type: "object",
  properties: {
    from: { type: "string" },
    until: { type: "string" },
    time: { type: "string" },
    subject: { type: "string" },
    subjects: { type: "array", items: { type: "string" } },
    title: { type: "string" },
    kind: { type: "string", enum: ["main", "extra"] },
    allSubjects: { type: "boolean" },
    question: { type: "string" },
    locality: { type: "string" },
    windows: {
      type: "array",
      items: {
        type: "object",
        required: ["start", "end"],
        properties: { start: { type: "string" }, end: { type: "string" } },
      },
    },
  },
};

const TOOL_SCHEMA = {
  name: "planner_tool_choice",
  schema: {
    type: "object",
    required: ["tools"],
    properties: {
      summary: { type: "string" },
      tools: {
        type: "array",
        items: {
          type: "object",
          required: ["tool"],
          properties: {
            tool: { type: "string", enum: [...TOOL_NAMES] },
            arguments: argumentSchema,
          },
        },
      },
    },
  },
};

const toolArgumentsSchema = z
  .object({
    from: z.string().optional(),
    until: z.string().optional(),
    time: z.string().optional(),
    subject: z.string().optional(),
    subjects: z.array(z.string()).optional(),
    title: z.string().optional(),
    kind: z.enum(["main", "extra"]).optional(),
    allSubjects: z.boolean().optional(),
    question: z.string().optional(),
    locality: z.string().optional(),
    windows: z.array(z.object({ start: z.string(), end: z.string() })).optional(),
  })
  .optional();

const toolChoiceSchema = z.object({
  summary: z.string().optional(),
  tools: z
    .array(
      z.object({
        tool: z.enum(TOOL_NAMES),
        arguments: toolArgumentsSchema,
      })
    )
    .max(6)
    .optional(),
  tool: z.enum(TOOL_NAMES).optional(),
  arguments: toolArgumentsSchema,
});

function toolPrompt(month: string, now: Date): string {
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return `Jesteś agentem planu lekcji. Masz w wiadomości listę przedmiotów, zajęte bloki i wolne godziny. Zwracasz wyłącznie JSON {"summary":"...","tools":[{"tool":"...","arguments":{...}}]}.
Narzędzia:
- plan_calendar: układa zakres od nowa. arguments: from, until (YYYY-MM-DD), windows [{start,end}], allSubjects, subjects (nazwy, gdy tylko wybrane).
- place_subject: dokłada jeden przedmiot na kalendarz, nie rusza innych bloków. arguments: subject, time (GG:MM), until.
- remove_from_calendar: zdejmuje zajęcia z kalendarza. Przedmiot zostaje na liście. arguments: subject (opcjonalnie), time (opcjonalnie), until.
- add_subject: dopisuje przedmiot do listy. arguments: title, subject, kind main|extra.
- ask: jedno pytanie do rodzica, gdy brakuje przedmiotu, godzin, zakresu albo okolicy. arguments: question. Samo, bez innych narzędzi. Pytanie trafia do czatu.
- read_locality: najpierw sprawdza zapisaną okolicę zamieszkania. Bez argumentów. Użyj tego przed zajęciami dodatkowymi.
- set_locality: zapisuje okolicę podaną przez rodzica. arguments: locality.
- propose_extras: sprawdza wiek dziecka w bazie, szuka w okolicy prawdziwych miejsc, gatunków i wydarzeń, potem podaje w czacie różne zajęcia do zaznaczenia. Nie układa kalendarza. arguments: locality.
- place_chosen_extra: dla zaznaczonego zajęcia proponuje jeden termin. Na kalendarz wchodzi dopiero po zatwierdzeniu. arguments: locality, title.
Nie usuwaj przedmiotów z listy. Nie wymyślaj place_block samodzielnie.
Pole history to poprzednie wiadomości. Jeśli sam pytałeś, odpowiedź rodzica domyka to pytanie.
"do końca miesiąca" przy miesiącu ${month} to until ostatni dzień tego miesiąca.
"dzień 26.11" to jeden dzień: from i until równe tej dacie. Nie rozciągaj go do zakresu od dziś.
"do 26.11" to until tego dnia, from zostaje dniem dzisiejszym.
"o godz. 10:00" i "tylko informatykę" to place_subject, nie plan_calendar.
"w godzinach 10-13" to windows 10:00-13:00. "wszystkich przedmiotów" to allSubjects true.
Dziś jest ${today}. Widoczny miesiąc: ${month}.`;
}

const SYSTEM_PROMPT = `Jesteś asystentem planu lekcji dziecka. Odpowiadasz po polsku.
Zwracasz wyłącznie JSON: {"summary":"...","operations":[...]}.
Dozwolone operacje:
- {"op":"upsert_curriculum_item","clientId":"nowe-1","kind":"main"|"extra","status":"proposed"|"accepted","title":"...","subject":"...","durationMinutes":25,"parentGuide":"..."}
- {"op":"delete_curriculum_item","id":"<uuid>"}
- {"op":"place_block","curriculumItemId":"<uuid>","startsAt":"<ISO>","endsAt":"<ISO>"}
- {"op":"move_block","id":"<uuid>","startsAt":"<ISO>","endsAt":"<ISO>"}
- {"op":"remove_block","id":"<uuid>"}
- {"op":"insert_break","startsAt":"<ISO>","endsAt":"<ISO>"}
Nie oznaczasz lekcji jako zrobionych. Na kalendarz kładziesz tylko pozycje accepted.
English to jedna pozycja listy o tytule English. Poszczególnych lekcji tego modułu nie dodawaj jako osobnych wierszy.
Nie układaj wielu lekcji jednego przedmiotu pod rząd. Rano przeplataj polski, matematykę i angielski. Po południu dawaj przyrodę, ruch, plastykę, muzykę, technikę i informatykę.
Zajęcia dodatkowe, które dopiero proponujesz, mają status proposed i nie dostają place_block.
Opis dla rodzica (parentGuide) mówi, co poruszyć z dzieckiem, co zobaczyć i jaki jest rys miejsca.
Terminy są w przyszłości, nie nachodzą na siebie, lekcje trwają 25 minut, po nich jest 5 minut przerwy.`;

export async function proposeMonthPlan(
  supabase: Client,
  input: { learnerId: string; authorUserId: string; month: string; now?: Date }
): Promise<{ proposalId: string } | { reply: string }> {
  const now = input.now ?? new Date();
  const [plan, completedSourceIds] = await Promise.all([
    loadLessonPlan(supabase, input.learnerId),
    completedEnglishSourceIds(supabase, input.learnerId),
  ]);
  const english = plan.items.find((item) => item.moduleKey === "english");
  const englishLessons = english ? await unfinishedEnglishLessons(supabase, input.learnerId) : [];
  const operations = buildMonthSchedule({
    items: plan.items,
    blocks: plan.blocks,
    completedSourceIds,
    month: input.month,
    now,
    moduleLessons: english ? { [english.id]: englishLessons } : undefined,
  });
  const placed = operations.filter((operation) => operation.op === "place_block");
  const request = `Zaplanuj kalendarz na miesiąc ${input.month}.`;
  if (placed.length === 0) {
    return remember(supabase, input, request, "Nie ma zaakceptowanych pozycji albo wolnego terminu w tym miesiącu.");
  }
  const checked = applyOperations(plan, operations, now);
  if ("error" in checked) return remember(supabase, input, request, checked.error);
  const proposalId = await storeProposal(supabase, {
    learnerId: input.learnerId,
    authorUserId: input.authorUserId,
    summary: `Układ miesiąca ${input.month}: rano polski, matematyka i angielski na zmianę, po południu pozostałe przedmioty. ${placed.length} zajęć po 25 minut.`,
    operations,
    month: input.month,
    userText: request,
  });
  return { proposalId };
}

export async function proposeFromAssistant(
  supabase: Client,
  input: { learnerId: string; authorUserId: string; month: string; text: string; job: "chat" | "extras"; now?: Date }
): Promise<{ proposalId: string } | { reply: string } | { error: string }> {
  const now = input.now ?? new Date();
  const plan = await loadLessonPlan(supabase, input.learnerId);
  const userText = input.job === "extras" ? "Zaproponuj zajęcia dodatkowe." : input.text;
  if (plan.proposal && input.job === "chat") {
    const revised = reviseProposedStart(plan.proposal.operations, userText, input.month, plan.blocks, now);
    if (revised) {
      if ("error" in revised) return remember(supabase, input, userText, revised.error);
      const checked = applyOperations(plan, revised.operations, now);
      if ("error" in checked) return remember(supabase, input, userText, checked.error);
      const proposalId = await storeProposal(supabase, {
        learnerId: input.learnerId,
        authorUserId: input.authorUserId,
        summary: revised.summary,
        operations: revised.operations,
        month: input.month,
        userText,
      });
      return { proposalId };
    }
  }
  const lastAssistant = [...plan.messages].reverse().find((message) => message.role === "assistant")?.content ?? "";
  const extras = extrasTools(userText, plan.locality, lastAssistant);
  if (extras) return runExtrasTools(supabase, { ...input, userText, plan }, extras);

  const tokens = await getUserTokenStatus(input.authorUserId, supabase);
  if (!tokens.canUseTokens(4000).canUse) {
    return remember(supabase, input, userText, "Wyczerpany miesięczny limit asystenta.");
  }

  const apiKey = import.meta.env.OPENROUTER_API_KEY;
  if (!apiKey) return remember(supabase, input, userText, "Brak klucza asystenta.");

  if (input.job === "chat") {
    const planned = await proposeCalendarWithTool(supabase, { ...input, now, plan, apiKey });
    if (planned) return planned;
  }

  const service = new OpenRouterService({
    apiKey,
    timeout: 60000,
    defaultModel: "openai/gpt-4o-mini",
    defaultModelParams: { temperature: 0.4, max_tokens: 2500 },
  });
  service.setSystemMessage(SYSTEM_PROMPT);
  service.setResponseFormat(PROPOSAL_SCHEMA);
  service.setModel("openai/gpt-4o-mini", { temperature: 0.4, max_tokens: 2500 });

  const instruction =
    input.job === "extras"
      ? `Zaproponuj trzy zajęcia dodatkowe (techniczne, plastyczne i terenowe) jako upsert ze statusem proposed. Nie kładź ich na kalendarz. Uwzględnij okolicę: ${plan.locality}. Terenowe mają być konkretne, na przykład las albo zielnik w tej okolicy. Każde dostaje parentGuide dla rodzica.`
      : input.text;

  const context = {
    month: input.month,
    locality: plan.locality,
    items: plan.items,
    blocks: plan.blocks,
    recentMessages: plan.messages.slice(-8).map((message) => ({ role: message.role, content: message.content })),
    request: instruction,
  };

  const result = await service.sendChatMessage<unknown>(JSON.stringify(context));
  await updateUserTokenUsage(input.authorUserId, result.usage.total_tokens, supabase);

  const parsed = plannerProposalSchema.safeParse(result.response);
  if (!parsed.success)
    return remember(supabase, input, userText, "Asystent zwrócił propozycję w niepoprawnym kształcie.");

  const operations = parsed.data.operations as PlannerOperation[];
  if (operations.some((operation) => operation.op === "delete_curriculum_item")) {
    return remember(
      supabase,
      input,
      userText,
      "Z listy przedmiotów nic nie usuwam. Mogę zdjąć zajęcia tylko z kalendarza."
    );
  }
  if (input.job === "extras" && operations.some((operation) => operation.op !== "upsert_curriculum_item")) {
    return remember(supabase, input, userText, "Propozycja zajęć dodatkowych może tylko dopisywać pozycje listy.");
  }
  const checked = applyOperations(plan, operations, now);
  if ("error" in checked) return remember(supabase, input, userText, checked.error);
  if (operations.length === 0) {
    return remember(
      supabase,
      input,
      userText,
      parsed.data.summary.trim() || "Asystent nie zaproponował żadnej zmiany."
    );
  }

  const proposalId = await storeProposal(supabase, {
    learnerId: input.learnerId,
    authorUserId: input.authorUserId,
    summary: parsed.data.summary,
    operations,
    month: input.month,
    userText,
  });
  return { proposalId };
}

async function proposeCalendarWithTool(
  supabase: Client,
  input: {
    learnerId: string;
    authorUserId: string;
    month: string;
    text: string;
    now: Date;
    plan: LessonPlanSnapshot;
    apiKey: string;
  }
): Promise<{ proposalId: string } | { reply: string } | null> {
  const fallback = interpretRequest(input.text, input.month, input.plan.items);
  if (fallback && "error" in fallback) return remember(supabase, input, input.text, fallback.error);

  const service = new OpenRouterService({
    apiKey: input.apiKey,
    timeout: 60000,
    defaultModel: "openai/gpt-4o-mini",
    defaultModelParams: { temperature: 0, max_tokens: 700 },
  });
  service.setSystemMessage(toolPrompt(input.month, input.now));
  service.setResponseFormat(TOOL_SCHEMA);
  service.setModel("openai/gpt-4o-mini", { temperature: 0, max_tokens: 700 });

  const pending = input.plan.proposal ? applyOperations(input.plan, input.plan.proposal.operations, input.now) : null;
  const draft = pending && !("error" in pending) ? pending.state : null;
  const context = draft
    ? `${describePlanContext(draft, input.month, input.now)}\n\nTo jest aktualna propozycja do dyskusji. Nie jest jeszcze w kalendarzu. Nowa rozpiska ma ją zastąpić.`
    : describePlanContext(input.plan, input.month, input.now);

  let modelTools: PlannerToolCall[] = [];
  try {
    const result = await service.sendChatMessage<unknown>(
      JSON.stringify({
        request: input.text,
        history: input.plan.messages.slice(-12).map((message) => ({ role: message.role, content: message.content })),
        context,
      })
    );
    await updateUserTokenUsage(input.authorUserId, result.usage.total_tokens, supabase);
    const parsed = toolChoiceSchema.safeParse(result.response);
    if (parsed.success) modelTools = toolsFromChoice(parsed.data);
  } catch {
    modelTools = [];
  }

  const fallbackTools = fallback && "tools" in fallback ? fallback.tools : [];
  const fallbackIsSpecific = fallbackTools.some(
    (call) => call.tool !== "plan_calendar" || Boolean(call.arguments.from)
  );
  const tools = fallbackIsSpecific ? fallbackTools : modelTools.length ? modelTools : fallbackTools;
  if (
    tools.some(
      (call) =>
        call.tool === "read_locality" ||
        call.tool === "set_locality" ||
        call.tool === "propose_extras" ||
        call.tool === "place_chosen_extra"
    ) &&
    !tools.some((call) => call.tool === "plan_calendar" || call.tool === "place_subject" || call.tool === "add_subject")
  ) {
    return runExtrasTools(supabase, { ...input, userText: input.text, plan: input.plan }, tools);
  }
  if (!fallbackIsSpecific) {
    const question = clarifyingQuestion(tools);
    if (question) return remember(supabase, input, input.text, question);
  }
  const actionable = tools.filter((call) => call.tool !== "ask");
  if (actionable.length === 0) return null;

  const english = input.plan.items.find((item) => item.moduleKey === "english");
  const [completedSourceIds, englishLessons] = await Promise.all([
    completedEnglishSourceIds(supabase, input.learnerId),
    english ? unfinishedEnglishLessons(supabase, input.learnerId) : Promise.resolve([]),
  ]);
  const base = draft ?? input.plan;
  const planned = executePlannerTools({
    tools: actionable,
    month: input.month,
    now: input.now,
    items: base.items,
    blocks: base.blocks,
    completedSourceIds,
    moduleLessons: english ? { [english.id]: englishLessons } : undefined,
  });
  if ("error" in planned) return remember(supabase, input, input.text, planned.error);

  const desired = applyOperations(base, planned.operations, input.now);
  if ("error" in desired) return remember(supabase, input, input.text, desired.error);
  const operations = operationsForSavedPlan(input.plan, desired.state);
  if (operations.length === 0) return remember(supabase, input, input.text, "Ta wiadomość nie zmienia propozycji.");
  const checked = applyOperations(input.plan, operations, input.now);
  planned.operations = operations;
  planned.summary = draft ? `Nowa propozycja: ${planned.summary}` : planned.summary;
  if ("error" in checked) return remember(supabase, input, input.text, checked.error);

  const proposalId = await storeProposal(supabase, {
    learnerId: input.learnerId,
    authorUserId: input.authorUserId,
    summary: planned.summary,
    operations: planned.operations,
    month: input.month,
    userText: input.text,
  });
  return { proposalId };
}

async function runExtrasTools(
  supabase: Client,
  input: {
    learnerId: string;
    authorUserId: string;
    month: string;
    userText: string;
    plan: LessonPlanSnapshot;
  },
  tools: PlannerToolCall[]
): Promise<{ proposalId: string } | { reply: string }> {
  const question = tools.find((call) => call.tool === "ask")?.arguments.question?.trim();
  if (question && !tools.some((call) => call.tool === "propose_extras" || call.tool === "set_locality")) {
    return remember(supabase, input, input.userText, question);
  }

  const chosen = tools.find((call) => call.tool === "place_chosen_extra");
  if (chosen?.arguments.locality && chosen.arguments.title) {
    const choice = [...input.plan.messages]
      .reverse()
      .flatMap((message) => (message.role === "assistant" ? menuChoices(message.content) : []))
      .find((row) => row.title === chosen.arguments.title);
    if (!choice) return remember(supabase, input, input.userText, "Nie widzę takiego zajęcia wśród propozycji.");
    const planned = placeChosenExtra(choice, input.plan.blocks, new Date());
    if ("error" in planned) return remember(supabase, input, input.userText, planned.error);
    const proposalId = await storeProposal(supabase, {
      learnerId: input.learnerId,
      authorUserId: input.authorUserId,
      summary: planned.summary,
      operations: planned.operations,
      month: input.month,
      userText: input.userText,
    });
    return { proposalId };
  }

  const place = tools.find((call) => call.tool === "set_locality")?.arguments.locality?.trim();
  const locality = place || tools.find((call) => call.tool === "propose_extras")?.arguments.locality?.trim() || "";
  if (!locality) {
    return remember(
      supabase,
      input,
      input.userText,
      "Najpierw sprawdź zapisaną okolicę. Nie ma jej, więc podaj miejscowość."
    );
  }
  if (place) await saveHouseholdLocality(supabase, input.authorUserId, place);
  await supabase
    .from("plan_proposals")
    .update({ status: "rejected" })
    .eq("learner_id", input.learnerId)
    .eq("status", "pending");
  const learner = await learnerContext(supabase, input.learnerId);
  const research = await researchArea(locality);
  const offered = [
    ...input.plan.items.map((item) => item.title),
    ...input.plan.messages.flatMap((message) => menuChoices(message.content).map((choice) => choice.title)),
  ];
  const choices = composeExtraChoices({ locality, ageYears: learner.years, research, offered });
  if (choices.length === 0) {
    return remember(
      supabase,
      input,
      input.userText,
      `Nie znalazłem miejsc, gatunków ani wydarzeń dla okolicy ${locality}. Sprawdź pisownię miejscowości i spróbuj jeszcze raz.`
    );
  }
  return remember(supabase, input, input.userText, extrasMenu(locality, choices, learner.label));
}

async function learnerContext(
  supabase: Client,
  learnerId: string
): Promise<{ years: number | null; label: string | null }> {
  const { data } = await supabase
    .from("profiles")
    .select("birth_date, school_grade")
    .eq("user_id", learnerId)
    .maybeSingle();
  const years = ageYearsFromBirthDate(data?.birth_date) ?? approxAgeFromGrade(data?.school_grade);
  if (years == null) return { years: null, label: null };
  const label = years === 1 ? "1 rok" : years >= 2 && years <= 4 ? `${years} lata` : `${years} lat`;
  return { years, label };
}

async function remember(
  supabase: Client,
  input: { learnerId: string; authorUserId: string },
  userText: string,
  assistantText: string
): Promise<{ reply: string }> {
  await storeChatTurn(supabase, {
    learnerId: input.learnerId,
    authorUserId: input.authorUserId,
    userText,
    assistantText,
  });
  return { reply: assistantText };
}

function toolsFromChoice(choice: z.infer<typeof toolChoiceSchema>): PlannerToolCall[] {
  const listed = (choice.tools ?? []).flatMap((call) =>
    call.tool === "none" ? [] : [{ tool: call.tool, arguments: call.arguments ?? {} }]
  );
  if (listed.length > 0) return listed;
  if (!choice.tool || choice.tool === "none") return [];
  return [{ tool: choice.tool, arguments: choice.arguments ?? {} }];
}
