import type { Resources, Slot } from "@/lib/api/schemas";
import {
  blankClient,
  canContinue,
  emptyDraft,
  nextStep,
  prevStep,
  servicesAt,
  summarise,
  toggleService,
  toRequest,
  withDate,
  withLocation,
  withStaff,
} from "@/lib/new-booking";

const resources: Resources = {
  timezone: "Australia/Melbourne",
  slotStepMin: 15,
  locations: [
    { id: "L1", name: "Northcote" },
    { id: "L2", name: "Fitzroy" },
  ],
  staff: [{ id: "S1", name: "Ryan", colour: "#d33a1e" }],
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
      locationIds: ["L1"],
    },
    {
      id: "colour",
      name: "Colour",
      durationMin: 90,
      priceCents: 18000,
      locationIds: [],
    },
    {
      id: "beard",
      name: "Beard",
      durationMin: 15,
      priceCents: 3000,
      locationIds: ["L2"],
    },
  ],
};
const slot: Slot = {
  staffId: "S1",
  start: "2026-11-24T23:00:00.000Z",
  end: "2026-11-24T23:45:00.000Z",
};
const base = emptyDraft("2026-11-25");

describe("canContinue", () => {
  test("client: needs a choice; a new client needs a first name and a mobile", () => {
    expect(canContinue("client", base)).toBe(false);
    expect(
      canContinue("client", {
        ...base,
        client: { kind: "existing", id: "c1", name: "Sam" },
      }),
    ).toBe(true);
    const fresh = { ...blankClient(), firstName: "Jo" };
    expect(
      canContinue("client", {
        ...base,
        client: { kind: "new", details: fresh },
      }),
    ).toBe(false);
    expect(
      canContinue("client", {
        ...base,
        client: { kind: "new", details: { ...fresh, phone: "0412 345 678" } },
      }),
    ).toBe(true);
    expect(
      canContinue("client", {
        ...base,
        client: {
          kind: "new",
          details: { ...fresh, firstName: "  ", phone: "1" },
        },
      }),
    ).toBe(false);
  });

  test("services needs a location and at least one service; time needs a slot", () => {
    expect(canContinue("services", base)).toBe(false);
    expect(canContinue("services", { ...base, locationId: "L1" })).toBe(false);
    expect(
      canContinue("services", {
        ...base,
        locationId: "L1",
        serviceIds: ["cut"],
      }),
    ).toBe(true);
    expect(canContinue("time", base)).toBe(false);
    expect(canContinue("time", { ...base, slot })).toBe(true);
    expect(canContinue("review", base)).toBe(true);
  });
});

describe("stepping", () => {
  test("moves forward and back, stopping at the ends", () => {
    expect(nextStep("client")).toBe("services");
    expect(nextStep("review")).toBe("review");
    expect(prevStep("time")).toBe("services");
    expect(prevStep("client")).toBe("client");
  });
});

describe("services and locations", () => {
  test("a service with no location list is offered everywhere", () => {
    expect(servicesAt(resources, "L1").map((s) => s.id)).toEqual([
      "cut",
      "colour",
    ]);
    expect(servicesAt(resources, "L2").map((s) => s.id)).toEqual([
      "colour",
      "beard",
    ]);
    expect(servicesAt(resources, null).map((s) => s.id)).toEqual(["colour"]);
  });

  test("changing services, stylist, date or location clears the chosen time", () => {
    const picked = { ...base, locationId: "L1", serviceIds: ["cut"], slot };
    expect(toggleService(picked, "colour").slot).toBeNull();
    expect(toggleService(picked, "colour").serviceIds).toEqual([
      "cut",
      "colour",
    ]);
    expect(toggleService(picked, "cut").serviceIds).toEqual([]);
    expect(withStaff(picked, "S1").slot).toBeNull();
    expect(withDate(picked, "2026-11-26").slot).toBeNull();
    const moved = withLocation(picked, "L2");
    expect(moved.slot).toBeNull();
    expect(moved.serviceIds).toEqual([]);
  });

  test("choosing the same location again keeps everything", () => {
    const picked = { ...base, locationId: "L1", serviceIds: ["cut"], slot };
    expect(withLocation(picked, "L1")).toBe(picked);
  });

  test("summarise totals the chosen services", () => {
    const s = summarise({ ...base, serviceIds: ["cut", "beard"] }, resources);
    expect(s).toEqual({
      names: ["Cut", "Beard"],
      durationMin: 60,
      listPriceCents: 12500,
    });
  });
});

describe("toRequest", () => {
  const ready = {
    ...base,
    client: { kind: "existing", id: "c1", name: "Sam" } as const,
    locationId: "L1",
    serviceIds: ["cut"],
    slot,
  };

  test("is null until everything required is chosen", () => {
    expect(toRequest(base)).toBeNull();
    expect(toRequest({ ...ready, slot: null })).toBeNull();
    expect(toRequest({ ...ready, serviceIds: [] })).toBeNull();
  });

  test("an existing client; first available resolves to the stylist who is free", () => {
    expect(toRequest(ready)).toEqual({
      locationId: "L1",
      staffId: "S1",
      serviceIds: ["cut"],
      start: slot.start,
      client: { existingClientId: "c1" },
      comments: undefined,
      notifyClient: true,
    });
  });

  test("a new client is trimmed; a named stylist is respected; a blank note is dropped", () => {
    const body = toRequest({
      ...ready,
      staffId: "S9",
      comments: "  ",
      notifyClient: false,
      client: {
        kind: "new",
        details: {
          firstName: " Jo ",
          lastName: " Lee",
          phone: " 0412 345 678 ",
          email: "",
        },
      },
    });
    expect(body).toMatchObject({
      staffId: "S9",
      notifyClient: false,
      comments: undefined,
      client: {
        newClient: {
          firstName: "Jo",
          lastName: "Lee",
          phone: "0412 345 678",
          email: "",
        },
      },
    });
  });
});
