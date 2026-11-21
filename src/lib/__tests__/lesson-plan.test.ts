import { describe, expect, it } from "vitest";
import {
  applyOperations,
  buildMonthSchedule,
  monthInstantRange,
  type CurriculumItem,
  type ScheduleBlock,
} from "../lesson-plan";
import {
  describePlanContext,
  executePlannerTools,
  chosenExtra,
  extrasMenu,
  extrasTools,
  fallbackPlanArguments,
  localityAnswer,
  menuChoices,
  placeChosenExtra,
  reviseProposedStart,
  clarifyingQuestion,
  interpretRequest,
  dropPreviewBlock,
  operationsForSavedPlan,
  planCalendar,
} from "../planner-skills";

const now = new Date(2026, 10, 1, 12, 0, 0);

function item(id: string, overrides: Partial<CurriculumItem> = {}): CurriculumItem {
  return {
    id,
    kind: "main",
    status: "accepted",
    title: `Lekcja ${id.slice(0, 4)}`,
    subject: "English",
    durationMinutes: 25,
    parentGuide: "",
    sourceId: null,
    href: null,
    ...overrides,
  };
}

const ids = [
  "11111111-1111-4111-8111-111111111111",
  "22222222-2222-4222-8222-222222222222",
  "33333333-3333-4333-8333-333333333333",
  "44444444-4444-4444-8444-444444444444",
  "55555555-5555-4555-8555-555555555555",
] as const;

describe("buildMonthSchedule", () => {
  it("starts a weekday with 25 minutes of work and a 5 minute break", () => {
    const operations = buildMonthSchedule({
      items: [item(ids[0])],
      blocks: [],
      completedSourceIds: [],
      month: "2026-11",
      now,
    });

    expect(operations[0]).toEqual({ op: "replace_month", month: "2026-11" });
    const placed = operations[1];
    const pause = operations[2];
    expect(placed?.op).toBe("place_block");
    expect(pause?.op).toBe("insert_break");
    if (placed?.op !== "place_block" || pause?.op !== "insert_break" || !placed.endsAt) return;

    const start = new Date(placed.startsAt);
    const end = new Date(placed.endsAt);
    expect(start.getDate()).toBe(2);
    expect(start.getHours()).toBe(9);
    expect(start.getMinutes()).toBe(0);
    expect((end.getTime() - start.getTime()) / 60_000).toBe(25);
    expect(new Date(pause.startsAt).getHours()).toBe(9);
    expect(new Date(pause.startsAt).getMinutes()).toBe(25);
    expect((new Date(pause.endsAt).getTime() - new Date(pause.startsAt).getTime()) / 60_000).toBe(5);
  });

  it("uses a 15 minute break after four lessons", () => {
    const operations = buildMonthSchedule({
      items: ids.map((id) => item(id)),
      blocks: [],
      completedSourceIds: [],
      month: "2026-11",
      now,
    });
    const breaks = operations.filter((operation) => operation.op === "insert_break");
    const fourth = breaks[3];
    expect(fourth?.op).toBe("insert_break");
    if (fourth?.op !== "insert_break") return;
    expect((new Date(fourth.endsAt).getTime() - new Date(fourth.startsAt).getTime()) / 60_000).toBe(15);
  });

  it("keeps English as one subject and names each lesson on the calendar", () => {
    const english = item(ids[0], { title: "English", subject: "English" });
    const operations = buildMonthSchedule({
      items: [english],
      blocks: [],
      completedSourceIds: [],
      month: "2026-11",
      now,
      moduleLessons: {
        [english.id]: [
          { title: "People in the room", sourceId: "dlg-1", href: "/english/lesson/a1/1/1" },
          { title: "Numbers 11-20", sourceId: "dlg-2", href: "/english/lesson/a1/1/2" },
        ],
      },
    });
    const placed = operations.filter((operation) => operation.op === "place_block");
    expect(placed.map((operation) => (operation.op === "place_block" ? operation.title : ""))).toEqual([
      "English - People in the room",
      "English - Numbers 11-20",
    ]);
  });

  it("interleaves literacy and numeracy in the morning and keeps art and movement in the afternoon", () => {
    const english = item(ids[0], { title: "English", subject: "English" });
    const math = item(ids[1], { title: "Matematyka", subject: "Matematyka" });
    const polish = item(ids[2], { title: "Polski", subject: "Polski" });
    const art = item(ids[3], { title: "Plastyka", subject: "Plastyka" });
    const movement = item(ids[4], { title: "Wychowanie fizyczne", subject: "Wychowanie fizyczne" });
    const operations = buildMonthSchedule({
      items: [english, math, polish, art, movement],
      blocks: [],
      completedSourceIds: [],
      month: "2026-11",
      now,
      moduleLessons: {
        [english.id]: Array.from({ length: 12 }, (_, index) => ({
          title: `Lesson ${index + 1}`,
          sourceId: `dlg-${index}`,
          href: null,
        })),
      },
    });

    const monday = operations.filter(
      (operation) => operation.op === "place_block" && new Date(operation.startsAt).getDate() === 2
    );
    const morning = monday.filter(
      (operation) => operation.op === "place_block" && new Date(operation.startsAt).getHours() < 13
    );
    const afternoon = monday.filter(
      (operation) => operation.op === "place_block" && new Date(operation.startsAt).getHours() >= 13
    );
    const morningIds = morning.map((operation) => (operation.op === "place_block" ? operation.curriculumItemId : ""));

    for (let index = 1; index < morningIds.length; index += 1) {
      expect(morningIds[index]).not.toBe(morningIds[index - 1]);
    }
    const counts = [polish.id, math.id, english.id].map((id) => morningIds.filter((slot) => slot === id).length);
    expect(Math.min(...counts)).toBeGreaterThan(0);
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
    expect(
      afternoon.every(
        (operation) =>
          operation.op === "place_block" &&
          (operation.curriculumItemId === art.id || operation.curriculumItemId === movement.id)
      )
    ).toBe(true);
  });

  it("plans a custom afternoon window only through the requested day", () => {
    const math = item(ids[1], { title: "Matematyka", subject: "Matematyka" });
    const operations = buildMonthSchedule({
      items: [math],
      blocks: [],
      completedSourceIds: [],
      month: "2026-11",
      now,
      windows: [{ start: 12 * 60, end: 15 * 60 }],
      rangeFrom: "2026-11-02",
      rangeUntil: "2026-11-02",
    });
    const placed = operations.filter((operation) => operation.op === "place_block");
    const first = placed[0];
    expect(first?.op).toBe("place_block");
    if (first?.op !== "place_block") return;
    expect(new Date(first.startsAt).getHours()).toBe(12);
    expect(new Date(first.startsAt).getDate()).toBe(2);
    expect(
      placed.every((operation) => operation.op === "place_block" && new Date(operation.startsAt).getDate() === 2)
    ).toBe(true);
    expect(operations[0]).toMatchObject({ op: "replace_month", month: "2026-11" });
  });
});

