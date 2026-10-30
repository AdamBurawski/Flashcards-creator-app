export type WidgetZone = "main" | "aside";

export interface DashboardWidgetDefinition {
  id: string;
  title: string;
  description: string;
  zone: WidgetZone;
  placedOnDashboard: boolean;
}

export const dashboardWidgets: DashboardWidgetDefinition[] = [
  {
    id: "weekly-plan",
    title: "Kalendarz",
    description: "Widok dnia, tygodnia albo miesiąca. Ten sam plan co „Teraz do zrobienia”.",
    zone: "main",
    placedOnDashboard: true,
  },
  {
    id: "now-todo",
    title: "Teraz do zrobienia",
    description: "Wpis z kalendarza tygodnia, który trwa w tej chwili.",
    zone: "main",
    placedOnDashboard: true,
  },
  {
    id: "backlog",
    title: "Zaległości",
    description: "Lekcje, które nie zostały zrobione w terminie.",
    zone: "main",
    placedOnDashboard: true,
  },
  {
    id: "priorities",
    title: "Priorytety",
    description: "To, co warto zrobić w pierwszej kolejności.",
    zone: "main",
    placedOnDashboard: false,
  },
  {
    id: "overall-progress",
    title: "Postęp ogólny",
    description: "Ile tematów jest już przerobionych.",
    zone: "aside",
    placedOnDashboard: true,
  },
  {
    id: "module-progress",
    title: "Postępy w modułach",
    description: "English i placeholdery kolejnych przedmiotów.",
    zone: "aside",
    placedOnDashboard: true,
  },
  {
    id: "english-snapshot",
    title: "English — szybki podgląd",
    description: "Ukończone dialogi, średni wynik i skrót do modułu.",
    zone: "aside",
    placedOnDashboard: true,
  },
];

export function widgetsByZone(zone: WidgetZone): DashboardWidgetDefinition[] {
  return dashboardWidgets.filter((widget) => widget.zone === zone);
}

export interface DashboardSlot {
  id: string;
  className: string;
}

/** Fixed places. A widget stretches to the slot it currently occupies. */
export const dashboardSlots: DashboardSlot[] = [
  { id: "slot-0", className: "h-[28rem] lg:col-span-8 lg:row-span-2" },
  { id: "slot-1", className: "h-[13.5rem] lg:col-span-4" },
  { id: "slot-2", className: "h-[13.5rem] lg:col-span-4" },
  { id: "slot-3", className: "h-64 lg:col-span-4" },
  { id: "slot-4", className: "h-64 lg:col-span-4" },
  { id: "slot-5", className: "h-64 lg:col-span-4" },
  { id: "slot-6", className: "h-48 lg:col-span-12" },
];

export const defaultPlacedWidgetIds = [
  "weekly-plan",
  "overall-progress",
  "module-progress",
  "now-todo",
  "backlog",
  "english-snapshot",
];

export const DASHBOARD_LAYOUT_KEY = "edudom.dashboard.widgetIds";
export const DASHBOARD_LAYOUT_EVENT = "edudom-dashboard-layout";

const knownWidgetIds = new Set(dashboardWidgets.map((widget) => widget.id));

export function sanitizeWidgetIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) return [...defaultPlacedWidgetIds];

  const unique: string[] = [];
  for (const id of ids) {
    if (typeof id === "string" && knownWidgetIds.has(id) && !unique.includes(id)) {
      unique.push(id);
    }
  }

  return unique.slice(0, dashboardSlots.length);
}

export function readPlacedWidgetIds(): string[] {
  if (typeof window === "undefined") return [...defaultPlacedWidgetIds];

  try {
    const raw = window.localStorage.getItem(DASHBOARD_LAYOUT_KEY);
    if (!raw) return [...defaultPlacedWidgetIds];
    return sanitizeWidgetIds(JSON.parse(raw));
  } catch {
    return [...defaultPlacedWidgetIds];
  }
}

export function writePlacedWidgetIds(ids: string[]): string[] {
  const next = sanitizeWidgetIds(ids);
  window.localStorage.setItem(DASHBOARD_LAYOUT_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent<string[]>(DASHBOARD_LAYOUT_EVENT, { detail: next }));
  return next;
}

export function addWidget(ids: string[], widgetId: string): string[] {
  if (ids.includes(widgetId) || ids.length >= dashboardSlots.length) return ids;
  if (!knownWidgetIds.has(widgetId)) return ids;
  return [...ids, widgetId];
}

export function removeWidget(ids: string[], widgetId: string): string[] {
  return ids.filter((id) => id !== widgetId);
}

export function placeWidgetAtSlot(ids: string[], widgetId: string, slotIndex: number): string[] {
  const from = ids.indexOf(widgetId);
  if (from < 0) return ids;

  if (slotIndex >= ids.length) {
    if (from === ids.length - 1) return ids;
    return [...ids.filter((id) => id !== widgetId), widgetId];
  }

  if (from === slotIndex) return ids;

  const next = ids.filter((id) => id !== widgetId);
  next.splice(slotIndex, 0, widgetId);
  return next;
}
