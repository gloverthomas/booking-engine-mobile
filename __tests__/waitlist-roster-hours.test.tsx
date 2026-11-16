import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import { Alert, Linking } from "react-native";
import { api } from "@/lib/api";
import { ApiRequestError } from "@/lib/api/client";
import type { MyWeek, WaitlistEntry } from "@/lib/api/schemas";
import { ME as mockMe, RESOURCES, renderWithClient } from "./helpers";

jest.mock("@/lib/api", () => ({
  api: {
    resources: jest.fn(),
    waitlist: jest.fn(),
    waitlistSlots: jest.fn(),
    offerWaitlistSlot: jest.fn(),
    removeFromWaitlist: jest.fn(),
    rosterExceptions: jest.fn(),
    setDayOff: jest.fn(),
    setCustomHours: jest.fn(),
    removeRosterException: jest.fn(),
    roster: jest.fn(),
    myWeek: jest.fn(),
  },
  sessionBridge: { setToken: jest.fn(), onEnded: jest.fn() },
}));
jest.mock("@/lib/auth/session", () => ({
  useMe: () => mockMe,
  useSession: jest.fn(),
}));

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockParams: { current: Record<string, string> } = { current: {} };
jest.mock("expo-router", () => ({
  Link: ({ children }: { children: unknown }) => children,
  useRouter: () => ({ push: mockPush, back: mockBack, replace: jest.fn() }),
  useLocalSearchParams: () => mockParams.current,
}));

import RosterScreen from "@/app/(app)/(tabs)/roster";
import HoursScreen from "@/app/(app)/hours";
import RosterEditScreen from "@/app/(app)/roster/edit";
import WaitlistEntryScreen from "@/app/(app)/waitlist/[id]";
import WaitlistScreen from "@/app/(app)/waitlist/index";

const mocked = api as unknown as Record<keyof typeof api, jest.Mock>;
const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);

