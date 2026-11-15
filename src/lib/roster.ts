import { DateTime } from "luxon";
import type { MinuteRange, RosterDay } from "./api/schemas";

/** Local minutes since midnight as a compact time: 540 -> "9am", 570 -> "9:30am", 1020 -> "5pm". */
export function formatMinute(minute: number): string {
  if (minute >= 1440) return "12am";
  const hour24 = Math.floor(minute / 60);
  const mins = minute % 60;
  const suffix = hour24 >= 12 ? "pm" : "am";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return mins === 0
    ? `${hour12}${suffix}`
    : `${hour12}:${String(mins).padStart(2, "0")}${suffix}`;
}

export const formatRange = (r: MinuteRange) =>
  `${formatMinute(r.startMinute)} – ${formatMinute(r.endMinute)}`;

export interface DayLine {
  text: string;
  /** Where, when they work in more than one place or it differs from the weekly pattern. */
  detail: string | null;
  working: boolean;
}

/** One line for a day: "9am – 5pm", "Day off", or "Not working". */
export function describeDay(day: RosterDay, showLocation: boolean): DayLine {
  if (day.off) {
    const note = day.off.note?.trim();
    return {
      text: "Day off",
      detail:
        note ||
        (day.off.everywhere ? null : day.off.locationNames.join(", ") || null),
      working: false,
    };
  }
  if (day.entries.length === 0)
    return { text: "Not working", detail: null, working: false };
  const text = day.entries.flatMap((e) => e.ranges.map(formatRange)).join(", ");
  const places = [...new Set(day.entries.map((e) => e.locationName))];
  const custom = day.entries.some((e) => e.kind === "custom");
  const detail = [
    showLocation ? places.join(", ") : null,
    custom ? "changed hours" : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return { text, detail: detail || null, working: true };
}

/** "Mon 2" */
export function dayName(date: string): string {
  return DateTime.fromISO(date, { zone: "utc" })
    .setLocale("en-AU")
    .toFormat("ccc d");
}

/** "2 – 8 Nov", or "30 Nov – 6 Dec" across a month. */
export function weekLabel(weekStart: string): string {
  const start = DateTime.fromISO(weekStart, { zone: "utc" }).setLocale("en-AU");
  const end = start.plus({ days: 6 });
  return start.month === end.month
    ? `${start.day} – ${end.toFormat("d LLL")}`
    : `${start.toFormat("d LLL")} – ${end.toFormat("d LLL")}`;
}

/** Any date in the target week, `weeks` weeks from `weekStart`. */
export function shiftWeek(weekStart: string, weeks: number): string {
  return (
    DateTime.fromISO(weekStart, { zone: "utc" }).plus({ weeks }).toISODate() ??
    weekStart
  );
}

/**
 * How long a shift has run. The server's clock is the reference: the offset between it and the phone at
 * the moment the state was fetched is applied, so a phone with the wrong time still shows the right length.
 */
export function elapsedMinutes(input: {
  since: string;
  serverNow: string;
  fetchedAtMs: number;
  nowMs: number;
}): number {
  const serverAtFetch = Date.parse(input.serverNow);
  // `nowMs` can predate the fetch (the ticker last fired before the data arrived): never run the clock backwards.
  const serverNowMs =
    serverAtFetch + Math.max(input.nowMs - input.fetchedAtMs, 0);
  return Math.max(
    Math.floor((serverNowMs - Date.parse(input.since)) / 60_000),
    0,
  );
}

/** "42 min", "2 hr 5 min" */
export function formatElapsed(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}
