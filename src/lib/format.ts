import { DateTime } from "luxon";

const LOCALE = "en-AU";

/** "$95.00", or "$95" when there are no cents. */
export function money(cents: number): string {
  const dollars = cents / 100;
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: Number.isInteger(dollars) ? 0 : 2,
  }).format(dollars);
}

const at = (iso: string, zone: string) =>
  DateTime.fromISO(iso, { zone }).setLocale(LOCALE);

/** "9:30 am" in the business's time zone. */
export function time(iso: string, zone: string): string {
  return at(iso, zone).toFormat("h:mm a").toLowerCase();
}

/** "Tue 24 Nov" */
export function shortDate(iso: string, zone: string): string {
  return at(iso, zone).toFormat("ccc d LLL");
}

/** "Today", "Tomorrow", or "Tuesday 24 November". */
export function dayHeading(
  iso: string,
  zone: string,
  now: Date = new Date(),
): string {
  const day = at(iso, zone).startOf("day");
  const today = DateTime.fromJSDate(now, { zone }).startOf("day");
  const diff = Math.round(day.diff(today, "days").days);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return day.setLocale(LOCALE).toFormat("cccc d LLLL");
}

export function duration(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

/** The start and end of a local day, as ISO strings the API accepts. */
export function dayRange(
  zone: string,
  from: Date = new Date(),
  offsetDays = 0,
) {
  const start = DateTime.fromJSDate(from, { zone })
    .startOf("day")
    .plus({ days: offsetDays });
  return {
    from: start.toUTC().toISO() ?? "",
    to: start.plus({ days: 1 }).toUTC().toISO() ?? "",
    date: start.toFormat("yyyy-MM-dd"),
  };
}

export function localDate(iso: string, zone: string): string {
  return at(iso, zone).toFormat("yyyy-MM-dd");
}

export function totalDuration(
  services: readonly { durationMin: number }[],
): number {
  return services.reduce((sum, s) => sum + s.durationMin, 0);
}
