import { addDays, dayKey, fmtTime, localIso, parseLocal, startOfDay, weekdayLong } from "./format";

/** Opening hours by weekday (0 = Sunday). null = closed. */
export type Hours = Record<number, readonly [open: string, close: string] | null>;

function at(day: Date, hhmm: string): Date {
  const [h = 0, m = 0] = hhmm.split(":").map(Number);
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m);
}

export function isOpenDay(day: Date, hours: Hours): boolean {
  return Boolean(hours[day.getDay()]);
}

export interface OpenStatus {
  open: boolean;
  label: string;
}

export function openStatus(now: Date, hours: Hours): OpenStatus {
  const today = hours[now.getDay()];
  if (today && now >= at(now, today[0]) && now < at(now, today[1])) {
    return { open: true, label: `Open · closes at ${today[1]}` };
  }
  for (let offset = 0; offset < 8; offset++) {
    const day = addDays(startOfDay(now), offset);
    const span = hours[day.getDay()];
    if (!span) continue;
    const opens = at(day, span[0]);
    if (opens <= now) continue;
    const when = offset === 0 ? "today" : offset === 1 ? "tomorrow" : `on ${weekdayLong(day)}`;
    return { open: false, label: `Closed · opens ${when} at ${span[0]}` };
  }
  return { open: false, label: "Closed" };
}

export function dateStrip(from: Date, count: number): Date[] {
  const first = startOfDay(from);
  return Array.from({ length: count }, (_, i) => addDays(first, i));
}

export interface Slot {
  time: string;
  start: string;
  available: boolean;
}

/**
 * Bookable slots for a day. Past slots (and anything inside the next hour)
 * and slots already taken are marked unavailable; closed days return [].
 */
export function slotsFor(day: Date, hours: Hours, taken: string[], now: Date, stepMinutes = 30, durationMinutes = 30): Slot[] {
  const span = hours[day.getDay()];
  if (!span) return [];
  const open = at(day, span[0]);
  const close = at(day, span[1]);
  const cutoff = new Date(now.getTime() + 60 * 60_000);
  const takenSet = new Set(taken);
  const slots: Slot[] = [];
  for (let t = open; t.getTime() + durationMinutes * 60_000 <= close.getTime(); t = new Date(t.getTime() + stepMinutes * 60_000)) {
    const start = localIso(t);
    slots.push({ time: fmtTime(t), start, available: t >= cutoff && !takenSet.has(start) });
  }
  return slots;
}

/** Adds working days (the studio is closed on days without hours). */
export function addWorkingDays(from: Date, days: number, hours: Hours): Date {
  let date = startOfDay(from);
  let left = days;
  while (left > 0) {
    date = addDays(date, 1);
    if (isOpenDay(date, hours)) left--;
  }
  return date;
}

/** The earliest normal date (full notice) and the earliest late order (next working day). */
export interface ReadyWindow {
  normal: Date;
  earliest: Date;
}

export function readyWindow(from: Date, readyDays: number, hours: Hours): ReadyWindow {
  return {
    normal: addWorkingDays(from, readyDays, hours),
    earliest: addWorkingDays(from, 1, hours),
  };
}

/** ok: full notice. late: less notice, so the late-order fee applies. too-soon: we can't bake it in time. */
export type NeededByFit = "ok" | "late" | "too-soon";

export function neededByFit(day: Date, window: ReadyWindow): NeededByFit {
  const key = dayKey(day);
  if (key >= dayKey(window.normal)) return "ok";
  if (key >= dayKey(window.earliest)) return "late";
  return "too-soon";
}

export function sameDay(a: string | Date, b: string | Date): boolean {
  const toKey = (v: string | Date) => (typeof v === "string" ? dayKey(parseLocal(v)) : dayKey(v));
  return toKey(a) === toKey(b);
}
