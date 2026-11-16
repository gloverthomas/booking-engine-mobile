import { formatElapsed } from "./roster";

/** "+1 hr 5 min" / "-30 min" / "on time" for worked minus rostered. Null while the day is unfinished. */
export function differenceLabel(minutes: number | null): string | null {
  if (minutes === null) return null;
  if (minutes === 0) return "on time";
  return `${minutes > 0 ? "+" : "-"}${formatElapsed(Math.abs(minutes))}`;
}

export const hoursLabel = (minutes: number): string =>
  minutes === 0 ? "0 min" : formatElapsed(minutes);

export function entryStatusLabel(
  status: "open" | "pending" | "approved",
): string {
  return status === "open"
    ? "In progress"
    : status === "pending"
      ? "Awaiting approval"
      : "Approved";
}