function alertButton(label: string) {
  const buttons = alertSpy.mock.calls.at(-1)?.[2] ?? [];
  const found = buttons.find((b) => b.text === label);
  if (!found)
    throw new Error(
      `No "${label}" button (${buttons.map((b) => b.text).join(", ")})`,
    );
  return found;
}
async function pressAlert(label: string) {
  const button = alertButton(label);
  await act(async () => {
    button.onPress?.();
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockParams.current = {};
  mocked.resources.mockResolvedValue(RESOURCES);
});

/* Waitlist ------------------------------------------------------------------- */

const entry = (overrides: Partial<WaitlistEntry> = {}): WaitlistEntry => ({
  id: "W1",
  status: "waiting",
  clientId: "C1",
  clientName: "Sam Client",
  clientPhone: "+61412345678",
  clientEmail: null,
  locationName: "Northcote",
  staffName: null,
  serviceNames: ["Cut", "Toner"],
  earliestDate: "2026-11-25",
  latestDate: "2026-12-05",
  weekdays: [1, 3],
  fromMinute: 540,
  toMinute: 1020,
  notes: "Mornings only",
  createdAt: "2026-11-20T00:00:00.000Z",
  offers: [],
  ...overrides,
});

describe("Waitlist list", () => {
  test("shows who is waiting, what they want and when they can come", async () => {
    mocked.waitlist.mockResolvedValue({
      entries: [
        entry(),
        entry({
          id: "W2",
          clientName: "Jo Lee",
          status: "offered",
          offers: [
            {
              id: "o",
              status: "sent",
              start: "",
              end: "",
              staffName: "",
              offeredBy: "",
              expiresAt: "",
            },
          ],
        }),
      ],
    });
    await renderWithClient(<WaitlistScreen />);
    expect(await screen.findByText("Sam Client")).toBeTruthy();
    expect(screen.getAllByText("Cut + Toner")).toHaveLength(2);
    expect(
      screen.getAllByText("25 Nov – 5 Dec · Mon, Wed · 9am – 5pm")[0],
    ).toBeTruthy();
    expect(screen.getByText("Waiting")).toBeTruthy();
    expect(screen.getByText("Offer sent")).toBeTruthy();
    expect(mocked.waitlist).toHaveBeenCalledWith("active");
  });

  test("history is a separate list", async () => {
    mocked.waitlist.mockResolvedValue({ entries: [] });
    await renderWithClient(<WaitlistScreen />);
    expect(await screen.findByText("Nobody is waiting")).toBeTruthy();
    await fireEvent.press(screen.getByText("History"));
    await waitFor(() =>
      expect(mocked.waitlist).toHaveBeenCalledWith("history"),
    );
    expect(await screen.findByText("Nothing here yet")).toBeTruthy();
  });

  test("a failed load can be retried", async () => {
    mocked.waitlist.mockRejectedValueOnce(
      new ApiRequestError(500, "internal", "Something went wrong."),
    );
    mocked.waitlist.mockResolvedValue({ entries: [entry()] });
    await renderWithClient(<WaitlistScreen />);
    await fireEvent.press(await screen.findByText("Try again"));
    expect(await screen.findByText("Sam Client")).toBeTruthy();
  });
});

describe("Waitlist entry", () => {
  const SLOT_A = {
    staffId: "S1",
    staffName: "Ryan",
    start: "2026-11-24T23:00:00.000Z",
    end: "2026-11-24T23:45:00.000Z",
  };
  const SLOT_B = {
    staffId: "S1",
    staffName: "Ryan",
    start: "2026-11-25T01:00:00.000Z",
    end: "2026-11-25T01:45:00.000Z",
  };
  const slotsFor = (e = entry(), slots = [SLOT_A, SLOT_B]) => ({
    entry: e,
    timezone: "Australia/Melbourne",
    slots,
  });
  beforeEach(() => {
    mockParams.current = { id: "W1" };
  });

  test("shows the person, their note, and open times grouped by day", async () => {
    mocked.waitlistSlots.mockResolvedValue(slotsFor());
    await renderWithClient(<WaitlistEntryScreen />);
    expect(await screen.findByText("Sam Client")).toBeTruthy();
    expect(screen.getByText("Mornings only")).toBeTruthy();
    expect(screen.getByText("10:00 am")).toBeTruthy();
    expect(screen.getByText("12:00 pm")).toBeTruthy();
    expect(screen.getByText(/Offer a time/)).toBeTruthy();
  });

  test("offering asks first, then sends exactly that time", async () => {
    mocked.waitlistSlots.mockResolvedValue(slotsFor());
    mocked.offerWaitlistSlot.mockResolvedValue({ offerId: "O1" });
    await renderWithClient(<WaitlistEntryScreen />);
    await fireEvent.press(await screen.findByText("10:00 am"));
    expect(mocked.offerWaitlistSlot).not.toHaveBeenCalled();
    expect(alertSpy.mock.calls.at(-1)?.[1]).toContain("Sam Client");
    await pressAlert("Offer it");
    await waitFor(() =>
      expect(mocked.offerWaitlistSlot).toHaveBeenCalledWith("W1", {
        staffId: "S1",
        start: SLOT_A.start,
        end: SLOT_A.end,
      }),
    );
    await waitFor(() =>
      expect(alertSpy.mock.calls.at(-1)?.[0]).toBe("Offer sent"),
    );
  });

  test("a time taken a moment ago is explained and the list reloads", async () => {
    mocked.waitlistSlots.mockResolvedValue(slotsFor());
    mocked.offerWaitlistSlot.mockRejectedValue(
      new ApiRequestError(
        409,
        "slot_taken",
        "That time is no longer available",
      ),
    );
    await renderWithClient(<WaitlistEntryScreen />);
    await fireEvent.press(await screen.findByText("10:00 am"));
    await pressAlert("Offer it");
    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(
        "Couldn't send the offer",
        "That time is no longer available",
      ),
    );
    await waitFor(() =>
      expect(mocked.waitlistSlots.mock.calls.length).toBeGreaterThan(1),
    );
  });

  test("with more than one stylist the time shows who", async () => {
    mocked.waitlistSlots.mockResolvedValue(
      slotsFor(entry(), [
        SLOT_A,
        { ...SLOT_B, staffId: "S2", staffName: "Alex" },
      ]),
    );
    await renderWithClient(<WaitlistEntryScreen />);
    expect(await screen.findByText("10:00 am · Ryan")).toBeTruthy();
    expect(screen.getByText("12:00 pm · Alex")).toBeTruthy();
  });

  test("nothing free that suits them says so", async () => {
    mocked.waitlistSlots.mockResolvedValue(slotsFor(entry(), []));
    await renderWithClient(<WaitlistEntryScreen />);
    expect(
      await screen.findByText("Nothing free that suits them"),
    ).toBeTruthy();
  });

  test("removing asks first, then takes them off and goes back", async () => {
    mocked.waitlistSlots.mockResolvedValue(slotsFor());
    mocked.removeFromWaitlist.mockResolvedValue({ removed: true });
    await renderWithClient(<WaitlistEntryScreen />);
    await fireEvent.press(await screen.findByText("Remove from waitlist"));
    expect(mocked.removeFromWaitlist).not.toHaveBeenCalled();
    await pressAlert("Remove");
    await waitFor(() =>
      expect(mocked.removeFromWaitlist).toHaveBeenCalledWith("W1"),
    );
    await waitFor(() => expect(mockBack).toHaveBeenCalled());
  });

  test("someone already booked or removed has no offer or remove controls", async () => {
    mocked.waitlistSlots.mockResolvedValue(
      slotsFor(entry({ status: "booked" })),
    );
    await renderWithClient(<WaitlistEntryScreen />);
    await screen.findByText("Sam Client");
    expect(screen.queryByText("Remove from waitlist")).toBeNull();
    expect(screen.queryByText("10:00 am")).toBeNull();
  });

  test("calling the client opens the dialler", async () => {
    mocked.waitlistSlots.mockResolvedValue(slotsFor());
    const open = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
    await renderWithClient(<WaitlistEntryScreen />);
    await fireEvent.press(await screen.findByText("Call"));
    expect(open).toHaveBeenCalledWith("tel:+61412345678");
  });
});

