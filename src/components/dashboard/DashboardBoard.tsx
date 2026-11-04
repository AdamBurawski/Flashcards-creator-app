import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { CalendarRange } from "../../lib/calendar-range";
import { selectCurrentTask } from "../../lib/current-task";
import {
  DASHBOARD_LAYOUT_EVENT,
  dashboardSlots,
  dashboardWidgets,
  defaultPlacedWidgetIds,
  placeWidgetAtSlot,
  readPlacedWidgetIds,
  removeWidget,
  writePlacedWidgetIds,
  type DashboardWidgetDefinition,
} from "../../lib/dashboard-widgets";

type WeeklyStatus = "done" | "planned" | "upcoming";

interface WeeklyItem {
  id: string;
  title: string;
  module: string;
  dayKey: string;
  dayLabel: string;
  dateLabel: string;
  timeLabel: string;
  endLabel?: string;
  status: WeeklyStatus;
  href?: string;
  isMock?: boolean;
}

interface CalendarDay {
  dayKey: string;
  dayLabel: string;
  dateLabel: string;
  dayNumber: number;
  isToday: boolean;
  inRange: boolean;
  items: WeeklyItem[];
}

interface ModuleCard {
  title: string;
  subtitle: string;
  value: string;
  href: string;
  color: string;
}

export interface DashboardBoardData {
  calendar: {
    range: CalendarRange;
    title: string;
    weekdayLabels: string[];
    days: CalendarDay[];
  };
  todayTasks: WeeklyItem[];
  backlogTasks: WeeklyItem[];
  priorityTasks: WeeklyItem[];
  overallPercent: number;
  overallCompletedTopics: number;
  overallPlannedTopics: number;
  moduleCards: ModuleCard[];
  englishCompletedDialogues: number;
  englishTotalDialogues: number;
  recentEnglishAvg: number;
  collectionsCount: number;
}

interface DashboardBoardProps {
  data: DashboardBoardData;
  canManageLayout?: boolean;
}

function widgetById(id: string): DashboardWidgetDefinition | undefined {
  return dashboardWidgets.find((widget) => widget.id === id);
}

function statusBadgeClass(status: WeeklyStatus): string {
  if (status === "done") return "bg-emerald-100 text-emerald-700";
  if (status === "planned") return "bg-blue-100 text-blue-700";
  return "bg-amber-100 text-amber-700";
}

function statusLabel(status: WeeklyStatus): string {
  if (status === "planned") return "Zaplanowane";
  if (status === "done") return "Wykonane";
  return "Nadchodzi";
}

function slotLabel(task: WeeklyItem): string {
  if (task.endLabel && task.endLabel !== task.timeLabel) return `${task.timeLabel}–${task.endLabel}`;
  return task.timeLabel;
}

