import { useEffect, useRef, useState } from "react";
import {
  applyOperations,
  firstFreeStart,
  monthKey,
  type CurriculumItem,
  type CurriculumKind,
  type ScheduleBlock,
} from "../../lib/lesson-plan";
import type { LessonPlanSnapshot } from "../../lib/plan-store";
import { menuChoices } from "../../lib/planner-skills";

interface LessonPlanBoardProps {
  initialMonth: string;
  initialPlan: LessonPlanSnapshot;
}

interface ItemDraft {
  title: string;
  subject: string;
  durationMinutes: string;
  parentGuide: string;
  status: "proposed" | "accepted";
}

const emptyDraft: ItemDraft = {
  title: "",
  subject: "",
  durationMinutes: "25",
  parentGuide: "",
  status: "accepted",
};

export default function LessonPlanBoard({ initialMonth, initialPlan }: LessonPlanBoardProps) {
  const [month, setMonth] = useState(initialMonth);
  const [plan, setPlan] = useState(initialPlan);
  const [busy, setBusy] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [paging, setPaging] = useState<"prev" | "next" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [chatText, setChatText] = useState("");
  const [openGuideId, setOpenGuideId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ItemDraft>(emptyDraft);
  const [addingKind, setAddingKind] = useState<CurriculumKind | null>(null);
  const [drop, setDrop] = useState<{ itemId: string; dayKey: string; time: string } | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const transcript = transcriptRef.current;
    if (!transcript) return;
    transcript.scrollTop = transcript.scrollHeight;
  }, [plan.messages, thinking]);

  const refresh = async (nextMonth = month) => {
    const response = await fetch(`/api/plan?month=${nextMonth}`);
    const data = await response.json();
    if (!response.ok || !data.success) {
      setMessage(data.message ?? "Nie udało się odświeżyć planu.");
      return false;
    }
    setPlan(data.plan);
    setMonth(nextMonth);
    return true;
  };

  const openMonth = (delta: number) => {
    const next = addMonths(month, delta);
    setPaging(delta < 0 ? "prev" : "next");
    setMonth(next);
    setBusy(true);
    setMessage(null);
    void refresh(next)
      .then((ok) => {
        if (!ok) setMonth(month);
      })
      .finally(() => {
        setBusy(false);
        setPaging(null);
      });
  };

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setMessage(null);
    try {
      await action();
      await refresh();
    } catch {
      setMessage("Coś poszło nie tak.");
    } finally {
      setBusy(false);
    }
  };

  const askAgent = (action: () => Promise<void>) => {
    setThinking(true);
    void run(action).finally(() => setThinking(false));
  };

  const saveNew = (kind: CurriculumKind) =>
    run(async () => {
      const response = await fetch("/api/plan/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          title: draft.title,
          subject: draft.subject,
          durationMinutes: Number(draft.durationMinutes) || 25,
          parentGuide: draft.parentGuide,
          status: kind === "extra" ? draft.status : "accepted",
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setAddingKind(null);
      setDraft(emptyDraft);
    });

  const saveEdit = (item: CurriculumItem) =>
    run(async () => {
      const response = await fetch(`/api/plan/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draft.title,
          subject: draft.subject,
          durationMinutes: Number(draft.durationMinutes) || 25,
          parentGuide: draft.parentGuide,
          status: draft.status,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setEditingId(null);
    });

  const placeDropped = () =>
    run(async () => {
      if (!drop) return;
      const start = dateFromDayAndTime(drop.dayKey, drop.time);
      if (!start || start.getTime() < Date.now()) {
        setMessage("Ta godzina już minęła. Wybierz późniejszy termin albo inny dzień.");
        return;
      }
      const response = await fetch("/api/plan/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ curriculumItemId: drop.itemId, startsAt: start.toISOString() }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.message ?? "Nie udało się położyć zajęć.");
        return;
      }
      setDrop(null);
      setMessage("Położone. Ten sam przedmiot zostaje na liście i można go wstawić jeszcze raz.");
    });

  const mainItems = plan.items.filter((item) => item.kind === "main");
  const extraItems = plan.items.filter((item) => item.kind === "extra");
  const cells = monthCells(month);
  const proposalChanges = proposalDiff(plan);
  const confirmMessageId = plan.proposal
    ? [...plan.messages]
        .reverse()
        .find(
          (entry) =>
            entry.role === "assistant" && (entry.proposalId === plan.proposal?.id || /zatwierdź/i.test(entry.content))
        )?.id
    : undefined;

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(24rem,36rem)]">
      <div className="min-w-0 space-y-4">
        {message && <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">{message}</p>}
        {!plan.locality && (
          <p className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-900">
            Dopisz okolicę zamieszkania w ustawieniach. Bez niej asystent nie zaproponuje lokalnych zajęć w terenie.
          </p>
        )}

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Lekcje główne</h2>
              <p className="text-sm text-slate-500">
                To lista przedmiotów. „Nowy przedmiot” dopisuje kolejny. Na kalendarz wchodzi przez przeciągnięcie.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy}
                className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700"
                onClick={() =>
                  run(async () => {
                    const response = await fetch("/api/plan/english", { method: "POST" });
                    const data = await response.json();
                    if (!response.ok) throw new Error(data.message);
                    setMessage(
                      "English jest jednym przedmiotem. Lekcje wejdą do kalendarza przy planowaniu miesiąca, na zmianę z polskim i matematyką."
                    );
                  })
                }
              >
                Dodaj English
              </button>
              <button
                type="button"
                className="rounded-full bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white"
                onClick={() => {
                  setAddingKind("main");
                  setDraft({ ...emptyDraft, subject: "English", status: "accepted" });
                }}
              >
                Nowy przedmiot
              </button>
            </div>
          </div>
          {addingKind === "main" && (
            <ItemForm
              draft={draft}
              setDraft={setDraft}
              onSave={() => saveNew("main")}
              onCancel={() => setAddingKind(null)}
            />
          )}
          <ItemRows
            items={mainItems}
            busy={busy}
            openGuideId={openGuideId}
            editingId={editingId}
            draft={draft}
            setDraft={setDraft}
            onToggleGuide={setOpenGuideId}
            onEdit={(item) => {
              setEditingId(item.id);
              setDraft(draftFromItem(item));
            }}
            onCancelEdit={() => setEditingId(null)}
            onSave={saveEdit}
            onDelete={(id) =>
              run(async () => {
                await fetch(`/api/plan/items/${id}`, { method: "DELETE" });
              })
            }
            onAccept={(item) =>
              run(async () => {
                await fetch(`/api/plan/items/${item.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    ...draftFromItem(item),
                    durationMinutes: item.durationMinutes,
                    status: "accepted",
                  }),
                });
              })
            }
          />
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-slate-900">Zajęcia dodatkowe</h2>
            <button
              type="button"
              className="rounded-full bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white"
              onClick={() => {
                setAddingKind("extra");
                setDraft({ ...emptyDraft, status: "proposed" });
              }}
            >
              Dodaj
            </button>
          </div>
          {addingKind === "extra" && (
            <ItemForm
              draft={draft}
              setDraft={setDraft}
              onSave={() => saveNew("extra")}
              onCancel={() => setAddingKind(null)}
              allowStatus
            />
          )}
          <ItemRows
            items={extraItems}
            busy={busy}
            openGuideId={openGuideId}
            editingId={editingId}
            draft={draft}
            setDraft={setDraft}
            onToggleGuide={setOpenGuideId}
            onEdit={(item) => {
              setEditingId(item.id);
              setDraft(draftFromItem(item));
            }}
            onCancelEdit={() => setEditingId(null)}
            onSave={saveEdit}
            onDelete={(id) =>
              run(async () => {
                await fetch(`/api/plan/items/${id}`, { method: "DELETE" });
              })
            }
            onAccept={(item) =>
              run(async () => {
                await fetch(`/api/plan/items/${item.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    ...draftFromItem(item),
                    durationMinutes: item.durationMinutes,
                    status: "accepted",
                  }),
                });
              })
            }
          />
        </section>

        <section className="min-w-0 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-slate-900">Kalendarz miesiąca</h2>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <button
                type="button"
                disabled={busy}
                className="rounded-full border border-rose-200 px-3 py-1 font-semibold text-rose-700 disabled:opacity-60"
                onClick={() => {
                  const title = monthTitle(month);
                  const warning =
                    plan.proposal?.month === month
                      ? `Zdjąć zajęcia i przerwy z ${title} oraz odrzucić propozycję tego miesiąca? Inne miesiące zostaną.`
                      : `Zdjąć zajęcia i przerwy z ${title}? Inne miesiące zostaną.`;
                  if (!window.confirm(warning)) return;
                  void run(async () => {
                    const response = await fetch(`/api/plan/blocks?month=${month}`, { method: "DELETE" });
                    const data = await response.json();
                    if (!response.ok) throw new Error(data.message);
                    setMessage(`${title} jest pusty. Inne miesiące zostały.`);
                  });
                }}
              >
                Wyczyść kalendarz
              </button>
              <button
                type="button"
                disabled={busy}
                aria-pressed={paging === "prev"}
                className={`rounded-full border px-3 py-2 font-semibold active:bg-slate-900 active:text-white disabled:opacity-60 ${paging === "prev" ? "border-slate-900 bg-slate-900 text-white" : "bg-white text-slate-800"}`}
                onClick={() => openMonth(-1)}
              >
                Poprzedni
              </button>
              <span className="min-w-40 text-center text-base font-semibold capitalize text-slate-900">
                {monthTitle(month)}
              </span>
              <button
                type="button"
                disabled={busy}
                aria-pressed={paging === "next"}
                className={`rounded-full border px-3 py-2 font-semibold active:bg-slate-900 active:text-white disabled:opacity-60 ${paging === "next" ? "border-slate-900 bg-slate-900 text-white" : "bg-white text-slate-800"}`}
                onClick={() => openMonth(1)}
              >
                Następny
              </button>
            </div>
          </div>
          <p className="mb-3 text-sm text-slate-500">
            Przeciągnij przedmiot na dzień. Zostaje na liście, więc ten sam można wstawić wiele razy.
          </p>
          {drop && (
            <form
              className="mb-3 flex flex-wrap items-end gap-2 rounded-2xl bg-blue-50 p-3"
              onSubmit={(event) => {
                event.preventDefault();
                void placeDropped();
              }}
            >
              <p className="w-full text-sm font-semibold text-slate-800">
                {plan.items.find((item) => item.id === drop.itemId)?.title ?? "Przedmiot"} · {dayLabel(drop.dayKey)}
              </p>
              {message && <p className="w-full text-sm text-rose-700">{message}</p>}
              <label className="text-sm font-semibold text-slate-700">
                Godzina startu
                <input
                  type="time"
                  value={drop.time}
                  onChange={(event) => setDrop({ ...drop, time: event.target.value })}
                  className="ml-2 rounded-xl border border-slate-200 px-2 py-1"
                />
              </label>
              <button
                type="submit"
                disabled={busy}
                className="rounded-full bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white"
              >
                Połóż na kalendarzu
              </button>
              <button type="button" className="text-sm text-slate-500" onClick={() => setDrop(null)}>
                Anuluj
              </button>
            </form>
          )}
          <div className="overflow-x-auto overscroll-x-contain pb-2">
            <div className="w-max">
              <div className="grid grid-cols-[repeat(7,14rem)] gap-2 text-center text-xs font-semibold text-slate-400">
                {["pon.", "wt.", "śr.", "czw.", "pt.", "sob.", "niedz."].map((label) => (
                  <div key={label}>{label}</div>
                ))}
              </div>
              <div className="mt-1 grid grid-cols-[repeat(7,14rem)] gap-2">
                {cells.map((day, index) => {
                  const dayBlocks = day ? plan.blocks.filter((block) => blockDayKey(block) === localDay(day)) : [];
                  return (
                    <div
                      key={day ? localDay(day) : `empty-${index}`}
                      className={`min-h-36 rounded-xl border p-2 text-left ${day ? "border-slate-200 bg-slate-50" : "border-transparent"}`}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.preventDefault();
                        if (!day) return;
                        const itemId = event.dataTransfer.getData("text/plain");
                        const item = plan.items.find((row) => row.id === itemId && row.status === "accepted");
                        if (!item) {
                          setMessage("Na kalendarz można położyć tylko zaakceptowaną pozycję.");
                          return;
                        }
                        const start = firstFreeStart(day, item.durationMinutes, plan.blocks, new Date());
                        if (!start) {
                          setDrop(null);
                          setMessage(
                            `${dayLabel(localDay(day))} już minął. Upuść przedmiot na dzisiejszy albo późniejszy dzień.`
                          );
                          return;
                        }
                        const startDate = new Date(start);
                        const time = `${String(startDate.getHours()).padStart(2, "0")}:${String(startDate.getMinutes()).padStart(2, "0")}`;
                        setDrop({ itemId, dayKey: localDay(day), time });
                        setMessage(null);
                      }}
                    >
                      {day && <p className="text-xs font-semibold text-slate-500">{day.getDate()}</p>}
                      {dayBlocks.map((block) => {
                        const item = plan.items.find((row) => row.id === block.curriculumItemId);
                        return (
                          <div
                            key={block.id}
                            className="mt-1 rounded-lg bg-white px-2 py-1 text-xs leading-snug text-slate-700"
                          >
                            <p className="font-semibold">
                              {clock(block.startsAt)}{" "}
                              {block.kind === "break" ? "Przerwa" : (block.title ?? item?.title)}
                            </p>
                            {item?.parentGuide && <p className="line-clamp-2 text-slate-500">{item.parentGuide}</p>}
                            {block.kind === "lesson" && (
                              <button
                                type="button"
                                className="text-rose-600"
                                onClick={() =>
                                  run(async () => {
                                    await fetch(`/api/plan/blocks/${block.id}`, { method: "DELETE" });
                                  })
                                }
                              >
                                Zdejmij
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </div>

      <aside className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm xl:sticky xl:top-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Asystent</h2>
            <p className="mt-1 text-sm text-slate-500">
              Zmiany asystenta są najpierw w tej rozmowie. Na kalendarz wchodzą po zatwierdzeniu.
            </p>
          </div>
          <button
            type="button"
            disabled={busy || (plan.messages.length === 0 && !plan.proposal)}
            className="shrink-0 rounded-full border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700 disabled:opacity-60"
            onClick={() => {
              if (
                !window.confirm(
                  "Wyczyścić rozmowę z asystentem? Kalendarz i lista przedmiotów zostaną. Oczekująca propozycja przepadnie."
                )
              ) {
                return;
              }
              void run(async () => {
                const response = await fetch("/api/planner/messages", { method: "DELETE" });
                const data = await response.json();
                if (!response.ok) throw new Error(data.message);
                setChatText("");
                setMessage("Rozmowa wyczyszczona.");
              });
            }}
          >
            Wyczyść rozmowę
          </button>
        </div>

        <div className="mt-3 flex max-h-[50vh] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="relative min-h-0">
            <div
              ref={transcriptRef}
              className="max-h-[calc(50vh-9.5rem)] min-h-28 space-y-3 overflow-y-auto px-3 pb-3 pt-16"
            >
              {plan.proposal ? (
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-3">
                  <p className="text-sm font-semibold text-indigo-950">Propozycja do dyskusji</p>
                  <p className="mt-1 text-sm text-indigo-900">{plan.proposal.summary}</p>
                  <ProposalLines
                    title="Do dodania na kalendarz"
                    blocks={proposalChanges.additions}
                    items={plan.items}
                    actionLabel="Zdejmij"
                    busy={busy}
                    onAction={(block) =>
                      run(async () => {
                        if (!plan.proposal) return;
                        const response = await fetch(`/api/planner/proposals/${plan.proposal.id}`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            action: "remove",
                            startsAt: block.startsAt,
                            endsAt: block.endsAt,
                            kind: block.kind,
                          }),
                        });
                        const data = await response.json();
                        if (!response.ok) setMessage(data.message ?? "Nie udało się zdjąć zajęć z propozycji.");
                      })
                    }
                  />
                  <ProposalLines title="Do zdjęcia z kalendarza" blocks={proposalChanges.removals} items={plan.items} />
                  <p className="mt-2 text-sm text-indigo-800">
                    Kalendarz się nie zmienia, dopóki nie zatwierdzisz. Możesz też napisać, co poprawić.
                  </p>
                </div>
              ) : null}
              {plan.messages.length === 0 && (
                <p className="rounded-2xl bg-slate-50 px-3 py-3 text-sm text-slate-500">
                  Poprzednie wiadomości zostają w tym oknie. Napisz, co ułożyć, albo dopytaj o propozycję.
                </p>
              )}
              {plan.messages.map((entry) => (
                <div key={entry.id} className={entry.role === "user" ? "ml-8" : "mr-8"}>
                  <p className="mb-1 text-xs font-semibold text-slate-500">
                    {entry.role === "user" ? "Ty" : "Asystent"}
                  </p>
                  <p
                    className={`whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${entry.role === "user" ? "bg-slate-100 text-slate-800" : "bg-indigo-50 text-indigo-950"}`}
                  >
                    {entry.content}
                  </p>
                  {entry.role === "assistant" && entry.content.includes("Zaznacz, które ułożyć") ? (
                    <div className="mt-2 flex flex-col gap-1">
                      {menuChoices(entry.content).map((choice) => (
                        <button
                          key={choice.title}
                          type="button"
                          disabled={busy}
                          className="min-h-11 rounded-xl border border-indigo-200 bg-white px-3 py-2 text-left text-sm font-semibold text-indigo-950"
                          onClick={() =>
                            askAgent(async () => {
                              const response = await fetch("/api/planner/messages", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ text: `Wybieram: ${choice.title}`, month }),
                              });
                              const data = await response.json();
                              if (!response.ok) setMessage(data.message ?? "Nie udało się wybrać zajęć.");
                            })
                          }
                        >
                          {choice.title}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {plan.proposal && entry.id === confirmMessageId ? (
                    <div className="mt-2">
                      <DecisionButtons
                        busy={busy}
                        onAccept={() => {
                          if (plan.proposal) decide(plan.proposal.id, "accept");
                        }}
                        onReject={() => {
                          if (plan.proposal) decide(plan.proposal.id, "reject");
                        }}
                      />
                    </div>
                  ) : null}
                </div>
              ))}
              {thinking && (
                <div className="mr-8" role="status" aria-live="polite">
                  <p className="mb-1 text-xs font-semibold text-slate-500">Asystent</p>
                  <p className="inline-flex items-center gap-2 rounded-2xl bg-indigo-50 px-3 py-2 text-sm text-indigo-950">
                    <span
                      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-700"
                      aria-hidden="true"
                    />
                    Myślę…
                  </p>
                </div>
              )}
            </div>
            <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white from-0% via-white/75 via-40% to-transparent" />
          </div>
          <form
            className="shrink-0 space-y-2 border-t border-slate-100 p-3"
            onSubmit={(event) => {
              event.preventDefault();
              askAgent(async () => {
                const response = await fetch("/api/planner/messages", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ text: chatText, month }),
                });
                const data = await response.json();
                if (!response.ok) {
                  setMessage(data.message ?? "Asystent nie odpowiedział.");
                  return;
                }
                setChatText("");
              });
            }}
          >
            <label className="block text-sm font-semibold text-slate-700" htmlFor="planner-chat">
              Wiadomość
            </label>
            <textarea
              id="planner-chat"
              value={chatText}
              onChange={(event) => setChatText(event.target.value)}
              rows={2}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="Na przykład: informatykę przesuń na 11:00 albo zostaw tylko matematykę rano."
            />
            <button
              type="submit"
              disabled={busy || !chatText.trim()}
              className="rounded-full bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white"
            >
              Wyślij
            </button>
          </form>
        </div>
        <div className="mt-3 flex flex-col gap-2">
          <button
            type="button"
            disabled={busy}
            className="rounded-2xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
            onClick={() =>
              askAgent(async () => {
                const response = await fetch("/api/planner/jobs", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ job: "month", month }),
                });
                const data = await response.json();
                if (!response.ok) setMessage(data.message ?? "Nie udało się ułożyć miesiąca.");
              })
            }
          >
            Zaplanuj kalendarz na miesiąc
          </button>
          <button
            type="button"
            disabled={busy}
            className="rounded-2xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
            onClick={() =>
              askAgent(async () => {
                const response = await fetch("/api/planner/jobs", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ job: "extras", month }),
                });
                const data = await response.json();
                if (!response.ok) setMessage(data.message ?? "Nie udało się zaproponować zajęć.");
              })
            }
          >
            Zaproponuj zajęcia dodatkowe
          </button>
        </div>
      </aside>
    </div>
  );

  function decide(proposalId: string, action: "accept" | "reject") {
    void run(async () => {
      const response = await fetch(`/api/planner/proposals/${proposalId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await response.json();
      if (!response.ok) setMessage(data.message ?? "Nie udało się zamknąć propozycji.");
    });
  }
}

function DecisionButtons({ busy, onAccept, onReject }: { busy: boolean; onAccept: () => void; onReject: () => void }) {
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={busy}
        className="min-h-12 w-full rounded-2xl bg-blue-600 px-4 py-3 text-base font-semibold text-white disabled:opacity-60"
        onClick={onAccept}
      >
        Zatwierdź
      </button>
      <button
        type="button"
        disabled={busy}
        className="min-h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base font-semibold text-slate-800 disabled:opacity-60"
        onClick={onReject}
      >
        Odrzuć
      </button>
    </div>
  );
}

