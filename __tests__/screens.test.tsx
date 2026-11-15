import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import { Alert, Linking } from "react-native";
import { api } from "@/lib/api";
import { ApiRequestError } from "@/lib/api/client";
import { ME as mockMe, RESOURCES, booking, renderWithClient } from "./helpers";

jest.mock("@/lib/api", () => ({
  api: {
    calendar: jest.fn(),
    resources: jest.fn(),
    booking: jest.fn(),
    cancelBooking: jest.fn(),
    markNoShow: jest.fn(),
    checkout: jest.fn(),
    terminalConfig: jest.fn(),
    clock: jest.fn(),
  },
  sessionBridge: { setToken: jest.fn(), onEnded: jest.fn() },
}));
jest.mock("@/lib/auth/session", () => ({
  useMe: () => mockMe,
  useSession: jest.fn(),
}));

const mockBack = jest.fn();
const mockPush = jest.fn();
jest.mock("expo-router", () => {
  const { View } = jest.requireActual("react-native");
  return {
    Link: ({ children }: { children: unknown }) => children,
    useRouter: () => ({ push: mockPush, back: mockBack, replace: jest.fn() }),
    useLocalSearchParams: () => ({ id: "B1" }),
    Stack: { Screen: View },
  };
});

import BookingScreen from "@/app/(app)/booking/[id]";
import Today from "@/app/(app)/(tabs)/index";

const mocked = api as unknown as Record<keyof typeof api, jest.Mock>;
const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);

beforeEach(() => {
  jest.clearAllMocks();
  mocked.resources.mockResolvedValue(RESOURCES);
  mocked.terminalConfig.mockResolvedValue({
    configured: false,
    locationId: null,
  });
});

/** The buttons of the most recent Alert, by label. */
function lastAlertButton(label: string) {
  const buttons = alertSpy.mock.calls.at(-1)?.[2] ?? [];
  const found = buttons.find((b) => b.text === label);
  if (!found)
    throw new Error(
      `No "${label}" button in the alert (${buttons.map((b) => b.text).join(", ")})`,
    );
  return found;
}

/** Press a button of the latest Alert the way the OS would, inside React's act scope. */
async function pressAlert(label: string) {
  const button = lastAlertButton(label);
  await act(async () => {
    button.onPress?.();
  });
}

describe("Today", () => {
  const event = (
    id: string,
    start: string,
    end: string,
    name: string,
    status = "confirmed",
  ) => ({
    kind: "booking",
    id,
    start,
    end,
    staffId: "S2",
    locationId: "L1",
    status,
    clientId: `c-${id}`,
    clientName: name,
    services: ["Cut"],
    totalCents: 9500,
    source: "online",
  });

  test("lists the day in time order with the stylist, and counts only live appointments", async () => {
    mocked.calendar.mockResolvedValue({
      events: [
        event(
          "b2",
          "2026-11-24T01:00:00.000Z",
          "2026-11-24T01:45:00.000Z",
          "Later Client",
        ),
        event(
          "b1",
          "2026-11-23T23:00:00.000Z",
          "2026-11-23T23:45:00.000Z",
          "Early Client",
        ),
        event(
          "b3",
          "2026-11-24T03:00:00.000Z",
          "2026-11-24T03:45:00.000Z",
          "Cancelled Client",
          "cancelled_by_staff",
        ),
        {
          kind: "block",
          id: "k1",
          start: "2026-11-24T05:00:00.000Z",
          end: "2026-11-24T06:00:00.000Z",
          staffId: "S2",
          reason: "Lunch",
        },
      ],
    });
    await renderWithClient(<Today />);

    expect(await screen.findByText("Early Client")).toBeTruthy();
    const names = screen.getAllByText(/Client$/).map((n) => n.props.children);
    expect(names.slice(0, 2)).toEqual(["Early Client", "Later Client"]);
    expect(screen.getByText("Lunch")).toBeTruthy();
    expect(screen.getByText("Cancelled")).toBeTruthy();
    expect(screen.getByText(/2 appointments/)).toBeTruthy();
    expect(screen.getAllByText("Alex").length).toBeGreaterThan(0);
  });

  test("an empty day says so", async () => {
    mocked.calendar.mockResolvedValue({ events: [] });
    await renderWithClient(<Today />);
    expect(await screen.findByText("Nothing booked")).toBeTruthy();
  });

  test("a failed load shows a readable error with a retry", async () => {
    mocked.calendar.mockRejectedValue(
      new ApiRequestError(
        500,
        "internal",
        "Something went wrong. Please try again.",
      ),
    );
    await renderWithClient(<Today />);
    expect(await screen.findByText("That didn’t load")).toBeTruthy();
    expect(screen.getByText("Try again")).toBeTruthy();
  });
});

