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
