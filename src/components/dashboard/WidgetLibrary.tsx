import { useEffect, useState } from "react";
import {
  DASHBOARD_LAYOUT_EVENT,
  addWidget,
  dashboardSlots,
  defaultPlacedWidgetIds,
  readPlacedWidgetIds,
  removeWidget,
  widgetsByZone,
  writePlacedWidgetIds,
  type WidgetZone,
} from "../../lib/dashboard-widgets";

const zones: { id: WidgetZone; title: string }[] = [
  { id: "main", title: "Kolumna główna" },
  { id: "aside", title: "Kolumna boczna" },
];

export default function WidgetLibrary() {
  const [placedIds, setPlacedIds] = useState<string[]>(defaultPlacedWidgetIds);

  useEffect(() => {
    const sync = (next: string[]) => setPlacedIds(next);
    sync(readPlacedWidgetIds());

    const onLayout = (event: Event) => {
      const detail = (event as CustomEvent<string[]>).detail;
      if (Array.isArray(detail)) sync(detail);
    };

    window.addEventListener(DASHBOARD_LAYOUT_EVENT, onLayout);
    return () => window.removeEventListener(DASHBOARD_LAYOUT_EVENT, onLayout);
  }, []);

  const boardIsFull = placedIds.length >= dashboardSlots.length;

  return (
    <div className="mt-6 space-y-8">
      {zones.map((zone) => (
        <section key={zone.id}>
          <h2 className="mb-3 text-lg font-semibold text-slate-900">{zone.title}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {widgetsByZone(zone.id).map((widget) => {
              const isPlaced = placedIds.includes(widget.id);
              return (
                <article key={widget.id} className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-base font-semibold text-slate-900">{widget.title}</h3>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        isPlaced
                          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                          : "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
                      }`}
                    >
                      {isPlaced ? "Na panelu" : "W bibliotece"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{widget.description}</p>
                  <div className="mt-4">
                    {isPlaced ? (
                      <button
                        type="button"
                        className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700"
                        onClick={() => setPlacedIds(writePlacedWidgetIds(removeWidget(placedIds, widget.id)))}
                      >
                        Usuń z panelu
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={boardIsFull}
                        className="rounded-full bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                        onClick={() => setPlacedIds(writePlacedWidgetIds(addWidget(placedIds, widget.id)))}
                      >
                        {boardIsFull ? "Brak wolnego miejsca" : "Dodaj do panelu"}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