/* Roster editing --------------------------------------------------------------- */

describe("Roster edit", () => {
  beforeEach(() => {
    mockParams.current = {
      staffId: "S1",
      staffName: "Ryan Kennedy",
      date: "2026-11-25",
    };
    mocked.rosterExceptions.mockResolvedValue({ exceptions: [] });
    mocked.setDayOff.mockResolvedValue({ ids: ["e1"], conflictingBookings: 0 });
    mocked.setCustomHours.mockResolvedValue({
      ids: ["e1"],
      conflictingBookings: 0,
    });
  });

  test("a day off is the default, with the stylist's first name on the button", async () => {
    await renderWithClient(<RosterEditScreen />);
    await fireEvent.press(await screen.findByText("Mark Ryan off"));
    await waitFor(() =>
      expect(mocked.setDayOff).toHaveBeenCalledWith({
        staffId: "S1",
        date: "2026-11-25",
        locationId: null,
        note: undefined,
      }),
    );
    await waitFor(() => expect(mockBack).toHaveBeenCalled());
  });

  test("a note is trimmed and sent", async () => {
    await renderWithClient(<RosterEditScreen />);
    await fireEvent.changeText(
      await screen.findByLabelText("Note (optional)"),
      "  Holiday  ",
    );
    await fireEvent.press(screen.getByText("Mark Ryan off"));
    await waitFor(() =>
      expect(mocked.setDayOff).toHaveBeenCalledWith(
        expect.objectContaining({ note: "Holiday" }),
      ),
    );
  });

  test("different hours need a start and a finish, and send them with the location", async () => {
    await renderWithClient(<RosterEditScreen />);
    await fireEvent.press(await screen.findByText("Different hours"));
    expect(
      screen.getByText("Save hours").props.accessibilityState?.disabled ??
        screen.getByText("Save hours").parent?.props.accessibilityState
          ?.disabled,
    ).toBeTruthy();
    const starts = screen.getAllByText("10am");
    await fireEvent.press(starts[0]);
    const ends = screen.getAllByText("3pm");
    await fireEvent.press(ends[1]);
    await fireEvent.press(screen.getByText("Save hours"));
    await waitFor(() =>
      expect(mocked.setCustomHours).toHaveBeenCalledWith({
        staffId: "S1",
        date: "2026-11-25",
        locationId: "L1",
        ranges: [{ startMinute: 600, endMinute: 900 }],
        note: undefined,
      }),
    );
  });

  test("finishing before starting is explained and cannot be sent", async () => {
    await renderWithClient(<RosterEditScreen />);
    await fireEvent.press(await screen.findByText("Different hours"));
    await fireEvent.press(screen.getAllByText("3pm")[0]);
    await fireEvent.press(screen.getAllByText("10am")[1]);
    expect(
      await screen.findByText("They must finish after they start."),
    ).toBeTruthy();
    await fireEvent.press(screen.getByText("Save hours"));
    expect(mocked.setCustomHours).not.toHaveBeenCalled();
  });

  test("it warns how many appointments are now outside their hours, and does not claim to have moved them", async () => {
    mocked.setDayOff.mockResolvedValue({ ids: ["e1"], conflictingBookings: 2 });
    await renderWithClient(<RosterEditScreen />);
    await fireEvent.press(await screen.findByText("Mark Ryan off"));
    await waitFor(() => expect(alertSpy.mock.calls.at(-1)?.[0]).toBe("Saved"));
    expect(alertSpy.mock.calls.at(-1)?.[1]).toContain(
      "2 existing appointments now fall outside",
    );
    expect(alertSpy.mock.calls.at(-1)?.[1]).toContain("not been moved");
    expect(mockBack).not.toHaveBeenCalled();
    await pressAlert("OK");
    expect(mockBack).toHaveBeenCalled();
  });

  test("a refusal from the server is shown in its words", async () => {
    mocked.setDayOff.mockRejectedValue(
      new ApiRequestError(
        422,
        "invalid_request",
        "Choose today or a later date.",
        { date: "Must be today or later" },
      ),
    );
    await renderWithClient(<RosterEditScreen />);
    await fireEvent.press(await screen.findByText("Mark Ryan off"));
    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(
        "Couldn't save that",
        "Must be today or later",
      ),
    );
    expect(mockBack).not.toHaveBeenCalled();
  });

  test("a day that was already changed can go back to the weekly hours", async () => {
    mocked.rosterExceptions.mockResolvedValue({
      exceptions: [
        {
          id: "e1",
          staffId: "S1",
          staffName: "Ryan",
          date: "2026-11-25",
          kind: "off",
          locationId: null,
          locationName: null,
          startMinute: null,
          endMinute: null,
          note: "Holiday",
        },
        {
          id: "e9",
          staffId: "S2",
          staffName: "Alex",
          date: "2026-11-25",
          kind: "off",
          locationId: null,
          locationName: null,
          startMinute: null,
          endMinute: null,
          note: null,
        },
      ],
    });
    mocked.removeRosterException.mockResolvedValue({ removed: true });
    await renderWithClient(<RosterEditScreen />);
    expect(await screen.findByText("Day off (Holiday)")).toBeTruthy();
    await fireEvent.press(screen.getByText("Back to weekly hours"));
    await waitFor(() =>
      expect(mocked.removeRosterException).toHaveBeenCalledWith("e1"),
    );
    expect(mocked.removeRosterException).not.toHaveBeenCalledWith("e9");
    await waitFor(() => expect(mockBack).toHaveBeenCalled());
  });

  test("with several locations, a day off can be for all or one", async () => {
    mocked.resources.mockResolvedValue({
      ...RESOURCES,
      locations: [
        { id: "L1", name: "Northcote" },
        { id: "L2", name: "Fitzroy" },
      ],
    });
    await renderWithClient(<RosterEditScreen />);
    await fireEvent.press(await screen.findByText("Fitzroy"));
    await fireEvent.press(screen.getByText("Mark Ryan off"));
    await waitFor(() =>
      expect(mocked.setDayOff).toHaveBeenCalledWith(
        expect.objectContaining({ locationId: "L2" }),
      ),
    );
  });
});

