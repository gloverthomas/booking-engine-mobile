import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

/** Query keys in one place, so a mutation can invalidate exactly what it changed. */
export const keys = {
  calendar: (from: string) => ["calendar", from] as const,
  allCalendar: ["calendar"] as const,
  booking: (id: string) => ["booking", id] as const,
  resources: ["resources"] as const,
  clock: ["clock"] as const,
  waitlist: (view: string) => ["waitlist", view] as const,
  allWaitlist: ["waitlist"] as const,
  waitlistSlots: (id: string) => ["waitlist-slots", id] as const,
  allRoster: ["roster"] as const,
  rosterExceptions: (from: string) => ["roster-exceptions", from] as const,
  myWeek: (week: string | undefined) => ["my-week", week ?? "this"] as const,
  roster: (week: string | undefined) => ["roster", week ?? "this"] as const,
  clients: (q: string) => ["clients", q] as const,
  client: (id: string) => ["client", id] as const,
  availability: (key: string) => ["availability", key] as const,
};

export const useResources = () =>
  useQuery({
    queryKey: keys.resources,
    queryFn: api.resources,
    staleTime: 5 * 60_000,
  });

export const useBooking = (id: string) =>
  useQuery({ queryKey: keys.booking(id), queryFn: () => api.booking(id) });
