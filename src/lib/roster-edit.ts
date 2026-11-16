import type { RosterException } from "./api/schemas";
import { formatMinute } from "./roster";

/** A day's exception for a stylist, keyed so the roster can tell at a glance which days were changed. */
export const exceptionKey = (staffId: string, date: string) =>
  `${staffId}|${date}`;

export function indexExceptions(
  list: readonly RosterException[],
): Map<string, RosterException[]> {
  const map = new Map<string, RosterException[]>();
  for (const e of list) {
    const key = exceptionKey(e.staffId, e.date);
    map.set(key, [...(map.get(key) ?? []), e]);
  }
  return map;
}

export interface HourOption {
  minute: number;
  label: string;
}

/** Start and end choices for changed hours: every `stepMin` minutes, 5am to 11pm by default. */
export function hourOptions(
  stepMin = 30,
  fromMinute = 5 * 60,
  toMinute = 23 * 60,
): HourOption[] {
  const out: HourOption[] = [];
  for (let minute = fromMinute; minute <= toMinute; minute += stepMin) {
    out.push({ minute, label: formatMinute(minute) });
  }
  return out;
}

/** A sentence to show instead of sending a range the server would refuse; null when it is fine. */
export function hoursProblem(
  start: number | null,
  end: number | null,
): string | null {
  if (start === null || end === null)
    return "Choose when they start and finish.";
  if (end <= start) return "They must finish after they start.";
  return null;
}

export function describeException(
  e: Pick<
    RosterException,
    "kind" | "startMinute" | "endMinute" | "locationName" | "note"
  >,
): string {
  const place = e.locationName ? ` at ${e.locationName}` : "";
  const note = e.note ? ` (${e.note})` : "";
  if (e.kind === "off")
    return `Day off${e.locationName ? ` at ${e.locationName}` : ""}${note}`;
  const hours =
    e.startMinute !== null && e.endMinute !== null
      ? `${formatMinute(e.startMinute)} – ${formatMinute(e.endMinute)}`
      : "Changed hours";
  return `${hours}${place}${note}`;
}

/** "N appointments are now outside their hours" for the warning after a change; null when none. */
export function conflictWarning(count: number): string | null {
  if (count <= 0) return null;
  return count === 1
    ? "1 existing appointment now falls outside their hours. It has not been moved: check it on Today."
    : `${count} existing appointments now fall outside their hours. They have not been moved: check them on Today.`;
}
