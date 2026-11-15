import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";
import { api } from "@/lib/api";
import { ApiRequestError } from "@/lib/api/client";
import type { ClockState, Roster } from "@/lib/api/schemas";
import { renderWithClient } from "./helpers";

jest.mock("@/lib/api", () => ({
  api: {
    clock: jest.fn(),
    clockIn: jest.fn(),
    clockOut: jest.fn(),
    roster: jest.fn(),
  },
  sessionBridge: { setToken: jest.fn(), onEnded: jest.fn() },
}));

import { ClockCard } from "@/components/ClockCard";
import RosterScreen from "@/app/(app)/(tabs)/roster";

const mocked = api as unknown as Record<keyof typeof api, jest.Mock>;
const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);

beforeEach(() => {
  jest.clearAllMocks();
});

function lastAlertButton(label: string) {
  const buttons = alertSpy.mock.calls.at(-1)?.[2] ?? [];
  const found = buttons.find((b) => b.text === label);
  if (!found)
    throw new Error(
      `No "${label}" button (${buttons.map((b) => b.text).join(", ")})`,
    );
  return found;
}
async function pressAlert(label: string) {
  const button = lastAlertButton(label);
  await act(async () => {
    button.onPress?.();
  });
}

const out = (locations = [{ id: "L1", name: "Northcote" }]): ClockState => ({
  available: true,
  serverNow: "2026-11-25T00:05:00.000Z",
  open: null,
  locations,
});
const on = (): ClockState => ({
  available: true,
  serverNow: "2026-11-25T00:05:00.000Z",
  open: {
    since: "2026-11-24T22:00:00.000Z",
    sinceLabel: "9:00 am",
    locationName: "Northcote",
  },
  locations: [{ id: "L1", name: "Northcote" }],
});

describe("ClockCard", () => {
  test("shows nothing for a login with no staff profile", async () => {
    mocked.clock.mockResolvedValue({ available: false });
    await renderWithClient(<ClockCard />);
    await waitFor(() => expect(mocked.clock).toHaveBeenCalled());
    expect(screen.queryByText("Clock in")).toBeNull();
    expect(screen.queryByText("Not on a shift")).toBeNull();
  });

  test("with one location, clocking in is one tap and uses that location", async () => {
    mocked.clock.mockResolvedValue(out());
    mocked.clockIn.mockResolvedValue({ entryId: "e1" });
    await renderWithClient(<ClockCard />);
    await fireEvent.press(await screen.findByText("Clock in"));
    await waitFor(() => expect(mocked.clockIn).toHaveBeenCalledWith("L1"));
    expect(alertSpy).not.toHaveBeenCalled();
  });

  test("with several locations it asks where, then clocks in there", async () => {
    mocked.clock.mockResolvedValue(
      out([
        { id: "L1", name: "Northcote" },
        { id: "L2", name: "Fitzroy" },
      ]),
    );
    mocked.clockIn.mockResolvedValue({ entryId: "e1" });
    await renderWithClient(<ClockCard />);
    await fireEvent.press(await screen.findByText("Clock in"));
    expect(mocked.clockIn).not.toHaveBeenCalled();
    await pressAlert("Fitzroy");
    await waitFor(() => expect(mocked.clockIn).toHaveBeenCalledWith("L2"));
  });

  test("on a shift it shows how long, counted from the server's clock", async () => {
    mocked.clock.mockResolvedValue(on());
    await renderWithClient(<ClockCard />);
    expect(await screen.findByText(/On shift · 2 hr 5 min/)).toBeTruthy();
    expect(screen.getByText("Since 9:00 am at Northcote")).toBeTruthy();
  });

  test("clocking out asks about a break and sends the choice", async () => {
    mocked.clock.mockResolvedValue(on());
    mocked.clockOut.mockResolvedValue({ entryId: "e1" });
    await renderWithClient(<ClockCard />);
    await fireEvent.press(await screen.findByText("Clock out"));
    await pressAlert("30 min break");
    await waitFor(() => expect(mocked.clockOut).toHaveBeenCalledWith(30));
  });

  test("no break is sent as zero", async () => {
    mocked.clock.mockResolvedValue(on());
    mocked.clockOut.mockResolvedValue({ entryId: "e1" });
    await renderWithClient(<ClockCard />);
    await fireEvent.press(await screen.findByText("Clock out"));
    await pressAlert("No break");
    await waitFor(() => expect(mocked.clockOut).toHaveBeenCalledWith(0));
  });

  test("a refusal is shown in the server's words", async () => {
    mocked.clock.mockResolvedValue(out());
    mocked.clockIn.mockRejectedValue(
      new ApiRequestError(
        409,
        "invalid_state",
        "You are already clocked in. Clock out first.",
      ),
    );
    await renderWithClient(<ClockCard />);
    await fireEvent.press(await screen.findByText("Clock in"));
    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(
        "That didn't work",
        "You are already clocked in. Clock out first.",
      ),
    );
  });
});