function proposalDiff(plan: LessonPlanSnapshot): { additions: ScheduleBlock[]; removals: ScheduleBlock[] } {
  const preview = previewProposal(plan);
  if (!preview) return { additions: [], removals: [] };
  const savedIds = new Set(plan.blocks.map((block) => block.id));
  const previewIds = new Set(preview.blocks.map((block) => block.id));
  const lessons = (blocks: ScheduleBlock[]) =>
    blocks
      .filter((block) => block.kind === "lesson")
      .sort((left, right) => left.startsAt.localeCompare(right.startsAt));
  return {
    additions: lessons(preview.blocks.filter((block) => !savedIds.has(block.id))),
    removals: lessons(plan.blocks.filter((block) => !previewIds.has(block.id))),
  };
}

function ProposalLines({
  title,
  blocks,
  items,
  actionLabel,
  busy = false,
  onAction,
}: {
  title: string;
  blocks: ScheduleBlock[];
  items: LessonPlanSnapshot["items"];
  actionLabel?: string;
  busy?: boolean;
  onAction?: (block: ScheduleBlock) => void;
}) {
  if (blocks.length === 0) return null;
  return (
    <div className="mt-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-800">{title}</p>
      <ul className="mt-1 space-y-1">
        {blocks.map((block) => {
          const item = items.find((row) => row.id === block.curriculumItemId);
          return (
            <li
              key={`${block.startsAt}-${block.endsAt}-${block.title ?? item?.title ?? ""}`}
              className="flex items-center justify-between gap-2 rounded-xl bg-white px-2 py-1 text-sm text-slate-800"
            >
              <span>
                {dayLabel(blockDayKey(block))} · {clock(block.startsAt)} {block.title ?? item?.title ?? "Zajęcia"}
              </span>
              {actionLabel && onAction ? (
                <button
                  type="button"
                  disabled={busy}
                  className="shrink-0 text-rose-600"
                  onClick={() => onAction(block)}
                >
                  {actionLabel}
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function previewProposal(plan: LessonPlanSnapshot): { blocks: ScheduleBlock[] } | null {
  if (!plan.proposal) return null;
  const result = applyOperations({ items: plan.items, blocks: plan.blocks }, plan.proposal.operations, new Date());
  if ("error" in result) return null;
  return result.state;
}

function draftFromItem(item: CurriculumItem): ItemDraft {
  return {
    title: item.title,
    subject: item.subject,
    durationMinutes: String(item.durationMinutes),
    parentGuide: item.parentGuide,
    status: item.status,
  };
}

function ItemForm({
  draft,
  setDraft,
  onSave,
  onCancel,
  allowStatus = false,
}: {
  draft: ItemDraft;
  setDraft: (draft: ItemDraft) => void;
  onSave: () => void;
  onCancel: () => void;
  allowStatus?: boolean;
}) {
  return (
    <div className="mb-3 grid gap-2 rounded-2xl bg-slate-50 p-3 sm:grid-cols-2">
      <label className="text-sm">
        Tytuł
        <input
          value={draft.title}
          onChange={(event) => setDraft({ ...draft, title: event.target.value })}
          className="mt-1 w-full rounded-xl border px-2 py-1"
        />
      </label>
      <label className="text-sm">
        Przedmiot
        <input
          value={draft.subject}
          onChange={(event) => setDraft({ ...draft, subject: event.target.value })}
          className="mt-1 w-full rounded-xl border px-2 py-1"
        />
      </label>
      <label className="text-sm">
        Minuty
        <input
          value={draft.durationMinutes}
          onChange={(event) => setDraft({ ...draft, durationMinutes: event.target.value })}
          className="mt-1 w-full rounded-xl border px-2 py-1"
        />
      </label>
      {allowStatus && (
        <label className="text-sm">
          Status
          <select
            value={draft.status}
            onChange={(event) =>
              setDraft({ ...draft, status: event.target.value === "accepted" ? "accepted" : "proposed" })
            }
            className="mt-1 w-full rounded-xl border px-2 py-1"
          >
            <option value="proposed">Propozycja</option>
            <option value="accepted">Zaakceptowane</option>
          </select>
        </label>
      )}
      <label className="text-sm sm:col-span-2">
        Opis dla rodzica
        <textarea
          value={draft.parentGuide}
          onChange={(event) => setDraft({ ...draft, parentGuide: event.target.value })}
          rows={3}
          className="mt-1 w-full rounded-xl border px-2 py-1"
        />
      </label>
      <div className="flex gap-2">
        <button
          type="button"
          className="rounded-full bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white"
          onClick={onSave}
        >
          Zapisz
        </button>
        <button type="button" className="text-sm text-slate-500" onClick={onCancel}>
          Anuluj
        </button>
      </div>
    </div>
  );
}

function ItemRows({
  items,
  busy,
  openGuideId,
  editingId,
  draft,
  setDraft,
  onToggleGuide,
  onEdit,
  onCancelEdit,
  onSave,
  onDelete,
  onAccept,
}: {
  items: CurriculumItem[];
  busy: boolean;
  openGuideId: string | null;
  editingId: string | null;
  draft: ItemDraft;
  setDraft: (draft: ItemDraft) => void;
  onToggleGuide: (id: string | null) => void;
  onEdit: (item: CurriculumItem) => void;
  onCancelEdit: () => void;
  onSave: (item: CurriculumItem) => void;
  onDelete: (id: string) => void;
  onAccept: (item: CurriculumItem) => void;
}) {
  if (items.length === 0) return <p className="text-sm text-slate-500">Lista jest pusta.</p>;
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.id} className="rounded-2xl border border-slate-200 px-3 py-2">
          {editingId === item.id ? (
            <ItemForm
              draft={draft}
              setDraft={setDraft}
              onSave={() => onSave(item)}
              onCancel={onCancelEdit}
              allowStatus
            />
          ) : (
            <div
              draggable={item.status === "accepted"}
              onDragStart={(event) => event.dataTransfer.setData("text/plain", item.id)}
              className={item.status === "accepted" ? "cursor-grab" : undefined}
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-slate-900">{item.title}</p>
                <span className="text-xs text-slate-500">
                  {item.subject} · {item.durationMinutes} min ·{" "}
                  {item.status === "accepted" ? "zaakceptowane" : "propozycja"}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap gap-2 text-sm">
                <button type="button" onClick={() => onToggleGuide(openGuideId === item.id ? null : item.id)}>
                  Opis
                </button>
                <button type="button" onClick={() => onEdit(item)}>
                  Edytuj
                </button>
                <button type="button" disabled={busy} onClick={() => onDelete(item.id)}>
                  Usuń
                </button>
                {item.status === "proposed" && (
                  <button
                    type="button"
                    disabled={busy}
                    className="font-semibold text-emerald-700"
                    onClick={() => onAccept(item)}
                  >
                    Akceptuj
                  </button>
                )}
              </div>
              {openGuideId === item.id && (
                <p className="mt-2 text-sm text-slate-600">{item.parentGuide || "Brak opisu."}</p>
              )}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

function monthCells(month: string): (Date | null)[] {
  const [yearText, monthText] = month.split("-");
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  const first = new Date(year, monthIndex, 1, 12);
  const pad = (first.getDay() + 6) % 7;
  const count = new Date(year, monthIndex + 1, 0).getDate();
  const cells: (Date | null)[] = Array.from({ length: pad }, () => null);
  for (let day = 1; day <= count; day += 1) cells.push(new Date(year, monthIndex, day, 12));
  return cells;
}

function dateFromDayAndTime(dayKey: string, time: string): Date | null {
  const [yearText, monthText, dayText] = dayKey.split("-");
  const [hourText, minuteText] = time.split(":");
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if ([year, monthIndex, day, hour, minute].some((part) => Number.isNaN(part))) return null;
  return new Date(year, monthIndex, day, hour, minute, 0, 0);
}

function dayLabel(dayKey: string): string {
  const date = dateFromDayAndTime(dayKey, "12:00");
  if (!date) return dayKey;
  return date.toLocaleDateString("pl-PL", { weekday: "long", day: "numeric", month: "long" });
}

function localDay(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function blockDayKey(block: ScheduleBlock): string {
  const date = new Date(block.startsAt);
  return localDay(date);
}

function clock(iso: string): string {
  const date = new Date(iso);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function addMonths(month: string, delta: number): string {
  const [yearText, monthText] = month.split("-");
  const cursor = new Date(Number(yearText), Number(monthText) - 1 + delta, 1);
  return monthKey(cursor);
}

function monthTitle(month: string): string {
  const [yearText, monthText] = month.split("-");
  return new Date(Number(yearText), Number(monthText) - 1, 1).toLocaleDateString("pl-PL", {
    month: "long",
    year: "numeric",
  });
}
