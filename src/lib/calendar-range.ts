export type CalendarRange = "day" | "week" | "month";

export interface CalendarCaption {
  eyebrow: string;
  title: string;
  previousLabel: string;
  nextLabel: string;
}

function capitalize(value: string): string {
  if (!value) return value;
  return value.charAt(0).toLocaleUpperCase("pl-PL") + value.slice(1);
}

export function parseCalendarRange(value: string | null): CalendarRange {
  if (value === "week" || value === "month") return value;
  return "day";
}

export function parseCalendarOffset(value: string | null, range: CalendarRange): number {
  const parsed = Number.parseInt(value ?? "0", 10);
  if (!Number.isFinite(parsed)) return 0;
  const limit = range === "month" ? 24 : range === "week" ? 52 : 366;
  return Math.max(-limit, Math.min(limit, parsed));
}

export function calendarHref(range: CalendarRange, offset: number): string {
  const params = new URLSearchParams();
  if (range !== "day") params.set("range", range);
  if (offset !== 0) params.set("offset", String(offset));
  const query = params.toString();
  return query ? `/dashboard?${query}` : "/dashboard";
}

export function focusDate(now: Date, range: CalendarRange, offset: number): Date {
  const date = new Date(now);
  date.setHours(12, 0, 0, 0);
  if (range === "month") date.setMonth(date.getMonth() + offset);
  else if (range === "week") date.setDate(date.getDate() + offset * 7);
  else date.setDate(date.getDate() + offset);
  return date;
}

/** Monday-first week that contains `focus`. */
export function weekGrid(focus: Date): Date[] {
  const date = new Date(focus);
  date.setHours(12, 0, 0, 0);
  const startPad = (date.getDay() + 6) % 7;
  const monday = new Date(date);
  monday.setDate(date.getDate() - startPad);

  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + index);
    return day;
  });
}

function weekTitle(focus: Date): string {
  const days = weekGrid(focus);
  const start = days[0];
  const end = days[6];
  if (!start || !end) return "";
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  if (sameMonth) {
    const endLabel = end.toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" });
    return `${start.getDate()}–${endLabel}`;
  }
  const startLabel = start.toLocaleDateString("pl-PL", { day: "numeric", month: "long" });
  const endLabel = end.toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" });
  return `${startLabel} – ${endLabel}`;
}

export function rangeCaption(range: CalendarRange, focus: Date): CalendarCaption {
  if (range === "month") {
    return {
      eyebrow: "Miesiąc",
      title: capitalize(focus.toLocaleDateString("pl-PL", { month: "long", year: "numeric" })),
      previousLabel: "Poprzedni miesiąc",
      nextLabel: "Następny miesiąc",
    };
  }

  if (range === "week") {
    return {
      eyebrow: "Tydzień",
      title: weekTitle(focus),
      previousLabel: "Poprzedni tydzień",
      nextLabel: "Następny tydzień",
    };
  }

  return {
    eyebrow: "Dzień",
    title: capitalize(
      focus.toLocaleDateString("pl-PL", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    ),
    previousLabel: "Poprzedni dzień",
    nextLabel: "Następny dzień",
  };
}

/** Monday-first grid covering the focused month, including the leading and trailing days. */
export function monthGrid(focus: Date): Date[] {
  const first = new Date(focus.getFullYear(), focus.getMonth(), 1, 12, 0, 0, 0);
  const startPad = (first.getDay() + 6) % 7;
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - startPad);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return date;
  });
}

export const weekdayLabels = Array.from({ length: 7 }, (_, index) => {
  const monday = new Date(2026, 0, 5 + index, 12, 0, 0, 0);
  return monday.toLocaleDateString("pl-PL", { weekday: "short" });
});