const roster = (overrides: Partial<Roster> = {}): Roster => ({
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
  today: "2026-11-24",
  scope: "all",
  canEdit: true,
  locations: [{ id: "L1", name: "Northcote" }],
  rows: [
    {
      staffId: "S1",
      name: "Ryan",
      colour: "#d33a1e",
      days: [
        {
          date: "2026-11-23",
          off: null,
          entries: [
            {
              locationId: "L1",
              locationName: "Northcote",
              kind: "weekly",
              ranges: [{ startMinute: 540, endMinute: 1020 }],
            },
          ],
        },
        {
          date: "2026-11-24",
          off: { note: "Holiday", everywhere: true, locationNames: [] },
          entries: [],
        },
        ...[
          "2026-11-25",
          "2026-11-26",
          "2026-11-27",
          "2026-11-28",
          "2026-11-29",
        ].map((date) => ({ date, off: null, entries: [] })),
      ],
    },
    { staffId: "S2", name: "Alex", colour: null, days: [] },
  ],
  ...overrides,
});

describe("Roster", () => {
  test("shows each stylist's week with hours, days off and the note", async () => {
    mocked.roster.mockResolvedValue(roster());
    await renderWithClient(<RosterScreen />);
    expect(await screen.findByText("Ryan")).toBeTruthy();
    expect(screen.getByText("Alex")).toBeTruthy();
    expect(screen.getByText("9am – 5pm")).toBeTruthy();
    expect(screen.getByText("Day off")).toBeTruthy();
    expect(screen.getByText("Holiday")).toBeTruthy();
    expect(screen.getByText("This week")).toBeTruthy();
    expect(
      screen.getByText("Change hours and days off on the web."),
    ).toBeTruthy();
  });

  test("a stylist sees 'Your week' and no editing hint", async () => {
    mocked.roster.mockResolvedValue(
      roster({ scope: "own", canEdit: false, rows: [roster().rows[0]] }),
    );
    await renderWithClient(<RosterScreen />);
    expect(await screen.findByText("Your week")).toBeTruthy();
    expect(screen.queryByText("Ryan")).toBeNull();
    expect(screen.queryByText(/on the web/)).toBeNull();
  });

  test("next and previous week ask the server for those weeks", async () => {
    // The server answers with the week it was asked for.
    mocked.roster.mockImplementation(async (week?: string) =>
      roster({ weekStart: week ?? "2026-11-23" }),
    );
    await renderWithClient(<RosterScreen />);
    await fireEvent.press(await screen.findByLabelText("Next week"));
    await waitFor(() =>
      expect(mocked.roster).toHaveBeenLastCalledWith("2026-11-30"),
    );
    await fireEvent.press(await screen.findByLabelText("Previous week"));
    await waitFor(() =>
      expect(mocked.roster).toHaveBeenLastCalledWith("2026-11-23"),
    );
  });

  test("an empty roster explains itself", async () => {
    mocked.roster.mockResolvedValue(roster({ rows: [], scope: "own" }));
    await renderWithClient(<RosterScreen />);
    expect(await screen.findByText("No roster to show")).toBeTruthy();
    expect(screen.getByText(/not linked to a stylist profile/)).toBeTruthy();
  });

  test("a failed load can be retried", async () => {
    mocked.roster.mockRejectedValueOnce(
      new ApiRequestError(500, "internal", "Something went wrong."),
    );
    mocked.roster.mockResolvedValue(roster());
    await renderWithClient(<RosterScreen />);
    await fireEvent.press(await screen.findByText("Try again"));
    expect(await screen.findByText("Ryan")).toBeTruthy();
  });
});
