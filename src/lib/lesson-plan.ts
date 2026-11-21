import { z } from "zod";

export type CurriculumKind = "main" | "extra";
export type CurriculumStatus = "proposed" | "accepted";
export type BlockKind = "lesson" | "break";

export interface CurriculumItem {
  id: string;
  kind: CurriculumKind;
  status: CurriculumStatus;
  title: string;
  subject: string;
  durationMinutes: number;
  parentGuide: string;
  sourceId: string | null;
  href: string | null;
  moduleKey?: string | null;
}

export interface ModuleLesson {
  title: string;
  sourceId: string;
  href: string | null;
}

export interface ScheduleBlock {
  id: string;
  curriculumItemId: string | null;
  kind: BlockKind;
  startsAt: string;
  endsAt: string;
  title: string | null;
  href: string | null;
  sourceId: string | null;
}

export interface PlanState {
  items: CurriculumItem[];
  blocks: ScheduleBlock[];
}

const upsertSchema = z.object({
  op: z.literal("upsert_curriculum_item"),
  clientId: z.string().trim().min(1).max(80).optional(),
  id: z.string().uuid().optional(),
  kind: z.enum(["main", "extra"]),
  status: z.enum(["proposed", "accepted"]),
  title: z.string().trim().min(1).max(160),
  subject: z.string().trim().min(1).max(80),
  durationMinutes: z.number().int().min(5).max(180).default(25),
  parentGuide: z.string().max(4000).default(""),
  sourceId: z.string().max(120).nullable().optional(),
  href: z.string().max(300).nullable().optional(),
});

const deleteItemSchema = z.object({
  op: z.literal("delete_curriculum_item"),
  id: z.string().uuid(),
});

const stampSchema = z.string().refine((value) => !Number.isNaN(new Date(value).getTime()), "Niepoprawny termin.");

const placeSchema = z.object({
  op: z.literal("place_block"),
  curriculumItemId: z.string().uuid().optional(),
  clientId: z.string().trim().min(1).max(80).optional(),
  startsAt: stampSchema,
  endsAt: stampSchema.optional(),
  title: z.string().trim().min(1).max(200).optional(),
  href: z.string().max(300).nullable().optional(),
  sourceId: z.string().max(120).nullable().optional(),
});

const moveSchema = z.object({
  op: z.literal("move_block"),
  id: z.string().uuid(),
  startsAt: stampSchema,
  endsAt: stampSchema,
});

const removeSchema = z.object({
  op: z.literal("remove_block"),
  id: z.string().uuid(),
});

const breakSchema = z.object({
  op: z.literal("insert_break"),
  startsAt: stampSchema,
  endsAt: stampSchema,
});

const replaceMonthSchema = z.object({
  op: z.literal("replace_month"),
  month: z.string().regex(/^\d{4}-\d{2}$/),
  from: z.string().min(1).optional(),
  until: z.string().min(1).optional(),
});

export const plannerOperationSchema = z.discriminatedUnion("op", [
  upsertSchema,
  deleteItemSchema,
  placeSchema,
  moveSchema,
  removeSchema,
  breakSchema,
  replaceMonthSchema,
]);

export const plannerProposalSchema = z.object({
  summary: z.string().trim().min(1).max(2000),
  operations: z.array(plannerOperationSchema).max(400),
});

export type PlannerOperation = z.infer<typeof plannerOperationSchema>;

export interface PlanEffect {
  type:
    | "delete_month_blocks"
    | "insert_item"
    | "update_item"
    | "delete_item"
    | "insert_block"
    | "update_block"
    | "delete_block";
  month?: string;
  item?: CurriculumItem;
  itemId?: string;
  block?: ScheduleBlock;
  blockId?: string;
}

const MORNING = { start: 9 * 60, end: 12 * 60 };
const AFTERNOON = { start: 15 * 60, end: 17 * 60 };

export interface MinuteWindow {
  start: number;
  end: number;
}

