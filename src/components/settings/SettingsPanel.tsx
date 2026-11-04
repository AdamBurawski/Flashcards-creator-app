import { useEffect, useMemo, useState } from "react";
import type { DisplayPerson, SessionContext } from "../../lib/household";
import { avatarLetter } from "../../lib/household";

interface SettingsPanelProps {
  initialContext: SessionContext;
}

type Message = { type: "ok" | "error"; text: string } | null;

async function readJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return { success: false, message: "Niepoprawna odpowiedź serwera." };
  }
}

export default function SettingsPanel({ initialContext }: SettingsPanelProps) {
  const [context, setContext] = useState(initialContext);
  const [message, setMessage] = useState<Message>(null);
  const [busy, setBusy] = useState(false);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(
    initialContext.activeChild?.userId ?? initialContext.children[0]?.userId ?? null
  );

  const selectedChild = useMemo(
    () => context.children.find((child) => child.userId === selectedChildId) ?? null,
    [context.children, selectedChildId]
  );

  const [parentForm, setParentForm] = useState({
    firstName: context.viewer.firstName,
    lastName: context.viewer.lastName,
    displayName: context.viewer.displayName === "Bez imienia" ? "" : context.viewer.displayName,
    phone: context.viewer.phone ?? "",
    locale: context.viewer.locale ?? "pl",
    timezone: context.viewer.timezone ?? "Europe/Warsaw",
  });

  const [childForm, setChildForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    birthDate: "",
    schoolGrade: "",
    parentNote: "",
  });

  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    birthDate: "",
    schoolGrade: "",
    parentNote: "",
    email: "",
    password: "",
  });

  const syncEditForm = (child: DisplayPerson | null) => {
    if (!child) return;
    setEditForm({
      firstName: child.firstName,
      lastName: child.lastName,
      birthDate: child.birthDate ?? "",
      schoolGrade: child.schoolGrade ?? "",
      parentNote: child.parentNote ?? "",
      email: child.email ?? "",
      password: "",
    });
  };

  useEffect(() => {
    syncEditForm(selectedChild);
  }, [selectedChild]);

  const applyContext = (next: SessionContext) => {
    setContext(next);
    if (next.activeChild && !next.children.some((child) => child.userId === selectedChildId)) {
      setSelectedChildId(next.activeChild.userId);
      syncEditForm(next.activeChild);
    }
  };

  const saveParent = async () => {
    setBusy(true);
    setMessage(null);
    const response = await fetch("/api/settings/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parentForm),
    });
    const data = await readJson(response);
    setBusy(false);
    if (!response.ok || !data.success) {
      setMessage({ type: "error", text: data.message ?? "Nie udało się zapisać profilu." });
      return;
    }
    applyContext(data.context);
    setMessage({ type: "ok", text: "Profil rodzica zapisany." });
  };

  const createChild = async () => {
    setBusy(true);
    setMessage(null);
    const response = await fetch("/api/settings/children", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: childForm.firstName,
        lastName: childForm.lastName,
        email: childForm.email,
        password: childForm.password,
        birthDate: childForm.birthDate || null,
        schoolGrade: childForm.schoolGrade || null,
        parentNote: childForm.parentNote || null,
      }),
    });
    const data = await readJson(response);
    setBusy(false);
    if (!response.ok || !data.success) {
      setMessage({ type: "error", text: data.message ?? "Nie udało się dodać dziecka." });
      return;
    }
    applyContext(data.context);
    const newest = data.context.children[data.context.children.length - 1];
    if (newest) {
      setSelectedChildId(newest.userId);
      syncEditForm(newest);
    }
    setChildForm({
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      birthDate: "",
      schoolGrade: "",
      parentNote: "",
    });
    setMessage({ type: "ok", text: "Konto dziecka utworzone. Dziecko może się zalogować swoim mailem." });
  };

  const saveChild = async () => {
    if (!selectedChild) return;
    setBusy(true);
    setMessage(null);
    const payload: Record<string, string | null> = {
      firstName: editForm.firstName,
      lastName: editForm.lastName,
      birthDate: editForm.birthDate || null,
      schoolGrade: editForm.schoolGrade || null,
      parentNote: editForm.parentNote || null,
    };
    if (editForm.email.trim()) payload.email = editForm.email.trim();
    if (editForm.password.trim()) payload.password = editForm.password.trim();

    const response = await fetch(`/api/settings/children/${selectedChild.userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await readJson(response);
    setBusy(false);
    if (!response.ok || !data.success) {
      setMessage({ type: "error", text: data.message ?? "Nie udało się zapisać danych dziecka." });
      return;
    }
    applyContext(data.context);
    setEditForm((prev) => ({ ...prev, password: "" }));
    setMessage({ type: "ok", text: "Dane dziecka zapisane." });
  };

  const setActiveChild = async (childId: string) => {
    setBusy(true);
    setMessage(null);
    const response = await fetch("/api/settings/active-child", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ childId }),
    });
    const data = await readJson(response);
    setBusy(false);
    if (!response.ok || !data.success) {
      setMessage({ type: "error", text: data.message ?? "Nie udało się wybrać dziecka." });
      return;
    }
    applyContext(data.context);
    setMessage({ type: "ok", text: "Panel będzie pokazywał to dziecko." });
  };

  const uploadAvatar = async (targetUserId: string, file: File | null) => {
    if (!file) return;
    setBusy(true);
    setMessage(null);
    const form = new FormData();
    form.append("file", file);
    form.append("targetUserId", targetUserId);
    const response = await fetch("/api/settings/avatar", { method: "POST", body: form });
    const data = await readJson(response);
    setBusy(false);
    if (!response.ok || !data.success) {
      setMessage({ type: "error", text: data.message ?? "Nie udało się wgrać zdjęcia." });
      return;
    }
    applyContext(data.context);
    setMessage({ type: "ok", text: "Zdjęcie zapisane." });
  };

  return (
    <div className="space-y-6">
      {message && (
        <p
          className={`rounded-2xl px-4 py-3 text-sm font-medium ${
            message.type === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"
          }`}
        >
          {message.text}
        </p>
      )}

      <section className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Mój profil</h2>
        <p className="mt-1 text-sm text-slate-500">Email konta: {context.viewer.email ?? "—"}</p>
        <div className="mt-4 flex items-center gap-3">
          <Avatar person={context.viewer} />
          <label className="cursor-pointer rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
            Zmień zdjęcie
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={busy}
              onChange={(event) => uploadAvatar(context.viewer.userId, event.target.files?.[0] ?? null)}
            />
          </label>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field
            label="Imię *"
            value={parentForm.firstName}
            onChange={(value) => setParentForm({ ...parentForm, firstName: value })}
          />
          <Field
            label="Nazwisko *"
            value={parentForm.lastName}
            onChange={(value) => setParentForm({ ...parentForm, lastName: value })}
          />
          <Field
            label="Nazwa wyświetlana"
            value={parentForm.displayName}
            onChange={(value) => setParentForm({ ...parentForm, displayName: value })}
          />
          <Field
            label="Telefon"
            value={parentForm.phone}
            onChange={(value) => setParentForm({ ...parentForm, phone: value })}
          />
          <Field
            label="Język"
            value={parentForm.locale}
            onChange={(value) => setParentForm({ ...parentForm, locale: value })}
          />
          <Field
            label="Strefa czasowa"
            value={parentForm.timezone}
            onChange={(value) => setParentForm({ ...parentForm, timezone: value })}
          />
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={saveParent}
          className="mt-4 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          Zapisz profil
        </button>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Dzieci</h2>
        <p className="mt-1 text-sm text-slate-500">
          Każde dziecko ma własne konto z rolą użytkownika: lekcje i menu, bez edycji planu i ustawień.
        </p>
        {context.children.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500">
            Nie masz jeszcze żadnego dziecka. Dodaj pierwsze poniżej.
          </p>
        ) : (
          <div className="mt-4 space-y-2">
            {context.children.map((child) => (
              <div
                key={child.userId}
                className={`flex flex-wrap items-center gap-3 rounded-2xl border px-3 py-2 ${
                  selectedChildId === child.userId ? "border-blue-300 bg-blue-50/70" : "border-slate-200 bg-white"
                }`}
              >
                <Avatar person={child} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900">{child.displayName}</p>
                  <p className="text-xs text-slate-500">
                    {[child.ageLabel, child.schoolGrade].filter(Boolean).join(" • ") || "Profil dziecka"}
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700"
                  onClick={() => {
                    setSelectedChildId(child.userId);
                    syncEditForm(child);
                  }}
                >
                  Edytuj
                </button>
                <button
                  type="button"
                  disabled={busy || context.activeChild?.userId === child.userId}
                  className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 disabled:opacity-50"
                  onClick={() => setActiveChild(child.userId)}
                >
                  {context.activeChild?.userId === child.userId ? "Aktywne na panelu" : "Pokaż na panelu"}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {selectedChild && (
        <section className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Edycja: {selectedChild.displayName}</h2>
          <div className="mt-4 flex items-center gap-3">
            <Avatar person={selectedChild} />
            <label className="cursor-pointer rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
              Zmień zdjęcie
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={busy}
                onChange={(event) => uploadAvatar(selectedChild.userId, event.target.files?.[0] ?? null)}
              />
            </label>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field
              label="Imię *"
              value={editForm.firstName}
              onChange={(value) => setEditForm({ ...editForm, firstName: value })}
            />
            <Field
              label="Nazwisko *"
              value={editForm.lastName}
              onChange={(value) => setEditForm({ ...editForm, lastName: value })}
            />
            <Field
              label="Data urodzenia"
              type="date"
              value={editForm.birthDate}
              onChange={(value) => setEditForm({ ...editForm, birthDate: value })}
            />
            <Field
              label="Klasa"
              value={editForm.schoolGrade}
              onChange={(value) => setEditForm({ ...editForm, schoolGrade: value })}
            />
            <Field
              label="Nowy email logowania"
              type="email"
              value={editForm.email}
              onChange={(value) => setEditForm({ ...editForm, email: value })}
            />
            <Field
              label="Nowe hasło"
              type="password"
              value={editForm.password}
              onChange={(value) => setEditForm({ ...editForm, password: value })}
            />
            <div className="sm:col-span-2">
              <label
                htmlFor="edit-parent-note"
                className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                Notatka rodzica
              </label>
              <textarea
                id="edit-parent-note"
                className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                rows={3}
                value={editForm.parentNote}
                onChange={(event) => setEditForm({ ...editForm, parentNote: event.target.value })}
              />
            </div>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={saveChild}
            className="mt-4 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            Zapisz dziecko
          </button>
        </section>
      )}

      <section className="rounded-3xl border border-emerald-100 bg-emerald-50/40 p-5 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Dodaj dziecko</h2>
        <p className="mt-1 text-sm text-slate-600">
          Wymagane: imię, nazwisko, email i hasło startowe. Opcjonalnie: data urodzenia, klasa, notatka.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field
            label="Imię *"
            value={childForm.firstName}
            onChange={(value) => setChildForm({ ...childForm, firstName: value })}
          />
          <Field
            label="Nazwisko *"
            value={childForm.lastName}
            onChange={(value) => setChildForm({ ...childForm, lastName: value })}
          />
          <Field
            label="Email logowania *"
            type="email"
            value={childForm.email}
            onChange={(value) => setChildForm({ ...childForm, email: value })}
          />
          <div>
            <Field
              label="Hasło startowe *"
              type="password"
              value={childForm.password}
              onChange={(value) => setChildForm({ ...childForm, password: value })}
            />
            <p className="mt-1 text-xs text-slate-500">Min. 8 znaków, jedna wielka litera i jedna cyfra.</p>
          </div>
          <Field
            label="Data urodzenia"
            type="date"
            value={childForm.birthDate}
            onChange={(value) => setChildForm({ ...childForm, birthDate: value })}
          />
          <Field
            label="Klasa"
            value={childForm.schoolGrade}
            onChange={(value) => setChildForm({ ...childForm, schoolGrade: value })}
          />
          <div className="sm:col-span-2">
            <label
              htmlFor="create-parent-note"
              className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500"
            >
              Notatka rodzica
            </label>
            <textarea
              id="create-parent-note"
              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
              rows={3}
              value={childForm.parentNote}
              onChange={(event) => setChildForm({ ...childForm, parentNote: event.target.value })}
            />
          </div>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={createChild}
          className="mt-4 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          Utwórz konto dziecka
        </button>
      </section>
    </div>
  );
}

function Avatar({ person }: { person: DisplayPerson }) {
  if (person.avatarUrl) {
    return <img src={person.avatarUrl} alt="" className="h-12 w-12 rounded-full object-cover ring-1 ring-slate-200" />;
  }
  return (
    <div className="grid h-12 w-12 place-items-center rounded-full bg-white text-sm font-bold text-slate-600 ring-1 ring-slate-200">
      {avatarLetter(person.displayName)}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
      />
    </label>
  );
}
