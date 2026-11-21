import {
  applyOperations,
  buildMonthSchedule,
  dateFromKey,
  DEFAULT_PLAN_WINDOWS,
  localDateKey,
  subjectKey,
  type CurriculumItem,
  type MinuteWindow,
  type ModuleLesson,
  type PlanState,
  type PlannerOperation,
  type ScheduleBlock,
} from "./lesson-plan";

export interface ClockWindow {
  start: string;
  end: string;
}

export interface PlanCalendarArguments {
  from?: string;
  until?: string;
  windows?: ClockWindow[];
  allSubjects?: boolean;
  subjects?: string[];
  subject?: string;
  title?: string;
  time?: string;
  kind?: "main" | "extra";
  question?: string;
  outside?: boolean;
}

export type PlannerToolName =
  | "plan_calendar"
  | "add_subject"
  | "place_subject"
  | "remove_from_calendar"
  | "ask"
  | "read_locality"
  | "set_locality"
  | "propose_extras"
  | "place_chosen_extra";

export interface PlannerToolCall {
  tool: PlannerToolName;
  arguments: PlanCalendarArguments;
}

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/;

export function lastDayOfMonth(month: string): string {
  const [yearText, monthText] = month.split("-");
  const last = new Date(Number(yearText), Number(monthText), 0, 12);
  return localDateKey(last);
}

export function parseClock(value: string): number | null {
  const match = CLOCK.exec(value.trim());
  if (!match) return null;
  const [hourText, minuteText] = value.trim().split(":");
  return Number(hourText) * 60 + Number(minuteText);
}

export function parsePlanWindows(windows: ClockWindow[] | undefined): MinuteWindow[] | { error: string } {
  if (!windows?.length) return DEFAULT_PLAN_WINDOWS;
  const parsed: MinuteWindow[] = [];
  for (const window of windows) {
    const start = parseClock(window.start);
    const end = parseClock(window.end);
    if (start === null || end === null) return { error: "Godziny zapisz jako GG:MM." };
    if (end - start < 25) return { error: "Okno musi pomieścić lekcję 25 minut." };
    parsed.push({ start, end });
  }
  return parsed;
}

