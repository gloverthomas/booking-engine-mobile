import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

/** Query keys in one place, so a mutation can invalidate exactly what it changed. */
export const keys = {
  calendar: (from: string) => ["calendar", from] as const,
  allCalendar: ["calendar"] as const,
  booking: (id: string) => ["booking", id] as const,
  resources: ["resources"] as const,
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
