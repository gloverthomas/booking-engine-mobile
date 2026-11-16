import { DateTime } from "luxon";
import { dayHeading, shortDate, time } from "./format";

/** Two ISO timestamps for the same instant, whatever their spelling (Z, +00:00, milliseconds). */
export function isSameInstant(a: string, b: string): boolean {
  return Date.parse(a) === Date.parse(b);
}

/** Picking the time it is already at is not a move. */
export function isMove(
  currentStart: string,
  chosenStart: string | null,
): boolean {
  return chosenStart !== null && !isSameInstant(currentStart, chosenStart);
}

/** "Move to Tomorrow, Wed 25 Nov at 2:30 pm" */
export function moveLabel(
  start: string,
  zone: string,
  now: Date = new Date(),
): string {
  return `Move to ${dayHeading(start, zone, now)}, ${shortDate(start, zone)} at ${time(start, zone)}`;
}

/** The first date the day strip should open on: the appointment's own day when it is within the strip. */
export function initialDay(
  appointmentDate: string,
  days: readonly { date: string }[],
): string {
  return days.some((d) => d.date === appointmentDate)
    ? appointmentDate
    : (days[0]?.date ?? appointmentDate);
}

export interface ManualTime {
  /** UTC instant, ready to send. */
  start: string;
  /** "6:15 am" in the business's time zone. */
  label: string;
}

/**
 * Every `stepMin` minutes of a local day between two clock times, for choosing a time that is not on the
 * roster. Built from wall-clock times, so a daylight saving change neither repeats nor invents a time.
 */
export function manualTimes(
  date: string,
  zone: string,
  options: { fromMinute?: number; toMinute?: number; stepMin?: number } = {},
): ManualTime[] {
  const { fromMinute = 6 * 60, toMinute = 22 * 60, stepMin = 15 } = options;
  const day = DateTime.fromISO(date, { zone }).startOf("day");
  const out: ManualTime[] = [];
  for (let minute = fromMinute; minute < toMinute; minute += stepMin) {
    const hour = Math.floor(minute / 60);
    const min = minute % 60;
    const at = day.set({ hour, minute: min });
    // A time skipped by the clocks going forward is moved to the next valid one: drop it.
    if (at.hour !== hour || at.minute !== min) continue;
    const iso = at.toUTC().toISO();
    if (iso) out.push({ start: iso, label: time(iso, zone) });
  }
  return out;
}