function clockLabel(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

const MONTH_NAMES: [string, number][] = [
  ["stycznia", 1],
  ["lutego", 2],
  ["marca", 3],
  ["kwietnia", 4],
  ["maja", 5],
  ["czerwca", 6],
  ["lipca", 7],
  ["sierpnia", 8],
  ["wrzesnia", 9],
  ["września", 9],
  ["pazdziernika", 10],
  ["października", 10],
  ["listopada", 11],
  ["grudnia", 12],
];

function dateKey(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const probe = new Date(year, month - 1, day, 12);
  if (probe.getMonth() !== month - 1 || probe.getDate() !== day) return null;
  return localDateKey(probe);
}

export function explicitSpan(text: string, month: string): { from?: string; until?: string } {
  const pageYear = Number(month.slice(0, 4));
  const mentions: { key: string; cue: "from" | "until" | "day" | "bare" }[] = [];
  const numeric = /(?:(od|do|dzień|dzien|dnia)\s+)?(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?/gi;
  for (const match of text.matchAll(numeric)) {
    const year = match[4] ? (Number(match[4]) < 100 ? 2000 + Number(match[4]) : Number(match[4])) : pageYear;
    const key = dateKey(year, Number(match[3]), Number(match[2]));
    if (!key) continue;
    const cue = match[1]?.toLocaleLowerCase("pl");
    mentions.push({
      key,
      cue: cue === "od" ? "from" : cue === "do" ? "until" : cue ? "day" : "bare",
    });
  }
  const named = new RegExp(
    `(?:(od|do|dzień|dzien|dnia)\\s+)?(\\d{1,2})\\s+(${MONTH_NAMES.map(([name]) => name).join("|")})`,
    "gi"
  );
  for (const match of text.matchAll(named)) {
    const monthNumber = MONTH_NAMES.find(([name]) => name === match[3].toLocaleLowerCase("pl"))?.[1];
    if (!monthNumber) continue;
    const key = dateKey(pageYear, monthNumber, Number(match[2]));
    if (!key) continue;
    const cue = match[1]?.toLocaleLowerCase("pl");
    mentions.push({
      key,
      cue: cue === "od" ? "from" : cue === "do" ? "until" : cue ? "day" : "bare",
    });
  }

  const fromCue = mentions.find((mention) => mention.cue === "from");
  const untilCue = mentions.find((mention) => mention.cue === "until");
  const dayCue = mentions.find((mention) => mention.cue === "day");
  if (fromCue && untilCue) return { from: fromCue.key, until: untilCue.key };
  if (dayCue && !untilCue) return { from: dayCue.key, until: dayCue.key };
  if (untilCue) return { until: untilCue.key };
  if (
    mentions.length === 1 &&
    mentions[0].cue === "bare" &&
    /zaplanuj|dodaj|ułoż|uloz/i.test(text) &&
    !/końca|konca/i.test(text)
  ) {
    return { from: mentions[0].key, until: mentions[0].key };
  }
  return {};
}

export function fallbackPlanArguments(text: string, month: string): PlanCalendarArguments | null {
  if (!/kalendarz|zaplanuj|ułoż|uloz/i.test(text)) return null;
  const args: PlanCalendarArguments = {};
  if (/końca|konca/i.test(text)) args.until = lastDayOfMonth(month);
  const span = explicitSpan(text, month);
  if (span.from) args.from = span.from;
  if (span.until) args.until = span.until;
  const hours = /(\d{1,2})\s*[-–]\s*(\d{1,2})/.exec(text);
  if (hours) {
    args.windows = [
      {
        start: `${hours[1].padStart(2, "0")}:00`,
        end: `${hours[2].padStart(2, "0")}:00`,
      },
    ];
  }
  if (/wszystk/i.test(text)) args.allSubjects = true;
  return args;
}

export function mergePlanArguments(
  chosen: PlanCalendarArguments | undefined,
  fallback: PlanCalendarArguments | null
): PlanCalendarArguments {
  return {
    from: chosen?.from ?? fallback?.from,
    until: chosen?.until ?? fallback?.until,
    windows: chosen?.windows?.length ? chosen.windows : fallback?.windows,
    allSubjects: Boolean(chosen?.allSubjects || fallback?.allSubjects),
    subjects: chosen?.subjects?.length ? chosen.subjects : fallback?.subjects,
    subject: chosen?.subject ?? fallback?.subject,
    title: chosen?.title ?? fallback?.title,
    time: chosen?.time ?? fallback?.time,
    kind: chosen?.kind ?? fallback?.kind,
  };
}

export function planCalendar(input: {
  month: string;
  now: Date;
  args: PlanCalendarArguments;
  items: CurriculumItem[];
  blocks: ScheduleBlock[];
  completedSourceIds: string[];
  moduleLessons?: Record<string, ModuleLesson[]>;
}): { operations: PlannerOperation[]; summary: string } | { error: string } {
  const monthStart = `${input.month}-01`;
  const monthEnd = lastDayOfMonth(input.month);
  const today = localDateKey(input.now);
  const requestedFrom =
    input.args.from && DATE_KEY.test(input.args.from) ? input.args.from : today < monthStart ? monthStart : today;
  const requestedUntil = input.args.until && DATE_KEY.test(input.args.until) ? input.args.until : monthEnd;
  const rangeFrom = requestedFrom < monthStart ? monthStart : requestedFrom;
  const rangeUntil = requestedUntil > monthEnd ? monthEnd : requestedUntil;
  if (rangeFrom > rangeUntil) return { error: "Ten zakres nie mieści się w wybranym miesiącu." };

  let items = input.items;
  if (input.args.subjects?.length) {
    const names = input.args.subjects;
    items = input.items.filter((item) => names.some((name) => subjectsMatch(item, name)));
    if (items.length === 0) return { error: "Nie ma takiego przedmiotu na liście." };
    if (!items.some((item) => item.status === "accepted")) {
      return { error: "Ten przedmiot jest tylko propozycją. Najpierw trzeba go zaakceptować." };
    }
  }

  const windows = parsePlanWindows(input.args.windows);
  if ("error" in windows) return windows;

  const operations = buildMonthSchedule({
    items,
    blocks: input.blocks,
    completedSourceIds: input.completedSourceIds,
    month: input.month,
    now: input.now,
    moduleLessons: input.moduleLessons,
    windows,
    rangeFrom,
    rangeUntil,
    mixAllSubjects: input.args.allSubjects,
  });
  const placed = operations.filter((operation) => operation.op === "place_block");
  if (placed.length === 0) return { error: "W tym zakresie nie ma już wolnego terminu." };

  const hours = windows.map((window) => `${clockLabel(window.start)}–${clockLabel(window.end)}`).join(", ");
  const mix = input.args.subjects?.length
    ? input.args.subjects.join(", ")
    : input.args.allSubjects
      ? "wszystkie przedmioty na zmianę"
      : "przedmioty na zmianę";
  return {
    operations,
    summary: `Kalendarz ${rangeFrom}–${rangeUntil}, godziny ${hours}: ${placed.length} zajęć po 25 minut, ${mix}.`,
  };
}

function subjectStem(value: string): string {
  const key = subjectKey(value).replace(/[^a-ząćęłńóśźż0-9]/g, "");
  if (key.length <= 5) return key;
  return key.slice(0, key.length - 2);
}

export function subjectsMatch(item: Pick<CurriculumItem, "subject" | "title">, query: string): boolean {
  const needle = subjectStem(query);
  return [item.subject, item.title].some((value) => {
    const stem = subjectStem(value);
    return stem.includes(needle) || needle.includes(stem);
  });
}

function mentionedInOrder<T extends Pick<CurriculumItem, "subject" | "title">>(text: string, items: T[]): T[] {
  const haystack = subjectKey(text);
  return items
    .flatMap((item) => {
      const index = [item.subject, item.title]
        .map((value) => haystack.indexOf(subjectStem(value)))
        .filter((found) => found >= 0)
        .sort((left, right) => left - right)[0];
      return index === undefined ? [] : [{ item, index }];
    })
    .sort((left, right) => left.index - right.index)
    .map((row) => row.item);
}

function hourWindow(text: string): { start: number; end: number } | null {
  const hours = /(\d{1,2})\s*[-–]\s*(\d{1,2})/.exec(text);
  if (!hours) return null;
  const start = Number(hours[1]) * 60;
  const end = Number(hours[2]) * 60;
  if (end - start < 25 || start > 24 * 60 || end > 24 * 60) return null;
  return { start, end };
}

function singleClock(text: string): string | null {
  const match = /o\s+godz(?:inie)?\.?\s*(\d{1,2})(?::(\d{2}))?/i.exec(text);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2] ?? "0");
  if (hour > 23 || minute > 59) return null;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function interpretRequest(
  text: string,
  month: string,
  items: Pick<CurriculumItem, "subject" | "title">[]
): { tools: PlannerToolCall[] } | { error: string } | null {
  if (/z\s+listy/i.test(text) && /usuń|usun|skasuj/i.test(text)) {
    return { error: "Z listy przedmiotów nic nie usuwam. Mogę zdjąć zajęcia tylko z kalendarza." };
  }

  const mentioned = mentionedInOrder(text, items);
  const span = explicitSpan(text, month);
  const singleDay = span.from && span.from === span.until ? span.from : undefined;
  const until = span.until ?? (/końca|konca/i.test(text) ? lastDayOfMonth(month) : undefined);
  const clock = singleClock(text);
  const oneSubject = mentioned.length === 1 ? mentioned[0].subject : undefined;

  if (singleDay && /wyczyść|wyczysc|pozostał/i.test(text)) {
    return {
      tools: [{ tool: "remove_from_calendar", arguments: { from: singleDay, until: singleDay, outside: true } }],
    };
  }

  if (singleDay && mentioned.length > 0 && /zaplanuj|dodaj|ułoż|uloz/i.test(text) && !clock) {
    const window = hourWindow(text) ?? { start: 9 * 60, end: 17 * 60 };
    const tools: PlannerToolCall[] = [];
    let minute = window.start;
    for (const item of mentioned) {
      if (minute + 25 > window.end) break;
      tools.push({
        tool: "place_subject",
        arguments: {
          subject: item.subject,
          time: clockLabel(minute),
          from: singleDay,
          until: singleDay,
        },
      });
      minute += 30;
    }
    if (tools.length === 0) return { error: "To okno nie mieści tych zajęć." };
    if (tools.length < mentioned.length) {
      return { error: "W podanych godzinach mieszczą się tylko niektóre z tych przedmiotów." };
    }
    return { tools };
  }

  if (clock && /tylko|dodaj/i.test(text) && oneSubject) {
    return {
      tools: [
        {
          tool: "place_subject",
          arguments: { subject: oneSubject, time: clock, from: span.from, until },
        },
      ],
    };
  }

  const moved = /(?:przesuń|przesun|przełoż|przeloz)[\s\S]{0,40}na\s+(\d{1,2})(?::(\d{2}))?/i.exec(text);
  if (moved && oneSubject) {
    const hour = Number(moved[1]);
    const minute = Number(moved[2] ?? "0");
    if (hour <= 23 && minute <= 59) {
      const time = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
      return {
        tools: [
          { tool: "remove_from_calendar", arguments: { subject: oneSubject, until } },
          { tool: "place_subject", arguments: { subject: oneSubject, time, until } },
        ],
      };
    }
  }

  if (/usuń|usun|zdejmij|wyczyść|wyczysc/i.test(text)) {
    return { tools: [{ tool: "remove_from_calendar", arguments: { subject: oneSubject, until } }] };
  }

  const added = /dodaj(?:\s+nowy)?\s+przedmiot\s+([^.\n]+)/i.exec(text);
  if (added) {
    const title = added[1].trim();
    return { tools: [{ tool: "add_subject", arguments: { title, subject: title, kind: "main" } }] };
  }

  if (!/kalendarz|zaplanuj|ułoż|uloz/i.test(text)) return null;
  const plan = fallbackPlanArguments(text, month) ?? {};
  if (/tylko/i.test(text) && oneSubject) plan.subjects = [oneSubject];
  return { tools: [{ tool: "plan_calendar", arguments: plan }] };
}

const LOCALITY_ASK =
  "Nie mam zapisanej okolicy zamieszkania. Napisz miejscowość albo okolicę, a zaproponuję zajęcia do wyboru.";

export interface ExtraChoice {
  title: string;
  subject: string;
  parentGuide: string;
}

export function menuChoices(menu: string): ExtraChoice[] {
  const choices: ExtraChoice[] = [];
  for (const chunk of menu.split(/\n(?=\d+\.\s)/)) {
    const title = /^\d+\.\s+(.+)$/m.exec(chunk)?.[1]?.trim();
    if (!title) continue;
    const subject = /^Przedmiot:\s*(.+)$/m.exec(chunk)?.[1]?.trim() || "Teren";
    const parentGuide = /^Przewodnik:\s*(.+)$/m.exec(chunk)?.[1]?.trim() || "Rodzic jest obok przez całe zajęcia.";
    choices.push({ title, subject, parentGuide });
  }
  return choices;
}

export function extrasMenu(locality: string, choices: ExtraChoice[], ageLabel: string | null): string {
  const who = ageLabel
    ? ` dla dziecka w wieku ${ageLabel}`
    : " (w profilu nie ma wieku, więc zajęcia są krótkie i z rodzicem)";
  const count = choices.length === 1 ? "jedno zajęcie" : `${choices.length} różne zajęcia`;
  const lines = choices.map(
    (choice, index) => `${index + 1}. ${choice.title}\nPrzedmiot: ${choice.subject}\nPrzewodnik: ${choice.parentGuide}`
  );
  return `W okolicy ${locality.trim()}${who} proponuję ${count}. Miejsca, gatunki i wydarzenia biorę z mapy oraz obserwacji w tej okolicy. Zaznacz, które ułożyć w kalendarzu:\n${lines.join("\n")}`;
}

export function chosenExtra(text: string, menu: string): ExtraChoice | null {
  const choices = menuChoices(menu);
  if (choices.length === 0) return null;
  const explicit = /^wybieram:\s*(.+)$/i.exec(text.trim())?.[1]?.trim();
  const picked = explicit ?? text.trim();
  const number = /^(\d+)$/.exec(picked);
  if (number) return choices[Number(number[1]) - 1] ?? null;
  const haystack = subjectKey(picked);
  return (
    choices.find(
      (choice) => haystack.includes(subjectKey(choice.title)) || subjectKey(choice.title).includes(haystack)
    ) ??
    choices.find((choice) => {
      const hint = choice.title.split(" ")[0]?.toLocaleLowerCase("pl") ?? "";
      return hint.length > 3 && haystack.includes(hint);
    }) ??
    null
  );
}

export function isExtrasRequest(text: string): boolean {
  return /zaj[eę]cia dodatkowe|zaproponuj zaj/i.test(text);
}

export function localityAnswer(text: string, lastAssistant: string): string | null {
  if (/zaznacz, które/i.test(lastAssistant)) return null;
  if (!/okolic|miejscowo/i.test(lastAssistant)) return null;
  if (isExtrasRequest(text) || /zaplanuj|kalendarz|godz|przesu|przel|usu[nń]|zdejmij|wyczy/i.test(text)) return null;
  const place = text
    .trim()
    .replace(/[.!?]+$/g, "")
    .trim();
  if (place.length < 2 || place.length > 80) return null;
  return place;
}

export function extrasTools(text: string, locality: string | null, lastAssistant: string): PlannerToolCall[] | null {
  const known = locality?.trim() || "";
  if (known && /zaznacz, które/i.test(lastAssistant)) {
    const choice = chosenExtra(text, lastAssistant);
    if (choice) {
      return [{ tool: "place_chosen_extra", arguments: { locality: known, title: choice.title } }];
    }
    if (!isExtrasRequest(text) && !/zaplanuj|kalendarz|godz|przesu|przel|usu[nń]|zdejmij|wyczy/i.test(text)) {
      return [
        {
          tool: "ask",
          arguments: { question: "Zaznacz jedne z propozycji na liście." },
        },
      ];
    }
  }
  const answered = localityAnswer(text, lastAssistant);
  if (answered && !/^wybieram:/i.test(text)) {
    return [
      { tool: "read_locality", arguments: {} },
      { tool: "set_locality", arguments: { locality: answered } },
      { tool: "propose_extras", arguments: { locality: answered } },
    ];
  }
  if (!isExtrasRequest(text)) return null;
  if (!known) {
    return [
      { tool: "read_locality", arguments: {} },
      { tool: "ask", arguments: { question: LOCALITY_ASK } },
    ];
  }
  return [
    { tool: "read_locality", arguments: {} },
    { tool: "propose_extras", arguments: { locality: known } },
  ];
}

export function reviseProposedStart(
  operations: PlannerOperation[],
  text: string,
  month: string,
  blocks: ScheduleBlock[],
  now: Date
): { operations: PlannerOperation[]; summary: string } | { error: string } | null {
  if (/zaplanuj|kalendarz|wszystk/i.test(text)) return null;
  const clock = mentionedClock(text);
  const dayKey = mentionedDay(text, month);
  if (!clock && !dayKey) return null;
  const lesson = operations.find((operation) => operation.op === "place_block");
  if (!lesson || lesson.op !== "place_block") return { error: "W propozycji nie ma zajęć do przesunięcia." };

  const current = new Date(lesson.startsAt);
  const duration =
    (lesson.endsAt ? new Date(lesson.endsAt).getTime() : current.getTime() + 25 * 60_000) - current.getTime();
  const [hour, minute] = (clock ?? clockLabel(current.getHours() * 60 + current.getMinutes())).split(":");
  const day = dayKey ? dateFromKey(dayKey) : new Date(current);
  const asked = atClock(day, `${hour}:${minute}`);
  let cursor = new Date(asked);
  let shifted = false;
  let placed = false;
  for (let step = 0; step < 14; step += 1) {
    const end = cursor.getTime() + duration;
    const free = cursor.getTime() >= now.getTime() && !rangesOverlap(cursor.getTime(), end, blocks);
    const weekend = cursor.getDay() === 0 || cursor.getDay() === 6;
    if (free && (!weekend || (!shifted && Boolean(dayKey)))) {
      placed = true;
      break;
    }
    shifted = true;
    cursor.setDate(cursor.getDate() + 1);
    cursor = atClock(cursor, `${hour}:${minute}`);
  }
  if (!placed) return { error: "Nie ma wolnego terminu o tej godzinie." };

  const delta = cursor.getTime() - current.getTime();
  const moved = operations.map((operation) => {
    if (operation.op !== "place_block" && operation.op !== "insert_break") return operation;
    const start = new Date(new Date(operation.startsAt).getTime() + delta);
    const previousEnd = operation.endsAt ? new Date(operation.endsAt).getTime() : start.getTime() + duration;
    const end = new Date(previousEnd + delta);
    return { ...operation, startsAt: start.toISOString(), endsAt: end.toISOString() };
  });
  const label =
    (lesson.title ??
      operations.find((operation) => operation.op === "upsert_curriculum_item" && operation.title)?.title) ||
    "zajęcia";
  const when = cursor.toLocaleString("pl-PL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
  const passed = shifted
    ? `Godzina ${hour}:${minute} ${asked.toLocaleDateString("pl-PL", { weekday: "long", day: "numeric", month: "long" })} już minęła. `
    : "";
  return {
    operations: moved,
    summary: `${passed}Proponuję „${label}” ${when}. Zatwierdź, jeśli ten termin pasuje.`,
  };
}

function mentionedClock(text: string): string | null {
  const match =
    /godzin[aę]\s*(\d{1,2})(?:[:.](\d{2}))?/i.exec(text) ||
    /godz\.?\s*(\d{1,2})(?:[:.](\d{2}))?/i.exec(text) ||
    /(?:^|[\s,])o\s+(\d{1,2})(?:[:.](\d{2}))?(?=$|[\s,.])/i.exec(text) ||
    /na\s+(\d{1,2}):(\d{2})/i.exec(text);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2] ?? "0");
  if (hour > 23 || minute > 59) return null;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function mentionedDay(text: string, month: string): string | null {
  const span = explicitSpan(`${text} zaplanuj`, month);
  if (span.from) return span.from;
  const pageYear = Number(month.slice(0, 4));
  const numeric = /(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?/.exec(text);
  if (!numeric) return null;
  const year = numeric[3] ? (Number(numeric[3]) < 100 ? 2000 + Number(numeric[3]) : Number(numeric[3])) : pageYear;
  return dateKey(year, Number(numeric[2]), Number(numeric[1]));
}

export function placeChosenExtra(
  choice: ExtraChoice,
  blocks: ScheduleBlock[],
  now: Date
): { operations: PlannerOperation[]; summary: string } | { error: string } {
  const start = nextExtraSlot(blocks, now, 25);
  if (!start) return { error: "W najbliższych dniach nie ma wolnego terminu na te zajęcia." };
  const end = new Date(start.getTime() + 25 * 60_000);
  const pause = new Date(end.getTime() + 5 * 60_000);
  const when = start.toLocaleString("pl-PL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
  const clientId = `extra-${subjectStem(choice.subject) || "wybor"}`;
  return {
    operations: [
      {
        op: "upsert_curriculum_item",
        clientId,
        kind: "extra",
        status: "accepted",
        title: choice.title,
        subject: choice.subject,
        durationMinutes: 25,
        parentGuide: choice.parentGuide,
      },
      {
        op: "place_block",
        clientId,
        startsAt: start.toISOString(),
        endsAt: end.toISOString(),
        title: choice.title,
      },
      { op: "insert_break", startsAt: end.toISOString(), endsAt: pause.toISOString() },
    ],
    summary: `Proponuję „${choice.title}” ${when}. Zatwierdź, jeśli ten termin pasuje.`,
  };
}

function nextExtraSlot(blocks: ScheduleBlock[], now: Date, durationMinutes: number): Date | null {
  const cursor = new Date(now);
  cursor.setHours(0, 0, 0, 0);
  for (let day = 0; day < 21; day += 1) {
    const date = new Date(cursor);
    date.setDate(cursor.getDate() + day);
    const weekday = date.getDay();
    if (weekday === 0 || weekday === 6) continue;
    for (const minute of [15 * 60, 15 * 60 + 30, 16 * 60, 16 * 60 + 30]) {
      const start = new Date(date);
      start.setHours(Math.floor(minute / 60), minute % 60, 0, 0);
      if (start.getTime() < now.getTime()) continue;
      const end = start.getTime() + durationMinutes * 60_000;
      if (!rangesOverlap(start.getTime(), end, blocks)) return start;
    }
  }
  return null;
}

export function clarifyingQuestion(tools: PlannerToolCall[]): string | null {
  if (tools.length !== 1 || tools[0].tool !== "ask") return null;
  const question = tools[0].arguments.question?.trim();
  return question || "Doprecyzuj prośbę: które przedmioty, w jakich godzinach i do kiedy.";
}

function rangeBounds(
  month: string,
  now: Date,
  args: PlanCalendarArguments
): { from: string; until: string } | { error: string } {
  const monthStart = `${month}-01`;
  const monthEnd = lastDayOfMonth(month);
  const today = localDateKey(now);
  const requestedFrom = args.from && DATE_KEY.test(args.from) ? args.from : today < monthStart ? monthStart : today;
  const requestedUntil = args.until && DATE_KEY.test(args.until) ? args.until : monthEnd;
  const from = requestedFrom < monthStart ? monthStart : requestedFrom;
  const until = requestedUntil > monthEnd ? monthEnd : requestedUntil;
  if (from > until) return { error: "Ten zakres nie mieści się w wybranym miesiącu." };
  return { from, until };
}

function eachWeekday(from: string, until: string): Date[] {
  const days: Date[] = [];
  const cursor = dateFromKey(from);
  const end = dateFromKey(until);
  while (cursor <= end) {
    const weekday = cursor.getDay();
    if (weekday !== 0 && weekday !== 6) days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

function atClock(day: Date, time: string): Date {
  const [hourText, minuteText] = time.split(":");
  const next = new Date(day);
  next.setHours(Number(hourText), Number(minuteText), 0, 0);
  return next;
}

function rangesOverlap(start: number, end: number, blocks: ScheduleBlock[]): boolean {
  return blocks.some((block) => {
    const blockStart = new Date(block.startsAt).getTime();
    const blockEnd = new Date(block.endsAt).getTime();
    return start < blockEnd && end > blockStart;
  });
}

function findSubject(items: CurriculumItem[], name: string): CurriculumItem | undefined {
  return items.find((item) => subjectsMatch(item, name));
}

export function describePlanContext(
  state: { items: CurriculumItem[]; blocks: ScheduleBlock[] },
  month: string,
  now: Date
): string {
  const subjects = state.items
    .map(
      (item) =>
        `${item.title} | ${item.subject} | ${item.kind === "extra" ? "dodatkowe" : "główne"} | ${item.status === "accepted" ? "zaakceptowane" : "propozycja"} | ${item.id}`
    )
    .join("\n");
  const monthBlocks = state.blocks
    .filter((block) => localDateKey(new Date(block.startsAt)).startsWith(month))
    .sort((left, right) => left.startsAt.localeCompare(right.startsAt));
  const busy = monthBlocks
    .map((block) => {
      const item = state.items.find((row) => row.id === block.curriculumItemId);
      const label = block.kind === "break" ? "Przerwa" : (block.title ?? item?.title ?? "Zajęcia");
      const start = new Date(block.startsAt);
      return `${localDateKey(start)} ${clockLabel(start.getHours() * 60 + start.getMinutes())} ${label}`;
    })
    .join("\n");
  const free = eachWeekday(localDateKey(now) < `${month}-01` ? `${month}-01` : localDateKey(now), lastDayOfMonth(month))
    .map((day) => {
      const openings: string[] = [];
      for (let minute = 8 * 60; minute + 25 <= 17 * 60; minute += 30) {
        const start = atClock(day, clockLabel(minute));
        if (start.getTime() < now.getTime()) continue;
        const end = start.getTime() + 25 * 60_000;
        if (!rangesOverlap(start.getTime(), end, monthBlocks)) openings.push(clockLabel(minute));
      }
      return `${localDateKey(day)}: ${openings.length ? openings.join(", ") : "brak"}`;
    })
    .join("\n");
  return `Przedmioty:\n${subjects || "brak"}\n\nKalendarz ${month}:\n${busy || "pusty"}\n\nWolne terminy 25 min między 8:00 a 17:00:\n${free || "brak"}`;
}

export function executePlannerTools(input: {
  tools: PlannerToolCall[];
  month: string;
  now: Date;
  items: CurriculumItem[];
  blocks: ScheduleBlock[];
  completedSourceIds: string[];
  moduleLessons?: Record<string, ModuleLesson[]>;
}): { operations: PlannerOperation[]; summary: string } | { error: string } {
  const items = input.items.map((item) => ({ ...item }));
  const blocks = input.blocks.map((block) => ({ ...block }));
  const operations: PlannerOperation[] = [];
  const notes: string[] = [];

  for (const call of input.tools) {
    const step = runTool(call, { ...input, items, blocks });
    if ("error" in step) return step;
    operations.push(...step.operations);
    notes.push(step.note);
    for (const operation of step.operations) applyDraft(operation, items, blocks);
  }

  if (operations.length === 0) return { error: "Nie ma nic do zmiany." };
  return { operations, summary: notes.join(" ") };
}

function runTool(
  call: PlannerToolCall,
  input: {
    month: string;
    now: Date;
    items: CurriculumItem[];
    blocks: ScheduleBlock[];
    completedSourceIds: string[];
    moduleLessons?: Record<string, ModuleLesson[]>;
  }
): { operations: PlannerOperation[]; note: string } | { error: string } {
  if (call.tool === "plan_calendar") {
    const planned = planCalendar({ ...input, args: call.arguments });
    if ("error" in planned) return planned;
    return { operations: planned.operations, note: planned.summary };
  }
  if (call.tool === "add_subject") return addSubject(call.arguments, input.items);
  if (call.tool === "place_subject") return placeSubject(call.arguments, input);
  if (call.tool === "remove_from_calendar") return removeFromCalendar(call.arguments, input);
  return { error: "To pytanie nie zmienia kalendarza." };
}

function addSubject(
  args: PlanCalendarArguments,
  items: CurriculumItem[]
): { operations: PlannerOperation[]; note: string } | { error: string } {
  const title = args.title?.trim() || args.subject?.trim();
  if (!title) return { error: "Podaj nazwę przedmiotu, który mam dodać do listy." };
  if (items.some((item) => subjectsMatch(item, title))) {
    return { error: `${title} już jest na liście przedmiotów.` };
  }
  const clientId = `przedmiot-${subjectStem(title) || "nowy"}`;
  return {
    operations: [
      {
        op: "upsert_curriculum_item",
        clientId,
        kind: args.kind ?? "main",
        status: "accepted",
        title,
        subject: args.subject?.trim() || title,
        durationMinutes: 25,
        parentGuide: "",
      },
    ],
    note: `Do listy wchodzi ${title}.`,
  };
}

function placeSubject(
  args: PlanCalendarArguments,
  input: { month: string; now: Date; items: CurriculumItem[]; blocks: ScheduleBlock[] }
): { operations: PlannerOperation[]; note: string } | { error: string } {
  const name = args.subject ?? args.subjects?.[0];
  const time = args.time && parseClock(args.time) !== null ? args.time : null;
  if (!name || !time) return { error: "Podaj przedmiot i godzinę, o której mam go położyć." };
  const item = findSubject(input.items, name);
  if (!item) return { error: `Nie ma przedmiotu ${name} na liście.` };
  if (item.status !== "accepted")
    return { error: `${item.title} jest tylko propozycją. Najpierw trzeba go zaakceptować.` };

  const bounds = rangeBounds(input.month, input.now, args);
  if ("error" in bounds) return bounds;
  const operations: PlannerOperation[] = [];
  const skipped: string[] = [];
  const virtual = input.blocks.map((block) => ({ ...block }));
  const days = bounds.from === bounds.until ? [dateFromKey(bounds.from)] : eachWeekday(bounds.from, bounds.until);
  for (const day of days) {
    const start = atClock(day, time);
    const end = new Date(start.getTime() + item.durationMinutes * 60_000);
    if (start.getTime() < input.now.getTime()) continue;
    if (rangesOverlap(start.getTime(), end.getTime(), virtual)) {
      skipped.push(localDateKey(day));
      continue;
    }
    const breakEnd = new Date(end.getTime() + 5 * 60_000);
    operations.push({
      op: "place_block",
      curriculumItemId: item.id,
      startsAt: start.toISOString(),
      endsAt: end.toISOString(),
      title: item.title,
    });
    virtual.push({
      id: `pending-${localDateKey(day)}`,
      curriculumItemId: item.id,
      kind: "lesson",
      startsAt: start.toISOString(),
      endsAt: end.toISOString(),
      title: item.title,
      href: null,
      sourceId: null,
    });
    if (!rangesOverlap(end.getTime(), breakEnd.getTime(), virtual)) {
      operations.push({ op: "insert_break", startsAt: end.toISOString(), endsAt: breakEnd.toISOString() });
      virtual.push({
        id: `break-${localDateKey(day)}`,
        curriculumItemId: null,
        kind: "break",
        startsAt: end.toISOString(),
        endsAt: breakEnd.toISOString(),
        title: null,
        href: null,
        sourceId: null,
      });
    }
  }
  const placed = operations.filter((operation) => operation.op === "place_block").length;
  if (placed === 0)
    return {
      error: skipped.length
        ? `${item.title} o ${time} nie ma już wolnego dnia.`
        : "W tym zakresie nie ma już wolnego terminu.",
    };
  const busy = skipped.length ? ` Pominięte, bo godzina zajęta: ${skipped.join(", ")}.` : "";
  const count = placed === 1 ? "1 zajęcia" : `${placed} zajęć`;
  const when = bounds.from === bounds.until ? `dnia ${bounds.from}` : `${bounds.from}–${bounds.until}`;
  return { operations, note: `${item.title} o ${time} ${when}: ${count}.${busy}` };
}

function removeFromCalendar(
  args: PlanCalendarArguments,
  input: { month: string; now: Date; items: CurriculumItem[]; blocks: ScheduleBlock[] }
): { operations: PlannerOperation[]; note: string } | { error: string } {
  if (args.outside && args.from) {
    const kept = args.from;
    const removed = input.blocks.filter((block) => {
      const key = localDateKey(new Date(block.startsAt));
      return key.startsWith(input.month) && key !== kept;
    });
    if (removed.length === 0) return { error: "Poza tym dniem nie ma już zajęć do zdjęcia." };
    return {
      operations: removed.map((block) => ({ op: "remove_block" as const, id: block.id })),
      note: `Zostaje tylko ${kept}. Poza tym dniem schodzi ${removed.length} bloków.`,
    };
  }
  const bounds = rangeBounds(input.month, input.now, args);
  if ("error" in bounds) return bounds;
  const name = args.subject ?? args.subjects?.[0];
  const time = args.time && parseClock(args.time) !== null ? args.time : null;
  const removed = input.blocks.filter((block) => {
    if (block.kind !== "lesson") return false;
    const start = new Date(block.startsAt);
    const key = localDateKey(start);
    if (key < bounds.from || key > bounds.until) return false;
    if (time && clockLabel(start.getHours() * 60 + start.getMinutes()) !== time) return false;
    if (!name) return true;
    const item = input.items.find((row) => row.id === block.curriculumItemId);
    return item
      ? subjectsMatch(item, name) ||
          (block.title ? subjectsMatch({ subject: block.title, title: block.title }, name) : false)
      : false;
  });
  if (removed.length === 0) return { error: "W kalendarzu nie ma takich zajęć do zdjęcia." };
  return {
    operations: removed.map((block) => ({ op: "remove_block" as const, id: block.id })),
    note: `Z kalendarza schodzą ${removed.length} zajęć${name ? ` (${name})` : ""}. Przedmiot zostaje na liście.`,
  };
}

export function operationsForSavedPlan(saved: PlanState, desired: PlanState): PlannerOperation[] {
  const operations: PlannerOperation[] = [];
  const clientIds = new Map<string, string>();
  for (const item of desired.items) {
    if (saved.items.some((row) => row.id === item.id)) continue;
    const clientId = `przedmiot-${subjectStem(item.subject) || "nowy"}`;
    clientIds.set(item.id, clientId);
    operations.push({
      op: "upsert_curriculum_item",
      clientId,
      kind: item.kind,
      status: item.status,
      title: item.title,
      subject: item.subject,
      durationMinutes: item.durationMinutes,
      parentGuide: item.parentGuide,
      sourceId: item.sourceId,
      href: item.href,
    });
  }
  for (const block of saved.blocks) {
    if (!desired.blocks.some((row) => row.id === block.id)) operations.push({ op: "remove_block", id: block.id });
  }
  for (const block of desired.blocks) {
    const current = saved.blocks.find((row) => row.id === block.id);
    if (!current || (current.startsAt === block.startsAt && current.endsAt === block.endsAt)) continue;
    operations.push({ op: "move_block", id: block.id, startsAt: block.startsAt, endsAt: block.endsAt });
  }
  for (const block of desired.blocks) {
    if (saved.blocks.some((row) => row.id === block.id)) continue;
    if (block.kind === "break") {
      operations.push({ op: "insert_break", startsAt: block.startsAt, endsAt: block.endsAt });
      continue;
    }
    const clientId = block.curriculumItemId ? clientIds.get(block.curriculumItemId) : undefined;
    operations.push({
      op: "place_block",
      curriculumItemId: clientId ? undefined : (block.curriculumItemId ?? undefined),
      clientId,
      startsAt: block.startsAt,
      endsAt: block.endsAt,
      title: block.title ?? undefined,
      href: block.href,
      sourceId: block.sourceId,
    });
  }
  return operations;
}

export function dropPreviewBlock(
  saved: PlanState,
  operations: PlannerOperation[],
  target: { startsAt: string; endsAt: string; kind: ScheduleBlock["kind"] },
  now: Date
): { operations: PlannerOperation[] } | { empty: true } | { error: string } {
  const preview = applyOperations(saved, operations, now);
  if ("error" in preview) return preview;
  const index = preview.state.blocks.findIndex(
    (block) => block.kind === target.kind && block.startsAt === target.startsAt && block.endsAt === target.endsAt
  );
  if (index < 0) return { error: "Nie ma takich zajęć w propozycji." };
  const next = operationsForSavedPlan(saved, {
    items: preview.state.items,
    blocks: preview.state.blocks.filter((_, blockIndex) => blockIndex !== index),
  });
  if (next.length === 0) return { empty: true };
  return { operations: next };
}

function applyDraft(operation: PlannerOperation, items: CurriculumItem[], blocks: ScheduleBlock[]): void {
  if (operation.op === "upsert_curriculum_item") {
    items.push({
      id: operation.clientId ?? operation.title,
      kind: operation.kind,
      status: operation.status,
      title: operation.title,
      subject: operation.subject,
      durationMinutes: operation.durationMinutes,
      parentGuide: operation.parentGuide,
      sourceId: operation.sourceId ?? null,
      href: operation.href ?? null,
    });
  }
  if (operation.op === "place_block") {
    blocks.push({
      id: `draft-${blocks.length}`,
      curriculumItemId: operation.curriculumItemId ?? null,
      kind: "lesson",
      startsAt: operation.startsAt,
      endsAt: operation.endsAt ?? operation.startsAt,
      title: operation.title ?? null,
      href: operation.href ?? null,
      sourceId: operation.sourceId ?? null,
    });
  }
  if (operation.op === "insert_break" && operation.endsAt) {
    blocks.push({
      id: `draft-break-${blocks.length}`,
      curriculumItemId: null,
      kind: "break",
      startsAt: operation.startsAt,
      endsAt: operation.endsAt,
      title: null,
      href: null,
      sourceId: null,
    });
  }
  if (operation.op === "remove_block") {
    const index = blocks.findIndex((block) => block.id === operation.id);
    if (index >= 0) blocks.splice(index, 1);
  }
  if (operation.op === "replace_month") {
    const from = operation.from ? new Date(operation.from).getTime() : null;
    const until = operation.until ? new Date(operation.until).getTime() : null;
    for (let index = blocks.length - 1; index >= 0; index -= 1) {
      const start = new Date(blocks[index].startsAt);
      if (localDateKey(start).slice(0, 7) !== operation.month) continue;
      const stamp = start.getTime();
      if (from !== null && stamp < from) continue;
      if (until !== null && stamp >= until) continue;
      blocks.splice(index, 1);
    }
  }
}
