import spec from "../contract/openapi.json";
import type { ApiClient } from "@/lib/api/client";
import { createEndpoints } from "@/lib/api/endpoints";

type Operation = {
  parameters?: { name: string; in: string; required?: boolean }[];
  requestBody?: unknown;
};
const operations = spec.paths as unknown as Record<
  string,
  Record<string, Operation>
>;

/** A client that records what the app would call, instead of calling it. */
function recorder() {
  const calls: {
    method: string;
    path: string;
    query: Record<string, unknown>;
    body: unknown;
  }[] = [];
  const record =
    (method: string) =>
    async (
      path: string,
      _schema: unknown,
      second?: unknown,
      third?: unknown,
    ) => {
      calls.push({
        method,
        path,
        query:
          method === "get" ? ((second as Record<string, unknown>) ?? {}) : {},
        body: method === "get" ? undefined : second,
      });
      void third;
      return undefined;
    };
  const client = {
    get: record("get"),
    post: record("post"),
    delete: record("delete"),
  } as unknown as ApiClient;
  return { calls, endpoints: createEndpoints(client) };
}

const ID = "11111111-1111-4111-8111-111111111111";

describe("the app only calls endpoints the server documents", () => {
  const { calls, endpoints: e } = recorder();
  const invocations: Record<string, () => Promise<unknown>> = {
    signInWithGoogle: () => e.signInWithGoogle("x".repeat(40)),
    signOut: () => e.signOut(),
    me: () => e.me(),
    resources: () => e.resources(),
    calendar: () => e.calendar("2026-11-24T00:00:00Z", "2026-11-25T00:00:00Z"),
    bookings: () => e.bookings("upcoming"),
    booking: () => e.booking(ID),
    availability: () =>
      e.availability({
        locationId: ID,
        serviceIds: [ID],
        fromDate: "2026-11-24",
        toDate: "2026-11-24",
      }),
    createBooking: () =>
      e.createBooking({
        locationId: ID,
        serviceIds: [ID],
        start: "2026-11-24T00:00:00Z",
        client: { existingClientId: ID },
        notifyClient: true,
      }),
    cancelBooking: () => e.cancelBooking(ID, "keep"),
    markNoShow: () => e.markNoShow(ID),
    reschedule: () => e.reschedule(ID, "2026-11-24T00:00:00Z", true),
    rescheduleSlots: () => e.rescheduleSlots(ID, "2026-11-24", "2026-11-24"),
    reassign: () => e.reassign(ID, ID, true),
    checkout: () => e.checkout(ID, "cash"),
    terminalConfig: () => e.terminalConfig(),
    connectionToken: () => e.connectionToken(),
    startCardPayment: () => e.startCardPayment(ID),
    cardPaymentStatus: () => e.cardPaymentStatus(ID, ID),
    registerDevice: () => e.registerDevice("ExponentPushToken[abc123]"),
    removeDevice: () => e.removeDevice("ExponentPushToken[abc123]"),
    roster: () => e.roster("2026-11-24"),
    rosterExceptions: () => e.rosterExceptions("2026-11-24"),
    setDayOff: () =>
      e.setDayOff({ staffId: ID, date: "2026-11-24", locationId: null }),
    setCustomHours: () =>
      e.setCustomHours({
        staffId: ID,
        date: "2026-11-24",
        locationId: ID,
        ranges: [{ startMinute: 540, endMinute: 900 }],
      }),
    removeRosterException: () => e.removeRosterException(ID),
    clock: () => e.clock(),
    clockIn: () => e.clockIn(ID),
    clockOut: () => e.clockOut(15),
    myWeek: () => e.myWeek("2026-11-24"),
    waitlist: () => e.waitlist("active"),
    waitlistSlots: () => e.waitlistSlots(ID),
    offerWaitlistSlot: () =>
      e.offerWaitlistSlot(ID, {
        staffId: ID,
        start: "2026-11-24T00:00:00Z",
        end: "2026-11-24T01:00:00Z",
      }),
    removeFromWaitlist: () => e.removeFromWaitlist(ID),
    searchClients: () => e.searchClients("sam"),
    client: () => e.client(ID),
  };

  beforeAll(async () => {
    for (const run of Object.values(invocations)) await run();
  });

  test("every endpoint function is covered by this test", () => {
    expect(Object.keys(invocations).sort()).toEqual(Object.keys(e).sort());
  });

  test("each call is a documented method and path", () => {
    const undocumented = calls
      .map((c) => ({ ...c, spec: c.path.replace(new RegExp(ID, "g"), "{id}") }))
      .filter((c) => !operations[c.spec]?.[c.method]);
    expect(
      undocumented.map((c) => `${c.method.toUpperCase()} ${c.path}`),
    ).toEqual([]);
  });

  const specPath = (path: string) => path.replace(new RegExp(ID, "g"), "{id}");

  test("every query parameter the app sends is one the server documents", () => {
    const unknown: string[] = [];
    for (const c of calls.filter((x) => x.method === "get")) {
      const documented = new Set(
        (operations[specPath(c.path)]?.get?.parameters ?? [])
          .filter((p) => p.in === "query")
          .map((p) => p.name),
      );
      for (const [key, value] of Object.entries(c.query)) {
        if (value !== undefined && value !== "" && !documented.has(key))
          unknown.push(`${c.path}?${key}`);
      }
    }
    expect(unknown).toEqual([]);
  });

  test("a call that takes a body is documented as taking one", () => {
    const missing = calls
      .filter(
        (x) =>
          x.method !== "get" &&
          x.body !== undefined &&
          JSON.stringify(x.body) !== "{}",
      )
      .filter((c) => !operations[specPath(c.path)]?.[c.method]?.requestBody)
      .map((c) => `${c.method.toUpperCase()} ${c.path}`);
    expect(missing).toEqual([]);
  });
});