export const DEFAULT_PLAN_WINDOWS: MinuteWindow[] = [MORNING, AFTERNOON];
const LESSON_MINUTES = 25;
const SHORT_BREAK_MINUTES = 5;
const LONG_BREAK_MINUTES = 15;
const PAIRS_BEFORE_LONG_BREAK = 4;

export const STARTER_EXTRAS: Pick<CurriculumItem, "title" | "subject" | "parentGuide">[] = [
  {
    title: "Zajęcia w terenie",
    subject: "Teren",
    parentGuide:
      "Krótki wypad w okolicy domu. Po uzupełnieniu okolicy asystent dopisze konkretne miejsce i co pokazać dziecku.",
  },
];

/** Core subjects of Polish grades 1–3 (edukacja wczesnoszkolna), without optional religion. */
export const EARLY_GRADE_SUBJECTS: Pick<CurriculumItem, "title" | "subject" | "parentGuide">[] = [
  {
    title: "Polski",
    subject: "Polski",
    parentGuide: "Krótki tekst: przeczytać na głos, ułożyć jedno zdanie i przepisać kilka słów.",
  },
  {
    title: "Matematyka",
    subject: "Matematyka",
    parentGuide: "Jedno zadanie z życia: policzyć, zmierzyć albo porównać. Najpierw konkret, potem zapis.",
  },
  {
    title: "Edukacja społeczna",
    subject: "Edukacja społeczna",
    parentGuide: "Rozmowa o zasadach, emocjach albo o tym, co dziecko widziało w domu i w okolicy.",
  },
  {
    title: "Przyroda",
    subject: "Przyroda",
    parentGuide: "Jedna obserwacja: pogoda, roślina albo zwierzę. Nazwać ją i zadać jedno pytanie.",
  },
  {
    title: "Plastyka",
    subject: "Plastyka",
    parentGuide: "Jedna technika, na przykład farba albo wycinanka, i rozmowa o kolorze oraz kształcie.",
  },
  {
    title: "Technika",
    subject: "Technika",
    parentGuide: "Prosta praca rąk: nazwać kolejne kroki i użyć narzędzi bezpiecznie.",
  },
  {
    title: "Muzyka",
    subject: "Muzyka",
    parentGuide: "Piosenka, klaskany rytm albo krótki utwór. Na końcu nazwać nastrój muzyki.",
  },
  {
    title: "Wychowanie fizyczne",
    subject: "Wychowanie fizyczne",
    parentGuide: "Ruch: bieg, skok, rzut albo krótki tor. Liczy się zabawa, nie wynik.",
  },
  {
    title: "Informatyka",
    subject: "Informatyka",
    parentGuide: "Zabawa w kolejność i wzór, głównie bez ekranu. Ekran najwyżej kilka minut.",
  },
];

const FOCUS_ORDER = ["polski", "matematyka", "english", "angielski"];
const EXPLORE_ORDER = [
  "przyroda",
  "wychowanie fizyczne",
  "plastyka",
  "muzyka",
  "technika",
  "informatyka",
  "edukacja społeczna",
  "teren",
];

export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function monthInstantRange(month: string, timeZone = "Europe/Warsaw"): { from: string; until: string } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) return null;
  const year = Number(match[1]);
  const monthNumber = Number(match[2]);
  if (monthNumber < 1 || monthNumber > 12) return null;
  const from = zonedMidnight(year, monthNumber, timeZone);
  const until = zonedMidnight(monthNumber === 12 ? year + 1 : year, monthNumber === 12 ? 1 : monthNumber + 1, timeZone);
  return { from: from.toISOString(), until: until.toISOString() };
}

function zonedMidnight(year: number, month: number, timeZone: string): Date {
  const guess = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  return new Date(guess.getTime() - timeZoneOffset(guess, timeZone));
}

function timeZoneOffset(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  const asUtc = Date.UTC(
    value("year"),
    value("month") - 1,
    value("day"),
    value("hour"),
    value("minute"),
    value("second")
  );
  return asUtc - date.getTime();
}

