import { z } from "zod";

/**
 * The shapes /api/v1 returns, validated at runtime. If the server and the app drift apart, a response
 * fails loudly here (ContractError) instead of crashing a screen three levels down.
 * Mirrors docs/API.md and src/server/admin/types.ts in the booking-engine repo.
 */

export const roleSchema = z.enum(["owner", "manager", "stylist", "reception"]);
export type Role = z.infer<typeof roleSchema>;

export const bookingStatusSchema = z.enum([
  "pending_payment",
  "confirmed",
  "completed",
  "cancelled_by_client",
  "cancelled_by_staff",
  "late_cancelled",
  "no_show",
  "expired",
]);
export type BookingStatus = z.infer<typeof bookingStatusSchema>;

export const meSchema = z.object({
  userId: z.string(),
  email: z.string(),
  name: z.string().nullable(),
  role: roleSchema,
  staffId: z.string().nullable(),
  permissions: z.array(z.string()),
  business: z.object({ name: z.string(), timezone: z.string() }),
});
export type Me = z.infer<typeof meSchema>;

export const signInSchema = z.object({
  token: z.string().min(1),
  user: z.object({
    id: z.string(),
    email: z.string(),
    name: z.string().nullable(),
  }),
  role: roleSchema,
  staffId: z.string().nullable(),
});

const viewerCapsSchema = z.object({
  role: roleSchema,
  staffId: z.string().nullable(),
  seesAll: z.boolean(),
  createBookings: z.boolean(),
  editBookings: z.boolean(),
  cancelBookings: z.boolean(),
  checkout: z.boolean(),
  reassign: z.boolean(),
  refund: z.boolean(),
  viewClients: z.boolean(),
  editClients: z.boolean(),
  mergeClients: z.boolean(),
});

export const resourcesSchema = z.object({
  timezone: z.string(),
  slotStepMin: z.number(),
  locations: z.array(z.object({ id: z.string(), name: z.string() })),
  staff: z.array(
    z.object({ id: z.string(), name: z.string(), colour: z.string() }),
  ),
  viewer: viewerCapsSchema,
  services: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      durationMin: z.number(),
      priceCents: z.number(),
      locationIds: z.array(z.string()),
    }),
  ),
});
export type Resources = z.infer<typeof resourcesSchema>;

const calendarBookingSchema = z.object({
  kind: z.literal("booking"),
  id: z.string(),
  start: z.string(),
  end: z.string(),
  staffId: z.string(),
  locationId: z.string(),
  status: bookingStatusSchema,
  clientId: z.string(),
  clientName: z.string(),
  services: z.array(z.string()),
  totalCents: z.number(),
  source: z.string(),
});
const calendarBlockSchema = z.object({
  kind: z.enum(["block", "external"]),
  id: z.string(),
  start: z.string(),
  end: z.string(),
  staffId: z.string(),
  reason: z.string().nullable(),
});
export const calendarEventSchema = z.discriminatedUnion("kind", [
  calendarBookingSchema,
  z.object({ ...calendarBlockSchema.shape, kind: z.literal("block") }),
  z.object({ ...calendarBlockSchema.shape, kind: z.literal("external") }),
]);
export type CalendarEvent = z.infer<typeof calendarEventSchema>;
export type CalendarBooking = z.infer<typeof calendarBookingSchema>;
export const calendarSchema = z.object({
  events: z.array(calendarEventSchema),
});

export const bookingRowSchema = z.object({
  id: z.string(),
  start: z.string(),
  end: z.string(),
  status: bookingStatusSchema,
  clientId: z.string(),
  clientName: z.string(),
  locationName: z.string(),
  services: z.array(z.string()),
  totalCents: z.number(),
  staffId: z.string(),
  staffName: z.string(),
  staffColour: z.string(),
});
export type BookingRow = z.infer<typeof bookingRowSchema>;
export const bookingListSchema = z.object({
  bookings: z.array(bookingRowSchema),
});

const paymentSchema = z.object({
  id: z.string(),
  kind: z.enum([
    "deposit",
    "balance",
    "no_show_fee",
    "late_cancel_fee",
    "refund",
  ]),
  method: z.enum([
    "stripe_online",
    "stripe_in_person",
    "cash",
    "eftpos",
    "other",
  ]),
  status: z.enum([
    "pending",
    "succeeded",
    "failed",
    "refunded",
    "partially_refunded",
  ]),
  amountCents: z.number(),
  note: z.string().nullable(),
  createdAt: z.string(),
});
export type Payment = z.infer<typeof paymentSchema>;

export const bookingDetailSchema = z.object({
  id: z.string(),
  status: bookingStatusSchema,
  start: z.string(),
  end: z.string(),
  source: z.string(),
  comments: z.string().nullable(),
  cancelReason: z.string().nullable(),
  location: z.object({ id: z.string(), name: z.string() }),
  staff: z.object({ id: z.string(), name: z.string(), colour: z.string() }),
  client: z.object({
    id: z.string(),
    name: z.string(),
    phone: z.string().nullable(),
    email: z.string().nullable(),
    notes: z.string().nullable(),
    blocked: z.boolean(),
    isVip: z.boolean(),
  }),
  services: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      durationMin: z.number(),
      priceCents: z.number(),
    }),
  ),
  totalCents: z.number(),
  depositCents: z.number(),
  paidCents: z.number(),
  balanceDueCents: z.number(),
  payments: z.array(paymentSchema),
  allowed: z.object({
    move: z.boolean(),
    cancel: z.boolean(),
    noShow: z.boolean(),
    checkout: z.boolean(),
    resend: z.boolean(),
    reassign: z.boolean(),
    refund: z.boolean(),
  }),
  reassignOptions: z.array(z.object({ id: z.string(), name: z.string() })),
});
export type BookingDetail = z.infer<typeof bookingDetailSchema>;

export const clientSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  isVip: z.boolean(),
  blocked: z.boolean(),
});
export type ClientSummary = z.infer<typeof clientSummarySchema>;
export const clientListSchema = z.object({
  clients: z.array(clientSummarySchema),
});

export const clientProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  notes: z.string().nullable(),
  blocked: z.boolean(),
  isVip: z.boolean(),
  stats: z.object({
    completedCount: z.number(),
    noShowCount: z.number(),
    lateCancelCount: z.number(),
    cancelledCount: z.number(),
    upcomingCount: z.number(),
    lifetimeSpendCents: z.number(),
  }),
  history: z.array(bookingRowSchema),
});
export type ClientProfile = z.infer<typeof clientProfileSchema>;

export const slotsSchema = z.object({
  slots: z.array(
    z.object({
      staffId: z.string(),
      start: z.string(),
      end: z.string(),
      totalCents: z.number().optional(),
      durationMin: z.number().optional(),
    }),
  ),
});
export type Slot = z.infer<typeof slotsSchema>["slots"][number];

export const createdBookingSchema = z.object({ bookingId: z.string() });
export const outcomeSchema = z.object({
  depositAction: z.enum(["refund", "keep", "none"]),
  feeCents: z.number(),
});
export type Outcome = z.infer<typeof outcomeSchema>;
export const doneSchema = z.unknown();
