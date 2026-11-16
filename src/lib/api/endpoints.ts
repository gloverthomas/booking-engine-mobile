import { z } from "zod";
import type { ApiClient } from "./client";
import {
  bookingDetailSchema,
  bookingListSchema,
  clockEntrySchema,
  exceptionResultSchema,
  myWeekSchema,
  offerableSlotsSchema,
  offerCreatedSchema,
  removedSchema,
  rosterExceptionsSchema,
  waitlistListSchema,
  clockSchema,
  rescheduleSlotsSchema,
  rosterSchema,
  cardPaymentSchema,
  cardPaymentStatusSchema,
  connectionTokenSchema,
  calendarSchema,
  clientListSchema,
  clientProfileSchema,
  createdBookingSchema,
  doneSchema,
  meSchema,
  outcomeSchema,
  resourcesSchema,
  signInSchema,
  slotsSchema,
  terminalConfigSchema,
} from "./schemas";

export interface NewBookingInput {
  locationId: string;
  staffId?: string;
  serviceIds: string[];
  /** ISO 8601 with offset. */
  start: string;
  client: { existingClientId: string } | { newClient: NewClient };
  comments?: string;
  notifyClient: boolean;
}

export interface NewClient {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
}

export type DepositMode = "refund" | "keep";
export type ManualMethod = "cash" | "eftpos" | "other";

/** Every call the app makes, typed and validated. One place to read the contract. */
export function createEndpoints(api: ApiClient) {
  const enc = encodeURIComponent;
  return {
    signInWithGoogle: (idToken: string, nonce?: string) =>
      api.post("/auth/google", signInSchema, { idToken, nonce }, true),
    signOut: () =>
      api.post("/auth/signout", z.object({ signedOut: z.boolean() })),
    me: () => api.get("/me", meSchema),
    resources: () => api.get("/resources", resourcesSchema),

    calendar: (from: string, to: string) =>
      api.get("/calendar", calendarSchema, { from, to }),
    bookings: (
      filter: "upcoming" | "past" | "cancelled" = "upcoming",
      q?: string,
      limit?: number,
    ) => api.get("/bookings", bookingListSchema, { filter, q, limit }),
    booking: (id: string) =>
      api.get(`/bookings/${enc(id)}`, bookingDetailSchema),

    availability: (q: {
      locationId: string;
      serviceIds: string[];
      fromDate: string;
      toDate: string;
      staffId?: string;
    }) =>
      api.get("/availability", slotsSchema, {
        locationId: q.locationId,
        serviceIds: q.serviceIds.join(","),
        fromDate: q.fromDate,
        toDate: q.toDate,
        staffId: q.staffId,
      }),
    createBooking: (input: NewBookingInput) =>
      api.post("/bookings", createdBookingSchema, input),

    cancelBooking: (id: string, depositMode: DepositMode, reason?: string) =>
      api.post(`/bookings/${enc(id)}/cancel`, outcomeSchema, {
        depositMode,
        reason,
      }),
    markNoShow: (id: string) =>
      api.post(`/bookings/${enc(id)}/no-show`, outcomeSchema),
    reschedule: (id: string, newStart: string, notifyClient: boolean) =>
      api.post(`/bookings/${enc(id)}/reschedule`, doneSchema, {
        newStart,
        notifyClient,
      }),
    rescheduleSlots: (id: string, fromDate: string, toDate: string) =>
      api.get(`/bookings/${enc(id)}/reschedule-slots`, rescheduleSlotsSchema, {
        fromDate,
        toDate,
      }),
    reassign: (id: string, newStaffId: string, notifyClient: boolean) =>
      api.post(`/bookings/${enc(id)}/reassign`, doneSchema, {
        newStaffId,
        notifyClient,
      }),
    checkout: (id: string, method: ManualMethod) =>
      api.post(`/bookings/${enc(id)}/checkout`, doneSchema, { method }),

    terminalConfig: () => api.get("/payments/terminal", terminalConfigSchema),
    connectionToken: () =>
      api.post("/payments/terminal/connection-token", connectionTokenSchema),
    startCardPayment: (id: string) =>
      api.post(`/bookings/${enc(id)}/card-payment`, cardPaymentSchema),
    cardPaymentStatus: (id: string, paymentId: string) =>
      api.get(`/bookings/${enc(id)}/card-payment`, cardPaymentStatusSchema, {
        paymentId,
      }),

    registerDevice: (token: string) =>
      api.post("/devices", z.object({ registered: z.boolean() }), { token }),
    removeDevice: (token: string) =>
      api.delete("/devices", z.object({ registered: z.boolean() }), { token }),

    roster: (week?: string) => api.get("/roster", rosterSchema, { week }),
    clock: () => api.get("/timesheets/clock", clockSchema),
    clockIn: (locationId?: string) =>
      api.post("/timesheets/clock/in", clockEntrySchema, { locationId }),
    clockOut: (breakMinutes: number) =>
      api.post("/timesheets/clock/out", clockEntrySchema, { breakMinutes }),

    rosterExceptions: (from?: string) =>
      api.get("/roster/exceptions", rosterExceptionsSchema, { from }),
    setDayOff: (input: {
      staffId: string;
      date: string;
      locationId: string | null;
      note?: string;
    }) =>
      api.post("/roster/exceptions", exceptionResultSchema, {
        kind: "off",
        ...input,
      }),
    setCustomHours: (input: {
      staffId: string;
      date: string;
      locationId: string;
      ranges: { startMinute: number; endMinute: number }[];
      note?: string;
    }) =>
      api.post("/roster/exceptions", exceptionResultSchema, {
        kind: "custom",
        ...input,
      }),
    removeRosterException: (id: string) =>
      api.delete(`/roster/exceptions/${enc(id)}`, removedSchema),
    myWeek: (week?: string) =>
      api.get("/timesheets/week", myWeekSchema, { week }),

    waitlist: (view: "active" | "history" = "active") =>
      api.get("/waitlist", waitlistListSchema, { view }),
    waitlistSlots: (id: string) =>
      api.get(`/waitlist/${enc(id)}/slots`, offerableSlotsSchema),
    offerWaitlistSlot: (
      id: string,
      slot: { staffId: string; start: string; end: string },
    ) => api.post(`/waitlist/${enc(id)}/offer`, offerCreatedSchema, slot),
    removeFromWaitlist: (id: string) =>
      api.delete(`/waitlist/${enc(id)}`, removedSchema),

    searchClients: (q: string) => api.get("/clients", clientListSchema, { q }),
    client: (id: string) => api.get(`/clients/${enc(id)}`, clientProfileSchema),
  };
}

export type Endpoints = ReturnType<typeof createEndpoints>;