export function lessonCalendarTitle(subject: string, lessonTitle: string): string {
  const prefix = `${subject} - `;
  return lessonTitle.startsWith(prefix) ? lessonTitle : `${prefix}${lessonTitle}`;
}

export function isOutdoorItem(item: Pick<CurriculumItem, "subject" | "title">): boolean {
  return /teren|wyciecz|las|spacer|zielnik/i.test(`${item.subject} ${item.title}`);
}

export function subjectKey(value: string): string {
  return value.trim().toLocaleLowerCase("pl");
}

/** Literacy, numeracy and the foreign language: the morning cognitive block. */
export function isFocusSubject(subject: string): boolean {
  return /polski|matemat|angiel|english/i.test(subject);
}

function rangesOverlap(startA: number, endA: number, startB: number, endB: number): boolean {
  return startA < endB && endA > startB;
}

function parseStamp(value: string): number {
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) throw new Error("Niepoprawny termin.");
  return time;
}

function addMinutes(iso: string, minutes: number): string {
  return new Date(parseStamp(iso) + minutes * 60_000).toISOString();
}

function atMinutes(day: Date, minutes: number): Date {
  const next = new Date(day);
  next.setHours(0, 0, 0, 0);
  next.setMinutes(minutes);
  return next;
}

interface LessonOpening {
  startsAt: string;
  endsAt: string;
  breakAfter?: { startsAt: string; endsAt: string };
}

export function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function dateFromKey(key: string): Date {
  const [yearText, monthText, dayText] = key.split("-");
  return new Date(Number(yearText), Number(monthText) - 1, Number(dayText), 12);
}

export function startOfLocalDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function daySlots(day: Date, now: Date, windows: MinuteWindow[]): LessonOpening[] {
  const slots: LessonOpening[] = [];
  for (const window of windows) {
    let cursor = window.start;
    let lessonsInWindow = 0;
    while (cursor + LESSON_MINUTES <= window.end) {
      const lessonStart = atMinutes(day, cursor);
      const lessonEnd = atMinutes(day, cursor + LESSON_MINUTES);
      cursor += LESSON_MINUTES;
      lessonsInWindow += 1;
      const breakMinutes = lessonsInWindow % PAIRS_BEFORE_LONG_BREAK === 0 ? LONG_BREAK_MINUTES : SHORT_BREAK_MINUTES;
      let breakAfter: LessonOpening["breakAfter"];
      if (cursor + breakMinutes <= window.end) {
        const breakStart = atMinutes(day, cursor);
        const breakEnd = atMinutes(day, cursor + breakMinutes);
        breakAfter = { startsAt: breakStart.toISOString(), endsAt: breakEnd.toISOString() };
        cursor += breakMinutes;
      }
      if (lessonStart.getTime() >= now.getTime()) {
        slots.push({ startsAt: lessonStart.toISOString(), endsAt: lessonEnd.toISOString(), breakAfter });
      }
    }
  }
  return slots;
}

