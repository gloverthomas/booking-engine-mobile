import type { Resources, Slot } from "./api/schemas";
import type { NewBookingInput, NewClient } from "./api/endpoints";

export type Step = "client" | "services" | "time" | "review";
export const STEPS: readonly Step[] = ["client", "services", "time", "review"];

export type ClientChoice =
  | { kind: "existing"; id: string; name: string }
  | { kind: "new"; details: NewClient };

export interface Draft {
  client: ClientChoice | null;
  locationId: string | null;
  serviceIds: string[];
  /** null means "first available". */
  staffId: string | null;
  /** Local date, YYYY-MM-DD. */
  date: string;
  slot: Slot | null;
  notifyClient: boolean;
  comments: string;
}

export const emptyDraft = (date: string): Draft => ({
  client: null,
  locationId: null,
  serviceIds: [],
  staffId: null,
  date,
  slot: null,
  notifyClient: true,
  comments: "",
});

export const blankClient = (): NewClient => ({
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
});

/** Whether the person has said enough to move past a step. The server still validates everything. */
export function canContinue(step: Step, d: Draft): boolean {
  switch (step) {
    case "client":
      if (!d.client) return false;
      return d.client.kind === "existing"
        ? true
        : d.client.details.firstName.trim() !== "" &&
            d.client.details.phone.trim() !== "";
    case "services":
      return d.locationId !== null && d.serviceIds.length > 0;
    case "time":
      return d.slot !== null;
    case "review":
      return true;
  }
}

export const nextStep = (s: Step): Step =>
  STEPS[Math.min(STEPS.indexOf(s) + 1, STEPS.length - 1)];
export const prevStep = (s: Step): Step =>
  STEPS[Math.max(STEPS.indexOf(s) - 1, 0)];

/** Services offered at a location. A service with no location list is offered everywhere. */
export function servicesAt(resources: Resources, locationId: string | null) {
  return resources.services.filter(
    (s) =>
      s.locationIds.length === 0 ||
      (locationId !== null && s.locationIds.includes(locationId)),
  );
}

/** Toggle a service. Changing the services invalidates the chosen time, because length and price change. */
export function toggleService(d: Draft, serviceId: string): Draft {
  const has = d.serviceIds.includes(serviceId);
  return {
    ...d,
    serviceIds: has
      ? d.serviceIds.filter((id) => id !== serviceId)
      : [...d.serviceIds, serviceId],
    slot: null,
  };
}

export function withLocation(d: Draft, locationId: string): Draft {
  return d.locationId === locationId
    ? d
    : { ...d, locationId, serviceIds: [], slot: null };
}

export function withStaff(d: Draft, staffId: string | null): Draft {
  return { ...d, staffId, slot: null };
}

export function withDate(d: Draft, date: string): Draft {
  return { ...d, date, slot: null };
}

export function summarise(d: Draft, resources: Resources) {
  const chosen = resources.services.filter((s) => d.serviceIds.includes(s.id));
  return {
    names: chosen.map((s) => s.name),
    durationMin: chosen.reduce((n, s) => n + s.durationMin, 0),
    listPriceCents: chosen.reduce((n, s) => n + s.priceCents, 0),
  };
}

/** The request body, or null while something required is missing. */
export function toRequest(d: Draft): NewBookingInput | null {
  if (!d.client || !d.locationId || d.serviceIds.length === 0 || !d.slot)
    return null;
  const client =
    d.client.kind === "existing"
      ? { existingClientId: d.client.id }
      : {
          newClient: {
            firstName: d.client.details.firstName.trim(),
            lastName: d.client.details.lastName.trim(),
            phone: d.client.details.phone.trim(),
            email: d.client.details.email.trim(),
          },
        };
  return {
    locationId: d.locationId,
    // The slot knows which stylist is free; "first available" resolves to them.
    staffId: d.staffId ?? d.slot.staffId,
    serviceIds: d.serviceIds,
    start: d.slot.start,
    client,
    comments: d.comments.trim() || undefined,
    notifyClient: d.notifyClient,
  };
}