/* Roster screen: tapping a day ----------------------------------------------------- */

describe("Roster screen editing entry point", () => {
  const rosterData = (canEdit: boolean) => ({
    weekStart: "2026-11-23",
    dates: [
      "2026-11-23",
      "2026-11-24",
      "2026-11-25",
      "2026-11-26",
      "2026-11-27",
      "2026-11-28",
      "2026-11-29",
    ],
    timezone: "Australia/Melbourne",
    today: "2026-11-25",
    scope: canEdit ? ("all" as const) : ("own" as const),
    canEdit,
    locations: [{ id: "L1", name: "Northcote" }],
    rows: [
      {
        staffId: "S1",
        name: "Ryan",
        colour: null,
        days: [
          "2026-11-23",
          "2026-11-24",
          "2026-11-25",
          "2026-11-26",
          "2026-11-27",
          "2026-11-28",
          "2026-11-29",
        ].map((date) => ({ date, off: null, entries: [] })),
      },
    ],
  });

  test("an editor can tap today or a later day to change it", async () => {
    mocked.roster.mockResolvedValue(rosterData(true));
    await renderWithClient(<RosterScreen />);
    await fireEvent.press(await screen.findByLabelText(/^Thu 26,/));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/roster/edit",
      params: { staffId: "S1", staffName: "Ryan", date: "2026-11-26" },
    });
    expect(screen.getByText(/Tap a day to mark a day off/)).toBeTruthy();
  });

  test("a day in the past cannot be changed", async () => {
    mocked.roster.mockResolvedValue(rosterData(true));
    await renderWithClient(<RosterScreen />);
    await fireEvent.press(await screen.findByLabelText(/^Mon 23,/));
    expect(mockPush).not.toHaveBeenCalled();
  });

  test("someone who cannot edit gets nothing to tap", async () => {
    mocked.roster.mockResolvedValue(rosterData(false));
    await renderWithClient(<RosterScreen />);
    await fireEvent.press(await screen.findByLabelText(/^Thu 26,/));
    expect(mockPush).not.toHaveBeenCalled();
    expect(screen.queryByText(/Tap a day to mark a day off/)).toBeNull();
  });
});