describe("applyOperations", () => {
  it("rejects a block that overlaps another block", () => {
    const lesson = item(ids[0]);
    const result = applyOperations(
      { items: [lesson], blocks: [] },
      [
        {
          op: "place_block",
          curriculumItemId: lesson.id,
          startsAt: new Date(2026, 10, 2, 9, 0).toISOString(),
          endsAt: new Date(2026, 10, 2, 9, 25).toISOString(),
        },
        {
          op: "place_block",
          curriculumItemId: lesson.id,
          startsAt: new Date(2026, 10, 2, 9, 10).toISOString(),
          endsAt: new Date(2026, 10, 2, 9, 35).toISOString(),
        },
      ],
      now,
      sequence()
    );

    expect("error" in result && result.error).toBe("Ten termin nachodzi na inny blok.");
  });

  it("replaces only the chosen month", () => {
    const lesson = item(ids[0]);
    const november: ScheduleBlock = {
      id: ids[1],
      curriculumItemId: lesson.id,
      kind: "lesson",
      startsAt: new Date(2026, 10, 3, 9, 0).toISOString(),
      endsAt: new Date(2026, 10, 3, 9, 25).toISOString(),
      title: null,
      href: null,
      sourceId: null,
    };
    const december: ScheduleBlock = {
      id: ids[2],
      curriculumItemId: lesson.id,
      kind: "lesson",
      startsAt: new Date(2026, 11, 1, 9, 0).toISOString(),
      endsAt: new Date(2026, 11, 1, 9, 25).toISOString(),
      title: null,
      href: null,
      sourceId: null,
    };
    const result = applyOperations(
      { items: [lesson], blocks: [november, december] },
      [
        { op: "replace_month", month: "2026-11" },
        {
          op: "place_block",
          curriculumItemId: lesson.id,
          startsAt: new Date(2026, 10, 2, 9, 0).toISOString(),
          endsAt: new Date(2026, 10, 2, 9, 25).toISOString(),
        },
      ],
      now,
      sequence()
    );

    expect("error" in result).toBe(false);
    if ("error" in result) return;
    expect(result.state.blocks.some((block) => block.id === december.id)).toBe(true);
    expect(result.state.blocks.some((block) => block.id === november.id)).toBe(false);
    expect(result.state.blocks).toHaveLength(2);
  });

  it("keeps an extra proposal off the calendar until it is accepted", () => {
    const result = applyOperations(
      { items: [], blocks: [] },
      [
        {
          op: "upsert_curriculum_item",
          clientId: "trip",
          kind: "extra",
          status: "proposed",
          title: "Wycieczka do lasu",
          subject: "Teren",
          durationMinutes: 25,
          parentGuide: "Zobaczcie mchy i nazwijcie dwa drzewa.",
        },
        {
          op: "place_block",
          clientId: "trip",
          startsAt: new Date(2026, 10, 2, 15, 0).toISOString(),
          endsAt: new Date(2026, 10, 2, 15, 25).toISOString(),
        },
      ],
      now,
      sequence()
    );

    expect("error" in result && result.error).toBe("Na kalendarz wchodzą tylko zaakceptowane pozycje.");
  });
});

