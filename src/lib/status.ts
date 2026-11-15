import type { BookingStatus } from "./api/schemas";

export interface StatusStyle {
  label: string;
  tone: "neutral" | "success" | "warning" | "danger" | "info";
}

const STATUS: Record<BookingStatus, StatusStyle> = {
  pending_payment: { label: "Awaiting deposit", tone: "warning" },
  confirmed: { label: "Confirmed", tone: "info" },
  completed: { label: "Completed", tone: "success" },
  cancelled_by_client: { label: "Cancelled by client", tone: "neutral" },
  cancelled_by_staff: { label: "Cancelled", tone: "neutral" },
  late_cancelled: { label: "Late cancel", tone: "danger" },
  no_show: { label: "No-show", tone: "danger" },
  expired: { label: "Expired", tone: "neutral" },
};

export const statusStyle = (status: BookingStatus): StatusStyle =>
  STATUS[status];

/** Statuses that still take up the stylist's time. */
export const LIVE: ReadonlySet<BookingStatus> = new Set([
  "confirmed",
  "pending_payment",
]);
