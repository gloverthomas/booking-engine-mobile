import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";
import { api } from "@/lib/api";
import { ApiRequestError } from "@/lib/api/client";
import type { RescheduleSlots } from "@/lib/api/schemas";
import { ME as mockMe, booking, renderWithClient } from "./helpers";

jest.mock("@/lib/api", () => ({
  api: {
    booking: jest.fn(),
    rescheduleSlots: jest.fn(),
    reschedule: jest.fn(),
  },
  sessionBridge: { setToken: jest.fn(), onEnded: jest.fn() },
}));
jest.mock("@/lib/auth/session", () => ({
  useMe: () => mockMe,
  useSession: jest.fn(),
}));

const mockBack = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), back: mockBack, replace: jest.fn() }),
  useLocalSearchParams: () => ({ id: "B1" }),
}));

import RescheduleScreen from "@/app/(app)/booking/reschedule/[id]";

const mocked = api as unknown as Record<keyof typeof api, jest.Mock>;
const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);

// The booking starts at 10:00 am Melbourne (23:00Z the day before).
const NOW_SLOT = "2026-11-24T23:00:00.000Z";
const LATER = "2026-11-24T23:15:00.000Z"; // 10:15 am
const NOON = "2026-11-25T01:00:00.000Z"; // 12:00 pm

const slots = (overrides: Partial<RescheduleSlots> = {}): RescheduleSlots => ({
  current: { start: NOW_SLOT, end: "2026-11-24T23:45:00.000Z" },
  slots: [NOW_SLOT, LATER, NOON].map((start) => ({
    staffId: "S1",
    start,
    end: start,
  })),
  reason: null,
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  mocked.booking.mockResolvedValue(booking());
  mocked.rescheduleSlots.mockResolvedValue(slots());
  mocked.reschedule.mockResolvedValue({});
});

describe("Reschedule", () => {
  test("shows where the appointment is now and the times it could move to, marking the current one", async () => {
    await renderWithClient(<RescheduleScreen />);
    expect(await screen.findByText(/Now .* at 10:00 am/)).toBeTruthy();
    expect(await screen.findByText("10:00 am (now)")).toBeTruthy();
    expect(screen.getByText("10:15 am")).toBeTruthy();
    expect(screen.getByText("12:00 pm")).toBeTruthy();
    expect(screen.getByText("Choose a different time")).toBeTruthy();
  });

  test("asks the server for the appointment's own slots, for one day", async () => {
    await renderWithClient(<RescheduleScreen />);
    await screen.findByText("10:15 am");
    const [id, from, to] = mocked.rescheduleSlots.mock.calls[0];
    expect(id).toBe("B1");
    expect(from).toBe(to);
    expect(from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test("choosing the time it is already at is not a move", async () => {
    await renderWithClient(<RescheduleScreen />);
    await fireEvent.press(await screen.findByText("10:00 am (now)"));
    expect(screen.getByText("Choose a different time")).toBeTruthy();
    expect(mocked.reschedule).not.toHaveBeenCalled();
  });

  test("moving sends the new time and tells the client by default, then closes", async () => {
    await renderWithClient(<RescheduleScreen />);
    await fireEvent.press(await screen.findByText("10:15 am"));
    await fireEvent.press(await screen.findByText(/^Move to .* at 10:15 am$/));
    await waitFor(() =>
      expect(mocked.reschedule).toHaveBeenCalledWith("B1", LATER, true),
    );
    await waitFor(() => expect(mockBack).toHaveBeenCalled());
  });

  test("a quiet change does not tell the client", async () => {
    await renderWithClient(<RescheduleScreen />);
    await fireEvent(
      await screen.findByLabelText("Tell the client"),
      "valueChange",
      false,
    );
    await fireEvent.press(await screen.findByText("12:00 pm"));
    await fireEvent.press(await screen.findByText(/^Move to .* at 12:00 pm$/));
    await waitFor(() =>
      expect(mocked.reschedule).toHaveBeenCalledWith("B1", NOON, false),
    );
  });

  test("if the time was just taken, it says why, clears the choice and reloads the times", async () => {
    mocked.reschedule.mockRejectedValue(
      new ApiRequestError(
        409,
        "slot_taken",
        "That time is no longer available",
      ),
    );
    await renderWithClient(<RescheduleScreen />);
    await fireEvent.press(await screen.findByText("10:15 am"));
    await fireEvent.press(await screen.findByText(/^Move to .* at 10:15 am$/));
    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(
        "Couldn't move it",
        "That time is no longer available",
      ),
    );
    expect(await screen.findByText("Choose a different time")).toBeTruthy();
    expect(mockBack).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(mocked.rescheduleSlots.mock.calls.length).toBeGreaterThan(1),
    );
  });

  test("a service outside the catalogue gets an honest message and no time buttons", async () => {
    mocked.rescheduleSlots.mockResolvedValue(
      slots({ slots: [], reason: "services_not_in_catalogue" }),
    );
    await renderWithClient(<RescheduleScreen />);
    expect(await screen.findByText("Times can’t be suggested")).toBeTruthy();
    expect(
      screen.getByText(/Move it from the calendar on the web/),
    ).toBeTruthy();
    expect(screen.queryByText("Nothing free that day")).toBeNull();
  });

  test("a day with nothing free says so", async () => {
    mocked.rescheduleSlots.mockResolvedValue(slots({ slots: [] }));
    await renderWithClient(<RescheduleScreen />);
    expect(await screen.findByText("Nothing free that day")).toBeTruthy();
  });

  test("an appointment that cannot be moved says so instead of showing times", async () => {
    mocked.booking.mockResolvedValue(
      booking({
        allowed: {
          move: false,
          cancel: false,
          noShow: false,
          checkout: false,
          resend: false,
          reassign: false,
          refund: false,
        },
      }),
    );
    await renderWithClient(<RescheduleScreen />);
    expect(
      await screen.findByText("This appointment can't be moved"),
    ).toBeTruthy();
    expect(mocked.rescheduleSlots).not.toHaveBeenCalled();
  });

  test("a failed load can be retried", async () => {
    mocked.booking.mockRejectedValueOnce(
      new ApiRequestError(500, "internal", "Something went wrong."),
    );
    await renderWithClient(<RescheduleScreen />);
    await fireEvent.press(await screen.findByText("Try again"));
    expect(await screen.findByText(/Now .* at 10:00 am/)).toBeTruthy();
  });
});
