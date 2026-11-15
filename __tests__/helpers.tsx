import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react-native";
import type { ReactElement } from "react";
import type { BookingDetail, Me, Resources } from "@/lib/api/schemas";

export const ME: Me = {
  userId: "u1",
  email: "ryan@example.com",
  name: "Ryan Kennedy",
  role: "owner",
  staffId: "S1",
  permissions: [],
  business: {
    name: "Ryan Kennedy Hairdressing",
    timezone: "Australia/Melbourne",
  },
};

export const RESOURCES: Resources = {
  timezone: "Australia/Melbourne",
  slotStepMin: 15,
  locations: [{ id: "L1", name: "Northcote" }],
  staff: [
    { id: "S1", name: "Ryan", colour: "#d33a1e" },
    { id: "S2", name: "Alex", colour: "#1f4e8c" },
  ],
  viewer: {
    role: "owner",
    staffId: "S1",
    seesAll: true,
    createBookings: true,
    editBookings: true,
    cancelBookings: true,
    checkout: true,
    reassign: true,
    refund: true,
    viewClients: true,
    editClients: true,
    mergeClients: true,
  },
  services: [
    {
      id: "cut",
      name: "Cut",
      durationMin: 45,
      priceCents: 9500,
      locationIds: [],
    },
  ],
};

export function booking(overrides: Partial<BookingDetail> = {}): BookingDetail {
  return {
    id: "B1",
    status: "confirmed",
    start: "2026-11-24T23:00:00.000Z",
    end: "2026-11-24T23:45:00.000Z",
    source: "online",
    comments: "Bring a photo",
    cancelReason: null,
    location: { id: "L1", name: "Northcote" },
    staff: { id: "S1", name: "Ryan", colour: "#d33a1e" },
    client: {
      id: "C1",
      name: "Sam Client",
      phone: "+61412345678",
      email: "sam@example.com",
      notes: "Prefers a quiet chair",
      blocked: false,
      isVip: false,
    },
    services: [{ id: "cut", name: "Cut", durationMin: 45, priceCents: 9500 }],
    totalCents: 9500,
    depositCents: 4750,
    paidCents: 4750,
    balanceDueCents: 4750,
    payments: [],
    allowed: {
      move: true,
      cancel: true,
      noShow: true,
      checkout: true,
      resend: true,
      reassign: true,
      refund: true,
    },
    reassignOptions: [],
    ...overrides,
  };
}

export async function renderWithClient(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}