describe("plan calendar skill", () => {
  it("reads the end of the month and a 12-15 window from the parent message", () => {
    expect(fallbackPlanArguments("zaplanuj kalendarz do końca listopada, w godzinach 12-15", "2026-11")).toEqual({
      until: "2026-11-30",
      windows: [{ start: "12:00", end: "15:00" }],
    });
  });

  it("uses every subject inside a 10-13 window when the parent asks for all of them", () => {
    const text = "zaplanuj kalendarz do końca listopada. użyj wszystkich przedmiotów i umieść je w godzinach 10-13";
    expect(fallbackPlanArguments(text, "2026-11")).toMatchObject({
      until: "2026-11-30",
      allSubjects: true,
      windows: [{ start: "10:00", end: "13:00" }],
    });

    const polish = item(ids[2], { title: "Polski", subject: "Polski" });
    const art = item(ids[3], { title: "Plastyka", subject: "Plastyka" });
    const planned = planCalendar({
      month: "2026-11",
      now,
      args: fallbackPlanArguments(text, "2026-11") ?? {},
      items: [polish, art],
      blocks: [],
      completedSourceIds: [],
    });
    expect("error" in planned).toBe(false);
    if ("error" in planned) return;
    const monday = planned.operations.filter(
      (operation) => operation.op === "place_block" && new Date(operation.startsAt).getDate() === 2
    );
    const idsOnMonday = monday.map((operation) => (operation.op === "place_block" ? operation.curriculumItemId : ""));
    expect(idsOnMonday).toContain(polish.id);
    expect(idsOnMonday).toContain(art.id);
    expect(new Date(monday[0] && monday[0].op === "place_block" ? monday[0].startsAt : "").getHours()).toBe(10);
  });

  it("builds the proposal from the skill instead of free-form blocks", () => {
    const math = item(ids[1], { title: "Matematyka", subject: "Matematyka" });
    const planned = planCalendar({
      month: "2026-11",
      now,
      args: { until: "2026-11-02", windows: [{ start: "12:00", end: "15:00" }] },
      items: [math],
      blocks: [],
      completedSourceIds: [],
    });
    expect("error" in planned).toBe(false);
    if ("error" in planned) return;
    const first = planned.operations.find((operation) => operation.op === "place_block");
    expect(first?.op).toBe("place_block");
    if (first?.op !== "place_block") return;
    expect(new Date(first.startsAt).getHours()).toBe(12);
    expect(planned.summary).toContain("12:00–15:00");
  });

  it("adds only informatics at 10:00 and leaves the subject on the list", () => {
    const informatics = item(ids[3], { title: "Informatyka", subject: "Informatyka" });
    const text = "zaplanuj kalendarz do końca miesiąca. dodaj tylko informatykę o godz. 10:00";
    const interpreted = interpretRequest(text, "2026-11", [informatics]);
    expect(interpreted && "tools" in interpreted && interpreted.tools[0]?.tool).toBe("place_subject");
    const shifted = interpretRequest("informatykę przesuń na 11:00", "2026-11", [informatics]);
    expect(shifted && "tools" in shifted && shifted.tools.map((call) => call.tool)).toEqual([
      "remove_from_calendar",
      "place_subject",
    ]);

    const busy = {
      id: ids[4],
      curriculumItemId: informatics.id,
      kind: "lesson" as const,
      startsAt: new Date(2026, 10, 2, 10, 0).toISOString(),
      endsAt: new Date(2026, 10, 2, 10, 25).toISOString(),
      title: "Informatyka",
      href: null,
      sourceId: null,
    };
    const planned = executePlannerTools({
      tools: interpreted && "tools" in interpreted ? interpreted.tools : [],
      month: "2026-11",
      now,
      items: [informatics],
      blocks: [busy],
      completedSourceIds: [],
    });
    expect("error" in planned).toBe(false);
    if ("error" in planned) return;
    const placed = planned.operations.filter((operation) => operation.op === "place_block");
    expect(
      placed.some((operation) => operation.op === "place_block" && new Date(operation.startsAt).getDate() === 2)
    ).toBe(false);
    expect(
      placed.some((operation) => operation.op === "place_block" && new Date(operation.startsAt).getHours() === 10)
    ).toBe(true);
    expect(
      planned.operations.some(
        (operation) => operation.op === "delete_curriculum_item" || operation.op === "replace_month"
      )
    ).toBe(false);
    expect(describePlanContext({ items: [informatics], blocks: [busy] }, "2026-11", now)).toContain("Informatyka");
    expect(describePlanContext({ items: [informatics], blocks: [busy] }, "2026-11", now)).toContain("10:00");

    const math = item(ids[0], { title: "Matematyka", subject: "Matematyka" });
    const polish = item(ids[1], { title: "Polski", subject: "Polski" });
    const dayText = "zaplanuj dzień 26.11. Dodaj do niego 2 przedmioty: matematykę i j.polski w godzinach 11-13";
    const dayPlan = interpretRequest(dayText, "2026-11", [math, polish, informatics]);
    expect(dayPlan && "tools" in dayPlan && dayPlan.tools.map((call) => call.arguments.time)).toEqual([
      "11:00",
      "11:30",
    ]);
    expect(dayPlan && "tools" in dayPlan && dayPlan.tools.every((call) => call.arguments.from === "2026-11-26")).toBe(
      true
    );
    const placedDay = executePlannerTools({
      tools: dayPlan && "tools" in dayPlan ? dayPlan.tools : [],
      month: "2026-11",
      now: new Date(2026, 10, 20, 12, 0, 0),
      items: [math, polish, informatics],
      blocks: [],
      completedSourceIds: [],
    });
    expect("error" in placedDay).toBe(false);
    if ("error" in placedDay) return;
    const lessonDays = placedDay.operations
      .filter((operation) => operation.op === "place_block")
      .map((operation) => (operation.op === "place_block" ? new Date(operation.startsAt).getDate() : 0));
    expect(lessonDays).toEqual([26, 26]);
    expect(fallbackPlanArguments("zaplanuj kalendarz do 26.11", "2026-11")).toMatchObject({ until: "2026-11-26" });
    expect(fallbackPlanArguments("zaplanuj kalendarz do 26.11", "2026-11")?.from).toBeUndefined();
    expect(clarifyingQuestion([{ tool: "ask", arguments: { question: "Do której godziny?" } }])).toBe(
      "Do której godziny?"
    );
    expect(
      clarifyingQuestion([
        { tool: "ask", arguments: { question: "Który przedmiot?" } },
        { tool: "plan_calendar", arguments: {} },
      ])
    ).toBeNull();
  });

  it("stores a revision against the saved calendar, not against unsaved proposal ids", () => {
    const informatics = item(ids[3], { title: "Informatyka", subject: "Informatyka" });
    const saved = { items: [informatics], blocks: [] };
    const first = executePlannerTools({
      tools: [{ tool: "place_subject", arguments: { subject: "Informatyka", time: "10:00", until: "2026-11-02" } }],
      month: "2026-11",
      now,
      items: saved.items,
      blocks: saved.blocks,
      completedSourceIds: [],
    });
    expect("error" in first).toBe(false);
    if ("error" in first) return;
    const draft = applyOperations(saved, first.operations, now);
    expect("error" in draft).toBe(false);
    if ("error" in draft) return;
    const moved = {
      ...draft.state,
      blocks: draft.state.blocks.map((block) =>
        block.kind === "lesson"
          ? {
              ...block,
              startsAt: new Date(2026, 10, 2, 11, 0).toISOString(),
              endsAt: new Date(2026, 10, 2, 11, 25).toISOString(),
            }
          : block
      ),
    };
    const revision = operationsForSavedPlan(saved, moved);
    expect(revision.some((operation) => operation.op === "remove_block")).toBe(false);
    expect(revision.some((operation) => operation.op === "delete_curriculum_item")).toBe(false);
    const checked = applyOperations(saved, revision, now);
    expect("error" in checked).toBe(false);
    if ("error" in checked) return;
    expect(
      checked.state.blocks.some((block) => block.kind === "lesson" && new Date(block.startsAt).getHours() === 11)
    ).toBe(true);
  });

  it("removes one proposed lesson and leaves the other on that day", () => {
    const math = item(ids[1], { title: "Matematyka", subject: "Matematyka" });
    const polish = item(ids[2], { title: "Polski", subject: "Polski" });
    const saved = { items: [math, polish], blocks: [] };
    const later = new Date(2026, 10, 20, 12, 0, 0);
    const planned = executePlannerTools({
      tools: [
        {
          tool: "place_subject",
          arguments: { subject: "Matematyka", time: "11:00", from: "2026-11-26", until: "2026-11-26" },
        },
        {
          tool: "place_subject",
          arguments: { subject: "Polski", time: "11:30", from: "2026-11-26", until: "2026-11-26" },
        },
      ],
      month: "2026-11",
      now: later,
      items: saved.items,
      blocks: [],
      completedSourceIds: [],
    });
    expect("error" in planned).toBe(false);
    if ("error" in planned) return;
    const preview = applyOperations(saved, planned.operations, later);
    expect("error" in preview).toBe(false);
    if ("error" in preview) return;
    const mathBlock = preview.state.blocks.find(
      (block) => block.kind === "lesson" && new Date(block.startsAt).getMinutes() === 0
    );
    expect(mathBlock).toBeTruthy();
    if (!mathBlock) return;
    const dropped = dropPreviewBlock(
      saved,
      planned.operations,
      { startsAt: mathBlock.startsAt, endsAt: mathBlock.endsAt, kind: "lesson" },
      later
    );
    expect("operations" in dropped).toBe(true);
    if (!("operations" in dropped)) return;
    const again = applyOperations(saved, dropped.operations, later);
    expect("error" in again).toBe(false);
    if ("error" in again) return;
    const lessons = again.state.blocks.filter((block) => block.kind === "lesson");
    expect(lessons).toHaveLength(1);
    expect(new Date(lessons[0].startsAt).getMinutes()).toBe(30);
    expect(new Date(lessons[0].startsAt).getDate()).toBe(26);
  });

  it("checks locality before extra activities and does not plan school subjects", () => {
    const ask = extrasTools("Zaproponuj zajęcia dodatkowe.", null, "");
    expect(ask?.map((call) => call.tool)).toEqual(["read_locality", "ask"]);
    const answer = localityAnswer("Krzywaczka", "Nie mam zapisanej okolicy zamieszkania. Napisz miejscowość.");
    expect(answer).toBe("Krzywaczka");
    const tools = extrasTools("Krzywaczka", null, "Nie mam zapisanej okolicy zamieszkania.");
    expect(tools?.map((call) => call.tool)).toEqual(["read_locality", "set_locality", "propose_extras"]);
    const menu = extrasMenu(
      "Krzywaczka",
      [
        { title: "Zamek w Lanckoronie", subject: "Historia", parentGuide: "Zostańcie na dziedzińcu." },
        { title: "Zielnik: mniszek lekarski", subject: "Przyroda", parentGuide: "Narysujcie jeden liść." },
        { title: "Podchody przy: Wawel", subject: "Teren", parentGuide: "Pięć tropów przy murach." },
      ],
      "7 lat"
    );
    expect(menuChoices(menu).map((choice) => choice.title)).toEqual([
      "Zamek w Lanckoronie",
      "Zielnik: mniszek lekarski",
      "Podchody przy: Wawel",
    ]);
    const choice = chosenExtra("Wybieram: Zielnik: mniszek lekarski", menu);
    expect(choice?.subject).toBe("Przyroda");
    const picked = extrasTools("Wybieram: Zielnik: mniszek lekarski", "Krzywaczka", menu);
    expect(picked?.map((call) => call.tool)).toEqual(["place_chosen_extra"]);
    if (!choice) return;
    const planned = placeChosenExtra(choice, [], new Date(2026, 10, 20, 12, 0, 0));
    expect("operations" in planned).toBe(true);
    if (!("operations" in planned)) return;
    expect(planned.operations.some((operation) => operation.op === "place_block")).toBe(true);
    expect(planned.summary).not.toMatch(/nie na kalendarzu/);
    expect(JSON.stringify(planned.operations)).not.toMatch(/Matematyka|Polski/);
  });

  it("moves a proposed extra to the requested hour, and to the next day when that hour has passed", () => {
    const lessonStart = new Date(2026, 10, 20, 16, 30).toISOString();
    const lessonEnd = new Date(2026, 10, 20, 16, 55).toISOString();
    const operations = [
      {
        op: "upsert_curriculum_item" as const,
        clientId: "extra-przyroda",
        kind: "extra" as const,
        status: "accepted" as const,
        title: "Zielnik: klon jesionolistny",
        subject: "Przyroda",
        durationMinutes: 25,
        parentGuide: "Narysujcie liść.",
      },
      {
        op: "place_block" as const,
        clientId: "extra-przyroda",
        startsAt: lessonStart,
        endsAt: lessonEnd,
        title: "Zielnik: klon jesionolistny",
      },
      {
        op: "insert_break" as const,
        startsAt: lessonEnd,
        endsAt: new Date(2026, 10, 20, 17, 0).toISOString(),
      },
    ];
    const early = reviseProposedStart(
      operations,
      "nie, piątek 20.11 ale godzina 11",
      "2026-11",
      [],
      new Date(2026, 10, 20, 9, 0)
    );
    expect(early && "operations" in early).toBe(true);
    if (!early || !("operations" in early)) return;
    const earlyLesson = early.operations.find((operation) => operation.op === "place_block");
    expect(earlyLesson && earlyLesson.op === "place_block" && new Date(earlyLesson.startsAt).getHours()).toBe(11);
    expect(earlyLesson && earlyLesson.op === "place_block" && new Date(earlyLesson.startsAt).getDate()).toBe(20);
    expect(early.summary).toMatch(/Zatwierdź/);

    const late = reviseProposedStart(
      operations,
      "nie, piątek 20.11 ale godzina 11",
      "2026-11",
      [],
      new Date(2026, 10, 20, 16, 11)
    );
    expect(late && "operations" in late).toBe(true);
    if (!late || !("operations" in late)) return;
    const lateLesson = late.operations.find((operation) => operation.op === "place_block");
    expect(lateLesson && lateLesson.op === "place_block" && new Date(lateLesson.startsAt).getDate()).toBe(23);
    expect(lateLesson && lateLesson.op === "place_block" && new Date(lateLesson.startsAt).getHours()).toBe(11);
    expect(late.summary).toMatch(/już minęła/);
    const lateBreak = late.operations.find((operation) => operation.op === "insert_break");
    expect(lateBreak && lateBreak.op === "insert_break" && new Date(lateBreak.startsAt).getHours()).toBe(11);
    expect(lateBreak && lateBreak.op === "insert_break" && new Date(lateBreak.startsAt).getMinutes()).toBe(25);
  });
});

describe("month clear range", () => {
  it("covers only the chosen month in Warsaw time", () => {
    expect(monthInstantRange("2026-11")).toEqual({
      from: "2026-10-31T23:00:00.000Z",
      until: "2026-11-30T23:00:00.000Z",
    });
  });
});

function sequence(): () => string {
  let cursor = 10;
  return () => {
    cursor += 1;
    return `99999999-9999-4999-8999-${String(cursor).padStart(12, "0")}`;
  };
}