/* My hours --------------------------------------------------------------------------- */

describe("My hours", () => {
  const sheet = (
    overrides: Partial<MyWeek> = {},
  ): { available: true; sheet: MyWeek } => ({
    available: true,
    sheet: {
      weekStart: "2026-11-23",
      workedMinutes: 480,
      breakMinutes: 30,
      rosteredMinutes: 450,
      differenceMinutes: 30,
      hasOpenEntry: false,
      pendingCount: 1,
      approvedCount: 0,
      days: [
        {
          date: "2026-11-23",
          complete: true,
          workedMinutes: 480,
          rosteredMinutes: 450,
          differenceMinutes: 30,
          entries: [
            {
              id: "t1",
              date: "2026-11-23",
              locationName: "Northcote",
              clockIn: "2026-11-22T22:00:00.000Z",
              clockOut: "2026-11-23T06:30:00.000Z",
              breakMinutes: 30,
              netMinutes: 480,
              source: "clock",
              note: null,
              status: "pending",
            },
          ],
        },
        {
          date: "2026-11-24",
          complete: true,
          workedMinutes: 0,
          rosteredMinutes: 0,
          differenceMinutes: 0,
          entries: [],
        },
      ],
      ...overrides,
    },
  });

  test("shows hours worked against rostered, each shift, and what awaits approval", async () => {
    mocked.myWeek.mockResolvedValue(sheet());
    await renderWithClient(<HoursScreen />);
    expect(await screen.findByText("8 hr")).toBeTruthy();
    expect(
      screen.getByText(/worked · 7 hr 30 min rostered \(\+30 min\)/),
    ).toBeTruthy();
    expect(screen.getByText("1 shift awaiting approval")).toBeTruthy();
    expect(screen.getByText("9:00 am – 5:30 pm · Northcote")).toBeTruthy();
    expect(
      screen.getByText(/after a 30 min break · Awaiting approval/),
    ).toBeTruthy();
    expect(screen.getByText("No shift")).toBeTruthy();
  });

  test("an open shift is called out", async () => {
    mocked.myWeek.mockResolvedValue(sheet({ hasOpenEntry: true }));
    await renderWithClient(<HoursScreen />);
    expect(await screen.findByText("You are on a shift now.")).toBeTruthy();
  });

  test("week navigation asks the server for that week", async () => {
    mocked.myWeek.mockResolvedValue(sheet());
    await renderWithClient(<HoursScreen />);
    await fireEvent.press(await screen.findByLabelText("Next week"));
    await waitFor(() =>
      expect(mocked.myWeek).toHaveBeenLastCalledWith("2026-11-30"),
    );
  });

  test("a login with no staff profile is told why there is no timesheet", async () => {
    mocked.myWeek.mockResolvedValue({ available: false });
    await renderWithClient(<HoursScreen />);
    expect(await screen.findByText("No timesheet")).toBeTruthy();
  });
});