function monthDays(month: string): Date[] {
  const [yearText, monthText] = month.split("-");
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  const days: Date[] = [];
  const cursor = new Date(year, monthIndex, 1, 12, 0, 0, 0);
  while (cursor.getMonth() === monthIndex) {
    const weekday = cursor.getDay();
    if (weekday !== 0 && weekday !== 6) {
      days.push(new Date(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

function weekKey(date: Date): string {
  const copy = new Date(date);
  const day = copy.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + mondayOffset);
  return monthKey(copy) + "-" + String(copy.getDate()).padStart(2, "0");
}

interface ScheduleUnit {
  id: string;
  subject: string;
  title: string;
  durationMinutes: number;
  sourceId: string | null;
  href: string | null;
  blockTitle: string | null;
}

export function buildMonthSchedule(input: {
  items: CurriculumItem[];
  blocks: ScheduleBlock[];
  completedSourceIds: string[];
  month: string;
  now: Date;
  moduleLessons?: Record<string, ModuleLesson[]>;
  windows?: MinuteWindow[];
  rangeFrom?: string;
  rangeUntil?: string;
  mixAllSubjects?: boolean;
}): PlannerOperation[] {
  const accepted = input.items.filter((item) => item.status === "accepted");
  const completed = new Set(input.completedSourceIds);
  const overdueKeys = new Set(
    input.blocks
      .filter((block) => block.kind === "lesson" && parseStamp(block.endsAt) < input.now.getTime())
      .map((block) => block.sourceId ?? block.curriculumItemId)
      .filter((id): id is string => Boolean(id))
  );

  const focus: SubjectTrack[] = [];
  const explore: SubjectTrack[] = [];
  accepted.forEach((item, index) => {
    if (item.sourceId && completed.has(item.sourceId)) return;
    const provided = input.moduleLessons?.[item.id];
    const lessons = (provided ?? [])
      .filter((lesson) => !completed.has(lesson.sourceId))
      .sort((left, right) => Number(overdueKeys.has(right.sourceId)) - Number(overdueKeys.has(left.sourceId)));
    const track: SubjectTrack = {
      id: item.id,
      subject: item.subject,
      title: item.title,
      durationMinutes: item.durationMinutes,
      sourceId: item.sourceId,
      href: item.href,
      lessons,
      lessonCursor: 0,
      placements: 0,
      order: trackOrder(item.subject, index),
      finite: provided !== undefined,
      outdoor: isOutdoorItem(item),
    };
    const band = isFocusSubject(item.subject) ? focus : explore;
    band.push(track);
  });

  const windows = input.windows?.length ? input.windows : DEFAULT_PLAN_WINDOWS;
  const days = monthDays(input.month).filter((day) => {
    const key = localDateKey(day);
    if (input.rangeFrom && key < input.rangeFrom) return false;
    if (input.rangeUntil && key > input.rangeUntil) return false;
    return true;
  });
  const operations: PlannerOperation[] = [
    {
      op: "replace_month",
      month: input.month,
      from: input.rangeFrom ? startOfLocalDay(dateFromKey(input.rangeFrom)).toISOString() : undefined,
      until: input.rangeUntil ? startOfLocalDay(addDays(dateFromKey(input.rangeUntil), 1)).toISOString() : undefined,
    },
  ];
  const outdoorWeeks = new Set<string>();
  let previousSubject: string | null = null;
  let previousDay = "";

  for (const slot of days.flatMap((day) => daySlots(day, input.now, windows))) {
    const day = slot.startsAt.slice(0, 10);
    if (day !== previousDay) {
      previousSubject = null;
      previousDay = day;
    }
    const morning = new Date(slot.startsAt).getHours() < 13;
    const week = weekKey(new Date(slot.startsAt));
    const mixed = input.mixAllSubjects ? [...focus, ...explore] : null;
    const primary = mixed ?? (morning ? focus : explore);
    const secondary = mixed ? [] : morning ? explore : focus;
    const track =
      pickTrack(primary, previousSubject, week, outdoorWeeks) ??
      pickTrack(secondary, previousSubject, week, outdoorWeeks);
    if (!track) {
      const pending = [...focus, ...explore].some(
        (candidate) => !candidate.finite || candidate.lessonCursor < candidate.lessons.length
      );
      if (!pending) break;
      continue;
    }

    const unit = consumeTrack(track);
    operations.push({
      op: "place_block",
      curriculumItemId: unit.id,
      startsAt: slot.startsAt,
      endsAt: slot.endsAt,
      title: unit.blockTitle ?? undefined,
      href: unit.href,
      sourceId: unit.sourceId,
    });
    if (slot.breakAfter) {
      operations.push({ op: "insert_break", startsAt: slot.breakAfter.startsAt, endsAt: slot.breakAfter.endsAt });
    }
    if (track.outdoor) outdoorWeeks.add(week);
    previousSubject = subjectKey(track.subject);
  }

  return operations;
}

interface SubjectTrack {
  id: string;
  subject: string;
  title: string;
  durationMinutes: number;
  sourceId: string | null;
  href: string | null;
  lessons: ModuleLesson[];
  lessonCursor: number;
  placements: number;
  order: number;
  finite: boolean;
  outdoor: boolean;
}

function trackOrder(subject: string, index: number): number {
  const focusRank = FOCUS_ORDER.indexOf(subjectKey(subject));
  const exploreRank = EXPLORE_ORDER.indexOf(subjectKey(subject));
  const rank = isFocusSubject(subject)
    ? focusRank === -1
      ? FOCUS_ORDER.length
      : focusRank
    : exploreRank === -1
      ? EXPLORE_ORDER.length
      : exploreRank;
  return rank * 100 + index;
}

function canPlace(track: SubjectTrack, week: string, outdoorWeeks: Set<string>): boolean {
  if (track.finite && track.lessonCursor >= track.lessons.length) return false;
  if (track.outdoor && outdoorWeeks.has(week)) return false;
  return true;
}

/**
 * Interleaving and spacing: the subject with the fewest turns goes next,
 * and the same subject does not sit in two neighbouring slots when another is waiting.
 */
function pickTrack(
  tracks: SubjectTrack[],
  previousSubject: string | null,
  week: string,
  outdoorWeeks: Set<string>
): SubjectTrack | null {
  const available = tracks.filter((track) => canPlace(track, week, outdoorWeeks));
  if (available.length === 0) return null;
  const different = previousSubject
    ? available.filter((track) => subjectKey(track.subject) !== previousSubject)
    : available;
  const candidates = different.length > 0 ? different : available;
  return candidates.reduce((best, track) =>
    track.placements < best.placements || (track.placements === best.placements && track.order < best.order)
      ? track
      : best
  );
}

function consumeTrack(track: SubjectTrack): ScheduleUnit {
  track.placements += 1;
  const lesson = track.finite ? track.lessons[track.lessonCursor] : undefined;
  if (lesson) track.lessonCursor += 1;
  return {
    id: track.id,
    subject: track.subject,
    title: track.title,
    durationMinutes: track.durationMinutes,
    sourceId: lesson?.sourceId ?? track.sourceId,
    href: lesson?.href ?? track.href,
    blockTitle: lesson ? lessonCalendarTitle(track.title, lesson.title) : null,
  };
}

export function firstFreeStart(day: Date, durationMinutes: number, blocks: ScheduleBlock[], now: Date): string | null {
  for (const window of [MORNING, AFTERNOON]) {
    for (let minute = window.start; minute + durationMinutes <= window.end; minute += 5) {
      const start = atMinutes(day, minute);
      const end = atMinutes(day, minute + durationMinutes);
      if (start.getTime() < now.getTime()) continue;
      const hits = blocks.some((block) =>
        rangesOverlap(start.getTime(), end.getTime(), parseStamp(block.startsAt), parseStamp(block.endsAt))
      );
      if (!hits) return start.toISOString();
    }
  }
  return null;
}

function cloneState(state: PlanState): PlanState {
  return {
    items: state.items.map((item) => ({ ...item })),
    blocks: state.blocks.map((block) => ({ ...block })),
  };
}

function assertFree(blocks: ScheduleBlock[], startsAt: string, endsAt: string, ignoreId?: string): string | null {
  const start = parseStamp(startsAt);
  const end = parseStamp(endsAt);
  if (end <= start) return "Koniec bloku musi być później niż początek.";
  const hit = blocks.find(
    (block) => block.id !== ignoreId && rangesOverlap(start, end, parseStamp(block.startsAt), parseStamp(block.endsAt))
  );
  return hit ? "Ten termin nachodzi na inny blok." : null;
}

export function applyOperations(
  state: PlanState,
  operations: PlannerOperation[],
  now: Date,
  createId: () => string = () => crypto.randomUUID()
): { state: PlanState; effects: PlanEffect[] } | { error: string } {
  const next = cloneState(state);
  const effects: PlanEffect[] = [];
  const clientIds = new Map<string, string>();

  for (const operation of operations) {
    if (operation.op === "replace_month") {
      const fromMs = operation.from ? parseStamp(operation.from) : null;
      const untilMs = operation.until ? parseStamp(operation.until) : null;
      const removed = next.blocks.filter((block) => {
        if (monthKey(new Date(block.startsAt)) !== operation.month) return false;
        const start = parseStamp(block.startsAt);
        if (fromMs !== null && start < fromMs) return false;
        if (untilMs !== null && start >= untilMs) return false;
        return true;
      });
      const removedIds = new Set(removed.map((block) => block.id));
      next.blocks = next.blocks.filter((block) => !removedIds.has(block.id));
      for (const block of removed) effects.push({ type: "delete_block", blockId: block.id });
      continue;
    }

    if (operation.op === "upsert_curriculum_item") {
      const existing = operation.id ? next.items.find((item) => item.id === operation.id) : undefined;
      if (operation.id && !existing) return { error: "Nie ma takiej pozycji listy." };
      const item: CurriculumItem = {
        id: existing?.id ?? createId(),
        kind: operation.kind,
        status: operation.status,
        title: operation.title,
        subject: operation.subject,
        durationMinutes: operation.durationMinutes,
        parentGuide: operation.parentGuide,
        sourceId: operation.sourceId ?? existing?.sourceId ?? null,
        href: operation.href ?? existing?.href ?? null,
      };
      if (existing) {
        next.items = next.items.map((row) => (row.id === item.id ? item : row));
        effects.push({ type: "update_item", item });
      } else {
        next.items.push(item);
        effects.push({ type: "insert_item", item });
      }
      if (operation.clientId) clientIds.set(operation.clientId, item.id);
      continue;
    }

    if (operation.op === "delete_curriculum_item") {
      if (!next.items.some((item) => item.id === operation.id)) return { error: "Nie ma takiej pozycji listy." };
      const removed = next.blocks.filter((block) => block.curriculumItemId === operation.id);
      next.items = next.items.filter((item) => item.id !== operation.id);
      next.blocks = next.blocks.filter((block) => block.curriculumItemId !== operation.id);
      effects.push({ type: "delete_item", itemId: operation.id });
      for (const block of removed) effects.push({ type: "delete_block", blockId: block.id });
      continue;
    }

    if (operation.op === "remove_block") {
      if (!next.blocks.some((block) => block.id === operation.id)) return { error: "Nie ma takiego bloku." };
      next.blocks = next.blocks.filter((block) => block.id !== operation.id);
      effects.push({ type: "delete_block", blockId: operation.id });
      continue;
    }

    const startsAt = operation.startsAt;
    const endsAt = operation.endsAt;
    if (parseStamp(startsAt) < now.getTime()) return { error: "Nie można układać bloku w przeszłości." };

    if (operation.op === "insert_break") {
      if (!endsAt) return { error: "Przerwa potrzebuje końca." };
      const clash = assertFree(next.blocks, startsAt, endsAt);
      if (clash) return { error: clash };
      const block: ScheduleBlock = {
        id: createId(),
        curriculumItemId: null,
        kind: "break",
        startsAt,
        endsAt,
        title: null,
        href: null,
        sourceId: null,
      };
      next.blocks.push(block);
      effects.push({ type: "insert_block", block });
      continue;
    }

    if (operation.op === "place_block") {
      const itemId = operation.curriculumItemId ?? (operation.clientId ? clientIds.get(operation.clientId) : undefined);
      const item = next.items.find((row) => row.id === itemId);
      if (!item) return { error: "Nie ma pozycji, którą można położyć na kalendarz." };
      if (item.status !== "accepted") return { error: "Na kalendarz wchodzą tylko zaakceptowane pozycje." };
      const lessonEnd = endsAt ?? addMinutes(startsAt, item.durationMinutes);
      const clash = assertFree(next.blocks, startsAt, lessonEnd);
      if (clash) return { error: clash };
      const block: ScheduleBlock = {
        id: createId(),
        curriculumItemId: item.id,
        kind: "lesson",
        startsAt,
        endsAt: lessonEnd,
        title: operation.title ?? null,
        href: operation.href ?? null,
        sourceId: operation.sourceId ?? null,
      };
      next.blocks.push(block);
      effects.push({ type: "insert_block", block });
      continue;
    }

    const current = next.blocks.find((block) => block.id === operation.id);
    if (!current || !endsAt) return { error: "Nie ma takiego bloku." };
    const clash = assertFree(next.blocks, startsAt, endsAt, current.id);
    if (clash) return { error: clash };
    const block: ScheduleBlock = { ...current, startsAt, endsAt };
    next.blocks = next.blocks.map((row) => (row.id === block.id ? block : row));
    effects.push({ type: "update_block", block });
  }

  return { state: next, effects };
}

export function describeOperation(operation: PlannerOperation, items: CurriculumItem[]): string {
  if (operation.op === "replace_month") {
    if (operation.from || operation.until) return `Podmień kalendarz w podanym zakresie miesiąca ${operation.month}.`;
    return `Podmień kalendarz miesiąca ${operation.month}.`;
  }
  if (operation.op === "insert_break") return "Wstaw przerwę.";
  if (operation.op === "remove_block") return "Zdejmij blok z kalendarza.";
  if (operation.op === "delete_curriculum_item") {
    const item = items.find((row) => row.id === operation.id);
    return `Usuń z listy: ${item?.title ?? "pozycję"}.`;
  }
  if (operation.op === "upsert_curriculum_item") {
    const bucket = operation.kind === "extra" ? "zajęcia dodatkowe" : "lekcje główne";
    return `${operation.id ? "Zmień" : "Dodaj"} w ${bucket}: ${operation.title}.`;
  }
  const when = new Date(operation.startsAt).toLocaleString("pl-PL", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  if (operation.op === "place_block") {
    const item = items.find((row) => row.id === operation.curriculumItemId);
    const label = operation.title ?? item?.title;
    return `Połóż na kalendarzu${label ? `: ${label}` : ""} (${when}).`;
  }
  return `Przesuń blok na ${when}.`;
}

export interface DashboardTask {
  id: string;
  title: string;
  module: string;
  dayKey: string;
  dayLabel: string;
  dateLabel: string;
  timeLabel: string;
  endLabel: string;
  status: "done" | "planned" | "upcoming";
  href?: string;
}

function clockLabel(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function blocksToDashboardTasks(
  blocks: ScheduleBlock[],
  items: CurriculumItem[],
  completedSourceIds: string[],
  now: Date
): DashboardTask[] {
  const completed = new Set(completedSourceIds);
  return blocks.map((block) => {
    const item = items.find((row) => row.id === block.curriculumItemId);
    const start = new Date(block.startsAt);
    const end = new Date(block.endsAt);
    const sourceId = block.sourceId ?? item?.sourceId ?? null;
    const done = Boolean(sourceId && completed.has(sourceId));
    const overdue = block.kind === "lesson" && !done && end.getTime() < now.getTime();
    return {
      id: block.id,
      title: block.kind === "break" ? "Przerwa" : (block.title ?? item?.title ?? "Zajęcia"),
      module: block.kind === "break" ? "Przerwa" : (item?.subject ?? "Plan"),
      dayKey: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`,
      dayLabel: start.toLocaleDateString("pl-PL", { weekday: "short" }),
      dateLabel: start.toLocaleDateString("pl-PL", { day: "numeric", month: "short" }),
      timeLabel: clockLabel(start),
      endLabel: clockLabel(end),
      status: done ? "done" : overdue ? "upcoming" : "planned",
      href: block.href ?? item?.href ?? undefined,
    };
  });
}