function TaskList({ tasks, empty }: { tasks: WeeklyItem[]; empty: string }) {
  if (tasks.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
        {empty}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {tasks.map((task) => (
        <div
          key={task.id}
          className="flex items-start justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2"
        >
          <div>
            <p className="text-sm font-semibold text-slate-800">{task.title}</p>
            <p className="text-xs text-slate-500">
              {slotLabel(task)} — {task.module}
            </p>
          </div>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusBadgeClass(task.status)}`}>
            {statusLabel(task.status)}
          </span>
        </div>
      ))}
    </div>
  );
}

function CalendarItem({ item, active }: { item: WeeklyItem; active: boolean }) {
  return (
    <div
      className={`rounded-xl border bg-white p-2 ${active ? "border-blue-400 ring-2 ring-blue-200" : "border-slate-200"}`}
    >
      <p className="text-[11px] font-semibold text-slate-500">{slotLabel(item)}</p>
      {item.href ? (
        <a href={item.href} className="block text-xs font-semibold text-slate-800 hover:text-blue-700">
          {item.title}
        </a>
      ) : (
        <p className="text-xs font-semibold text-slate-800">{item.title}</p>
      )}
      <p className="text-[11px] text-slate-500">{item.module}</p>
    </div>
  );
}

function DayCalendar({ day, currentTaskId }: { day: CalendarDay | undefined; currentTaskId: string | null }) {
  if (!day) {
    return <p className="text-sm text-slate-500">Brak wybranego dnia.</p>;
  }

  return (
    <div className="min-h-0 flex-1 overflow-auto rounded-2xl border border-blue-100 bg-blue-50/40 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{day.dayLabel}</p>
      <p className="mb-3 text-sm font-semibold text-slate-800">{day.dateLabel}</p>
      {day.items.length === 0 ? (
        <p className="text-sm text-slate-400">Brak zadań w tym dniu.</p>
      ) : (
        <div className="space-y-2">
          {day.items.map((item) => (
            <CalendarItem key={item.id} item={item} active={item.id === currentTaskId} />
          ))}
        </div>
      )}
    </div>
  );
}

function WeekCalendar({ days, currentTaskId }: { days: CalendarDay[]; currentTaskId: string | null }) {
  return (
    <div className="grid min-h-0 flex-1 grid-cols-2 gap-2 overflow-auto xl:grid-cols-7">
      {days.map((day) => (
        <div
          key={day.dayKey}
          className={`rounded-2xl border p-2 ${day.isToday ? "border-blue-200 bg-blue-50/60" : "border-slate-200 bg-slate-50/50"}`}
        >
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{day.dayLabel}</p>
          <p className="mb-2 text-sm font-semibold text-slate-800">{day.dateLabel}</p>
          {day.items.length === 0 ? (
            <p className="text-xs text-slate-400">Brak zadań</p>
          ) : (
            <div className="space-y-1.5">
              {day.items.map((item) => (
                <CalendarItem key={item.id} item={item} active={item.id === currentTaskId} />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function MonthCalendar({
  days,
  weekdayLabels,
  currentTaskId,
}: {
  days: CalendarDay[];
  weekdayLabels: string[];
  currentTaskId: string | null;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto">
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {weekdayLabels.map((label) => (
          <p key={label}>{label}</p>
        ))}
      </div>
      <div className="mt-1 grid flex-1 grid-cols-7 gap-1">
        {days.map((day) => (
          <div
            key={day.dayKey}
            className={`min-h-16 rounded-xl border p-1 ${
              day.isToday ? "border-blue-200 bg-blue-50/70" : "border-slate-100 bg-white"
            } ${day.inRange ? "" : "opacity-40"}`}
          >
            <p
              className={`mb-1 grid h-5 w-5 place-items-center rounded-full text-[11px] font-semibold ${
                day.isToday ? "bg-blue-600 text-white" : "text-slate-700"
              }`}
            >
              {day.dayNumber}
            </p>
            {day.items.slice(0, 2).map((item) => (
              <p
                key={item.id}
                className={`mb-0.5 truncate rounded px-1 text-[10px] font-medium ${
                  item.id === currentTaskId ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"
                }`}
                title={`${slotLabel(item)} ${item.title}`}
              >
                {item.timeLabel} {item.title}
              </p>
            ))}
            {day.items.length > 2 && <p className="px-1 text-[10px] text-slate-400">+{day.items.length - 2}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

function NowTodo({ task }: { task: WeeklyItem | null }) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <h3 className="mb-3 text-lg font-semibold text-slate-900">Teraz do zrobienia</h3>
      <div className="min-h-0 flex-1">
        {task ? <TaskList tasks={[task]} empty="" /> : <TaskList tasks={[]} empty="W kalendarzu nic teraz nie trwa." />}
      </div>
    </div>
  );
}

function WidgetBody({
  id,
  data,
  currentTaskId,
}: {
  id: string;
  data: DashboardBoardData;
  currentTaskId: string | null;
}) {
  if (id === "weekly-plan") {
    const { calendar } = data;
    return (
      <div className="flex h-full min-h-0 flex-col">
        <h2 className="text-xl font-semibold text-slate-900">
          Kalendarz — {calendar.range === "month" ? "miesiąc" : calendar.range === "week" ? "tydzień" : "dzień"}
        </h2>
        <p className="mb-3 text-sm text-slate-500">
          {calendar.title}. „Teraz do zrobienia” pokazuje wpis z tego planu, gdy aktualna godzina wpada w jego
          przedział. Synchronizacja z Google Calendar jest w przygotowaniu.
        </p>
        {calendar.range === "month" ? (
          <MonthCalendar days={calendar.days} weekdayLabels={calendar.weekdayLabels} currentTaskId={currentTaskId} />
        ) : calendar.range === "week" ? (
          <WeekCalendar days={calendar.days} currentTaskId={currentTaskId} />
        ) : (
          <DayCalendar day={calendar.days[0]} currentTaskId={currentTaskId} />
        )}
      </div>
    );
  }

  if (id === "now-todo") {
    const task = data.todayTasks.find((item) => item.id === currentTaskId) ?? null;
    return <NowTodo task={task} />;
  }

  if (id === "backlog") {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <h3 className="mb-3 text-lg font-semibold text-slate-900">Zaległości</h3>
        <div className="min-h-0 flex-1 overflow-auto">
          <TaskList tasks={data.backlogTasks} empty="Brak zaległości." />
        </div>
      </div>
    );
  }

  if (id === "priorities") {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <h3 className="mb-3 text-lg font-semibold text-slate-900">Priorytety</h3>
        <div className="min-h-0 flex-1 overflow-auto">
          <TaskList tasks={data.priorityTasks} empty="Brak priorytetów na ten tydzień." />
        </div>
      </div>
    );
  }

  if (id === "overall-progress") {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-auto">
        <h3 className="text-xl font-semibold text-slate-900">Postęp ogólny</h3>
        <div className="mt-4 flex items-center gap-4">
          <div
            className="grid h-24 w-24 shrink-0 place-items-center rounded-full text-center"
            style={{
              background: `conic-gradient(#34d399 ${data.overallPercent}%, #e5e7eb ${data.overallPercent}%)`,
            }}
          >
            <div className="grid h-16 w-16 place-items-center rounded-full bg-white text-sm font-bold text-slate-800">
              {data.overallPercent}%
            </div>
          </div>
          <div>
            <p className="text-sm text-slate-500">Przerobione tematy</p>
            <p className="text-2xl font-bold text-slate-900">
              {data.overallCompletedTopics}
              <span className="text-base font-medium text-slate-500"> / {data.overallPlannedTopics}</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (id === "module-progress") {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <h3 className="mb-3 text-lg font-semibold text-slate-900">Postępy w modułach</h3>
        <div className="min-h-0 flex-1 space-y-2 overflow-auto">
          {data.moduleCards.map((module) => (
            <a
              key={module.title}
              href={module.href}
              className={`block rounded-2xl border p-3 transition hover:shadow-sm ${module.color}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{module.title}</p>
                  <p className="text-xs opacity-80">{module.subtitle}</p>
                </div>
                <span className="rounded-full bg-white/90 px-2 py-0.5 text-xs font-bold">{module.value}</span>
              </div>
            </a>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-auto">
      <h3 className="text-lg font-semibold text-slate-900">English — szybki podgląd</h3>
      <div className="mt-3 space-y-2 text-sm text-slate-600">
        <p className="flex items-center justify-between">
          <span>Ukończone dialogi</span>
          <strong className="text-slate-900">
            {data.englishCompletedDialogues}/{data.englishTotalDialogues}
          </strong>
        </p>
        <p className="flex items-center justify-between">
          <span>Średni wynik</span>
          <strong className="text-slate-900">{data.recentEnglishAvg}%</strong>
        </p>
        <p className="flex items-center justify-between">
          <span>Kolekcje fiszek</span>
          <strong className="text-slate-900">{data.collectionsCount}</strong>
        </p>
      </div>
      <a
        href="/english"
        className="mt-4 inline-flex w-fit items-center rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
      >
        Przejdź do English
      </a>
    </div>
  );
}

export default function DashboardBoard({ data, canManageLayout = true }: DashboardBoardProps) {
  const [order, setOrder] = useState<string[]>(defaultPlacedWidgetIds);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const [now, setNow] = useState(() => new Date());
  const orderRef = useRef(order);
  const draggingIdRef = useRef<string | null>(null);
  const currentTask = selectCurrentTask(data.todayTasks, now);

  useEffect(() => {
    orderRef.current = order;
  }, [order]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const sync = (next: string[]) => {
      orderRef.current = next;
      setOrder(next);
    };

    sync(readPlacedWidgetIds());

    const onLayout = (event: Event) => {
      if (draggingIdRef.current) return;
      const detail = (event as CustomEvent<string[]>).detail;
      if (Array.isArray(detail)) sync(detail);
    };

    window.addEventListener(DASHBOARD_LAYOUT_EVENT, onLayout);
    return () => window.removeEventListener(DASHBOARD_LAYOUT_EVENT, onLayout);
  }, []);

  useEffect(() => {
    if (!draggingId) return;
    const previousCursor = document.body.style.cursor;
    document.body.style.cursor = "grabbing";
    return () => {
      document.body.style.cursor = previousCursor;
    };
  }, [draggingId]);

  const startDrag = (widgetId: string, event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest("button, a")) return;
    event.preventDefault();

    const startX = event.clientX;
    const startY = event.clientY;
    let active = false;

    const moveToSlot = (slotIndex: number) => {
      const next = placeWidgetAtSlot(orderRef.current, widgetId, slotIndex);
      if (next === orderRef.current) return;

      const previousRects = new Map<string, DOMRect>();
      document.querySelectorAll<HTMLElement>("[data-widget-id]").forEach((element) => {
        const id = element.dataset.widgetId;
        if (id) previousRects.set(id, element.getBoundingClientRect());
      });

      orderRef.current = next;
      setOrder(next);

      requestAnimationFrame(() => {
        document.querySelectorAll<HTMLElement>("[data-widget-id]").forEach((element) => {
          const id = element.dataset.widgetId;
          const first = id ? previousRects.get(id) : undefined;
          if (!first || id === widgetId) return;
          const last = element.getBoundingClientRect();
          const dx = first.left - last.left;
          const dy = first.top - last.top;
          if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
          element.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "translate(0, 0)" }], {
            duration: 240,
            easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          });
        });
      });
    };

    const onPointerMove = (moveEvent: PointerEvent) => {
      if (!active) {
        const distance = Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY);
        if (distance < 6) return;
        active = true;
        draggingIdRef.current = widgetId;
        setDraggingId(widgetId);
      }

      setPointer({ x: moveEvent.clientX, y: moveEvent.clientY });
      const hit = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY);
      const slotElement = hit?.closest("[data-slot-index]");
      if (!slotElement) return;
      const slotIndex = Number((slotElement as HTMLElement).dataset.slotIndex);
      if (Number.isNaN(slotIndex)) return;
      moveToSlot(slotIndex);
    };

    const finishDrag = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", finishDrag);
      window.removeEventListener("pointercancel", finishDrag);
      if (!active) return;
      writePlacedWidgetIds(orderRef.current);
      draggingIdRef.current = null;
      setDraggingId(null);
      setPointer(null);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", finishDrag);
    window.addEventListener("pointercancel", finishDrag);
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
      {dashboardSlots.map((slot, index) => {
        const widgetId = order[index];
        const widget = widgetId ? widgetById(widgetId) : undefined;
        const isDragging = widgetId !== undefined && widgetId === draggingId;

        return (
          <div key={slot.id} data-slot-index={index} className={`${slot.className} min-w-0`}>
            {widget ? (
              <article
                id={widget.id}
                data-widget-id={widget.id}
                className={`flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border bg-white/95 p-4 shadow-sm sm:p-5 ${
                  isDragging ? "border-dashed border-blue-200 bg-blue-50/50 opacity-40" : "border-slate-200"
                }`}
              >
                {canManageLayout ? (
                  <div
                    className="relative mb-3 flex h-7 cursor-grab touch-none items-center active:cursor-grabbing"
                    onPointerDown={(event) => startDrag(widget.id, event)}
                  >
                    <span className="sr-only">Przesuń widget {widget.title}</span>
                    <span aria-hidden="true" className="flex items-center gap-1 text-slate-300">
                      <span className="h-1 w-1 rounded-full bg-current" />
                      <span className="h-1 w-1 rounded-full bg-current" />
                      <span className="h-1 w-1 rounded-full bg-current" />
                    </span>
                    <button
                      type="button"
                      className="ml-auto rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700"
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={() => {
                        const next = writePlacedWidgetIds(removeWidget(orderRef.current, widget.id));
                        orderRef.current = next;
                        setOrder(next);
                      }}
                    >
                      Usuń
                    </button>
                  </div>
                ) : (
                  <div className="mb-3 h-2" aria-hidden="true" />
                )}
                <div className="min-h-0 flex-1">
                  <WidgetBody id={widget.id} data={data} currentTaskId={currentTask?.id ?? null} />
                </div>
              </article>
            ) : (
              <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white/40 px-4 text-center text-sm text-slate-400">
                Wolne miejsce
              </div>
            )}
          </div>
        );
      })}

      {draggingId && pointer && (
        <div className="pointer-events-none fixed z-50" style={{ left: pointer.x + 18, top: pointer.y + 14 }}>
          <div className="widget-drag-preview w-60 origin-top-left overflow-hidden rounded-2xl border border-white/80 bg-white/55 p-3 text-slate-800 shadow-2xl backdrop-blur-sm">
            <p className="mb-2 truncate text-xs font-semibold text-slate-700">{widgetById(draggingId)?.title}</p>
            <div className="max-h-36 overflow-hidden opacity-80">
              <WidgetBody id={draggingId} data={data} currentTaskId={currentTask?.id ?? null} />
            </div>
          </div>
        </div>
      )}
      <style>{`
        .widget-drag-preview {
          opacity: 0.72;
          transform: scale(0.78) rotate(-1.5deg);
          animation: widgetLift 180ms ease-out;
        }
        @keyframes widgetLift {
          from { opacity: 0; transform: scale(0.62) rotate(-4deg); }
          to { opacity: 0.72; transform: scale(0.78) rotate(-1.5deg); }
        }
      `}</style>
    </div>
  );
}
