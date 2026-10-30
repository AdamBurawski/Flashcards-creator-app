const SLOT_MINUTES = 60;

interface ScheduledTask {
  dayKey: string;
  timeLabel: string;
  endLabel?: string;
  status?: string;
}

export function localDayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function clockMinutes(timeLabel: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(timeLabel.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function formatMinutes(total: number): string {
  const normalized = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/** Same blocks the week calendar draws: each item ends when the next one starts, otherwise after one hour. */
export function withCalendarSlots<T extends ScheduledTask>(items: T[]): (T & { endLabel: string })[] {
  const byDay = new Map<string, T[]>();
  for (const item of items) {
    const day = byDay.get(item.dayKey) ?? [];
    day.push(item);
    byDay.set(item.dayKey, day);
  }

  const slotted: (T & { endLabel: string })[] = [];
  for (const day of byDay.values()) {
    const sorted = [...day].sort((a, b) => a.timeLabel.localeCompare(b.timeLabel));
    sorted.forEach((item, index) => {
      const start = clockMinutes(item.timeLabel);
      const nextStart = clockMinutes(sorted[index + 1]?.timeLabel ?? "");
      const end =
        start === null
          ? item.timeLabel
          : formatMinutes(nextStart !== null && nextStart > start ? nextStart : start + SLOT_MINUTES);
      slotted.push({ ...item, endLabel: end });
    });
  }
  return slotted;
}

/** The calendar block that contains `now`. The same object the week grid renders. */
export function selectCurrentTask<T extends ScheduledTask>(tasks: T[], now: Date): T | null {
  const todayKey = localDayKey(now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const todays = tasks
    .filter((task) => task.dayKey === todayKey && task.status !== "done")
    .sort((a, b) => a.timeLabel.localeCompare(b.timeLabel));

  for (const task of todays) {
    const start = clockMinutes(task.timeLabel);
    const end = clockMinutes(task.endLabel ?? "") ?? (start === null ? null : start + SLOT_MINUTES);
    if (start === null || end === null) continue;
    if (nowMinutes >= start && nowMinutes < end) return task;
  }

  return null;
}
