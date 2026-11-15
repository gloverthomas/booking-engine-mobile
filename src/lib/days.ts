import { DateTime } from "luxon";

export interface DayOption {
  /** YYYY-MM-DD in the business time zone. */
  date: string;
  /** "Today", "Tue 24" */
  label: string;
}

/** The next `count` local days, starting today. */
export function upcomingDays(
  zone: string,
  count = 14,
  from: Date = new Date(),
): DayOption[] {
  const start = DateTime.fromJSDate(from, { zone }).startOf("day");
  return Array.from({ length: count }, (_, i) => {
    const day = start.plus({ days: i }).setLocale("en-AU");
    return {
      date: day.toFormat("yyyy-MM-dd"),
      label: i === 0 ? "Today" : day.toFormat("ccc d"),
    };
  });
}