describe("Appointment", () => {
  test("shows who, when, the money and the notes", async () => {
    mocked.booking.mockResolvedValue(booking());
    await renderWithClient(<BookingScreen />);
    expect(await screen.findByText("Sam Client")).toBeTruthy();
    expect(screen.getByText("Balance due")).toBeTruthy();
    expect(screen.getAllByText("$47.50").length).toBeGreaterThan(0);
    expect(screen.getByText("Bring a photo")).toBeTruthy();
    expect(screen.getByText("Prefers a quiet chair")).toBeTruthy();
    expect(screen.getByText("Cut")).toBeTruthy();
  });

  test("Call opens the dialler with the client's number", async () => {
    mocked.booking.mockResolvedValue(booking());
    const open = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
    await renderWithClient(<BookingScreen />);
    await fireEvent.press(await screen.findByText("Call"));
    expect(open).toHaveBeenCalledWith("tel:+61412345678");
  });

  test("only offers what the server says is allowed", async () => {
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
    await renderWithClient(<BookingScreen />);
    await screen.findByText("Sam Client");
    expect(screen.queryByText("Cancel appointment")).toBeNull();
    expect(screen.queryByText("No-show")).toBeNull();
    expect(screen.queryByText(/as paid/)).toBeNull();
  });

  test("no payment button when nothing is owed", async () => {
    mocked.booking.mockResolvedValue(booking({ balanceDueCents: 0 }));
    await renderWithClient(<BookingScreen />);
    await screen.findByText("Sam Client");
    expect(screen.queryByText(/as paid/)).toBeNull();
  });

  test("cancelling with a deposit asks what to do with it, then sends that choice", async () => {
    mocked.booking.mockResolvedValue(booking());
    mocked.cancelBooking.mockResolvedValue({
      depositAction: "refund",
      feeCents: 0,
    });
    await renderWithClient(<BookingScreen />);
    await fireEvent.press(await screen.findByText("Cancel appointment"));
    expect(alertSpy.mock.calls.at(-1)?.[1]).toContain("$47.50");
    await pressAlert("Cancel and refund deposit");
    await waitFor(() =>
      expect(mocked.cancelBooking).toHaveBeenCalledWith(
        "B1",
        "refund",
        undefined,
      ),
    );
    await waitFor(() =>
      expect(alertSpy.mock.calls.at(-1)?.[0]).toBe("Appointment cancelled"),
    );
    expect(alertSpy.mock.calls.at(-1)?.[1]).toBe(
      "The deposit is being refunded.",
    );
  });

  test("without a deposit there is nothing to decide", async () => {
    mocked.booking.mockResolvedValue(
      booking({ depositCents: 0, paidCents: 0, balanceDueCents: 9500 }),
    );
    await renderWithClient(<BookingScreen />);
    await fireEvent.press(await screen.findByText("Cancel appointment"));
    const labels = (alertSpy.mock.calls.at(-1)?.[2] ?? []).map((b) => b.text);
    expect(labels).toEqual(["Keep it", "Cancel appointment"]);
  });

  test("a no-show is confirmed first, and the fee outcome is reported", async () => {
    mocked.booking.mockResolvedValue(booking());
    mocked.markNoShow.mockResolvedValue({
      depositAction: "keep",
      feeCents: 5000,
    });
    await renderWithClient(<BookingScreen />);
    await fireEvent.press(await screen.findByText("No-show"));
    expect(mocked.markNoShow).not.toHaveBeenCalled();
    await pressAlert("Mark no-show");
    await waitFor(() => expect(mocked.markNoShow).toHaveBeenCalledWith("B1"));
    await waitFor(() =>
      expect(alertSpy.mock.calls.at(-1)?.[0]).toBe("Marked as no-show"),
    );
    expect(alertSpy.mock.calls.at(-1)?.[1]).toContain("$50 fee");
  });

  test("marking paid offers cash, EFTPOS or other", async () => {
    mocked.booking.mockResolvedValue(booking());
    mocked.checkout.mockResolvedValue({});
    await renderWithClient(<BookingScreen />);
    await fireEvent.press(await screen.findByText("Mark $47.50 as paid"));
    await pressAlert("EFTPOS");
    await waitFor(() =>
      expect(mocked.checkout).toHaveBeenCalledWith("B1", "eftpos"),
    );
  });

  test("a refused action tells the user why, in the server's words", async () => {
    mocked.booking.mockResolvedValue(booking());
    mocked.markNoShow.mockRejectedValue(
      new ApiRequestError(
        409,
        "invalid_state",
        "That booking has already finished.",
      ),
    );
    await renderWithClient(<BookingScreen />);
    await fireEvent.press(await screen.findByText("No-show"));
    await pressAlert("Mark no-show");
    await waitFor(() =>
      expect(alertSpy.mock.calls.at(-1)).toEqual([
        "That didn't work",
        "That booking has already finished.",
      ]),
    );
  });

  test("a load failure is shown, not a blank screen", async () => {
    mocked.booking.mockRejectedValue(
      new ApiRequestError(404, "not_found", "That was not found"),
    );
    await renderWithClient(<BookingScreen />);
    expect(await screen.findByText("That was not found")).toBeTruthy();
  });

  test("offers a card payment only when Tap to Pay is set up, and opens the payment screen", async () => {
    mocked.booking.mockResolvedValue(booking());
    mocked.terminalConfig.mockResolvedValue({
      configured: true,
      locationId: "tml_1",
    });
    await renderWithClient(<BookingScreen />);
    await fireEvent.press(await screen.findByText("Take $47.50 by card"));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/booking/pay/[id]",
      params: { id: "B1" },
    });
    // The cash and EFTPOS route stays available.
    expect(screen.getByText("Mark $47.50 as paid")).toBeTruthy();
  });

  test("without Tap to Pay there is no card button, and marking paid is the main action", async () => {
    mocked.booking.mockResolvedValue(booking());
    await renderWithClient(<BookingScreen />);
    await screen.findByText("Mark $47.50 as paid");
    expect(screen.queryByText(/by card/)).toBeNull();
  });

  test("no card button when nothing is owing, even with Tap to Pay set up", async () => {
    mocked.booking.mockResolvedValue(booking({ balanceDueCents: 0 }));
    mocked.terminalConfig.mockResolvedValue({
      configured: true,
      locationId: "tml_1",
    });
    await renderWithClient(<BookingScreen />);
    await screen.findByText("Sam Client");
    expect(screen.queryByText(/by card/)).toBeNull();
  });
});
