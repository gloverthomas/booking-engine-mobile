import { DateTime } from "luxon";
import type { OfferableSlot, WaitlistEntry } from "./api/schemas";
import { dayHeading, shortDate, time } from "./format";
import { formatMinute } from "./roster";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** "25 Nov – 5 Dec", or "25 Nov" for a single day. */
export function dateWindow(earliest: string, latest: string): string {
  const a = DateTime.fromISO(earliest, { zone: "utc" }).setLocale("en-AU");
  const b = DateTime.fromISO(latest, { zone: "utc" }).setLocale("en-AU");
  return earliest === latest
    ? a.toFormat("d LLL")
    : `${a.toFormat("d LLL")} – ${b.toFormat("d LLL")}`;
}

/** What the person is willing to accept, in a sentence fragment: "25 Nov – 5 Dec · Mon, Wed · 9am – 5pm". */
export function windowLabel(
  e: Pick<
    WaitlistEntry,
    "earliestDate" | "latestDate" | "weekdays" | "fromMinute" | "toMinute"
  >,
): string {
  const days =
    e.weekdays && e.weekdays.length > 0 && e.weekdays.length < 7
      ? [...e.weekdays]
          .sort((x, y) => x - y)
          .map((d) => WEEKDAYS[d])
          .join(", ")
      : "Any day";
  const hours =
    e.fromMinute !== null && e.toMinute !== null
      ? `${formatMinute(e.fromMinute)} – ${formatMinute(e.toMinute)}`
      : "Any time";
  return [dateWindow(e.earliestDate, e.latestDate), days, hours].join(" · ");
}

export function entryStatus(e: Pick<WaitlistEntry, "status" | "offers">): {
  label: string;
  tone: "neutral" | "success" | "warning" | "danger" | "info";
} {
  const open = e.offers.filter((o) => o.status === "sent").length;
  switch (e.status) {
    case "waiting":
      return { label: "Waiting", tone: "info" };
    case "offered":
      return {
        label: open > 1 ? `${open} offers out` : "Offer sent",
        tone: "warning",
      };
    case "booked":
      return { label: "Booked", tone: "success" };
    case "expired":
      return { label: "Expired", tone: "neutral" };
    case "cancelled":
      return { label: "Removed", tone: "neutral" };
  }
}

export interface SlotGroup {
  date: string;
  heading: string;
  slots: OfferableSlot[];
}

/** Open times grouped by local day, soonest first, for a list a person can scan. */
export function groupSlotsByDay(
  slots: readonly OfferableSlot[],
  zone: string,
  now: Date = new Date(),
): SlotGroup[] {
  const groups = new Map<string, SlotGroup>();
  for (const s of [...slots].sort((a, b) => a.start.localeCompare(b.start))) {
    const date = DateTime.fromISO(s.start, { zone }).toFormat("yyyy-MM-dd");
    const group = groups.get(date) ?? {
      date,
      heading: `${dayHeading(s.start, zone, now)}, ${shortDate(s.start, zone)}`,
      slots: [],
    };
    group.slots.push(s);
    groups.set(date, group);
  }
  return [...groups.values()];
}

export const slotLabel = (
  s: OfferableSlot,
  zone: string,
  showStylist: boolean,
) =>
  showStylist ? `${time(s.start, zone)} · ${s.staffName}` : time(s.start, zone);
