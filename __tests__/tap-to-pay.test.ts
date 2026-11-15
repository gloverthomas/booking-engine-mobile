import type { CardPayment, CardPaymentStatus } from "@/lib/api/schemas";
import {
  describeSdkError,
  isCancellation,
  takeTapToPayPayment,
  type PaymentApi,
  type Stage,
  type TerminalPort,
} from "@/lib/payments/tap-to-pay";

const PAYMENT: CardPayment = {
  paymentId: "pay1",
  paymentIntentId: "pi_1",
  clientSecret: "pi_1_secret",
  amountCents: 4750,
};
const status = (s: CardPaymentStatus["status"]): CardPaymentStatus => ({
  status: s,
  bookingStatus: s === "succeeded" ? "completed" : "confirmed",
  balanceDueCents: s === "succeeded" ? 0 : 4750,
});

function fakes(
  overrides: {
    terminal?: Partial<TerminalPort>;
    api?: Partial<PaymentApi>;
  } = {},
) {
  const calls: string[] = [];
  const terminal: TerminalPort = {
    isConnected: () => false,
    connect: jest.fn(async () => (calls.push("connect"), {})),
    retrieve: jest.fn(
      async () => (calls.push("retrieve"), { value: { id: "intent" } }),
    ),
    collect: jest.fn(
      async () => (calls.push("collect"), { value: { id: "collected" } }),
    ),
    confirm: jest.fn(
      async () => (calls.push("confirm"), { value: { id: "confirmed" } }),
    ),
    ...overrides.terminal,
  };
  const api: PaymentApi = {
    start: jest.fn(async () => (calls.push("start"), PAYMENT)),
    status: jest.fn(async () => (calls.push("status"), status("succeeded"))),
    ...overrides.api,
  };
  const stages: Stage[] = [];
  const run = (extra = {}) =>
    takeTapToPayPayment({
      bookingId: "B1",
      locationId: "tml_1",
      terminal,
      api,
      onStage: (s) => stages.push(s),
      sleep: async () => undefined,
      poll: { attempts: 3, delayMs: 0 },
      ...extra,
    });
  return { terminal, api, calls, stages, run };
}

describe("a successful payment", () => {
  test("goes through each step in order and ends paid", async () => {
    const f = fakes();
    expect(await f.run()).toEqual({ kind: "paid" });
    expect(f.calls).toEqual([
      "start",
      "connect",
      "retrieve",
      "collect",
      "confirm",
      "status",
    ]);
    expect(f.stages).toEqual([
      "starting",
      "connecting",
      "ready",
      "processing",
      "confirming",
    ]);
  });

  test("connects to the salon's Stripe location, and passes the intent along", async () => {
    const f = fakes();
    await f.run();
    expect(f.terminal.connect).toHaveBeenCalledWith("tml_1");
    expect(f.terminal.retrieve).toHaveBeenCalledWith("pi_1_secret");
    expect(f.terminal.collect).toHaveBeenCalledWith({ id: "intent" });
    expect(f.terminal.confirm).toHaveBeenCalledWith({ id: "collected" });
  });

  test("an already connected reader is not connected again", async () => {
    const f = fakes({ terminal: { isConnected: () => true } });
    await f.run();
    expect(f.terminal.connect).not.toHaveBeenCalled();
    expect(f.stages).not.toContain("connecting");
  });

  test("waits for the server to record it, retrying until it has", async () => {
    const results = ["pending", "pending", "succeeded"] as const;
    let n = 0;
    const f = fakes({
      api: { status: jest.fn(async () => status(results[n++])) },
    });
    expect(await f.run({ poll: { attempts: 5, delayMs: 0 } })).toEqual({
      kind: "paid",
    });
    expect(n).toBe(3);
  });

  test("a failed status check does not undo the payment; it keeps waiting", async () => {
    let n = 0;
    const f = fakes({
      api: {
        status: jest.fn(async () => {
          if (n++ === 0) throw new Error("offline");
          return status("succeeded");
        }),
      },
    });
    expect(await f.run({ poll: { attempts: 3, delayMs: 0 } })).toEqual({
      kind: "paid",
    });
  });

  test("if the server is slow to record it, the app says so rather than claiming failure", async () => {
    const f = fakes({
      api: { status: jest.fn(async () => status("pending")) },
    });
    expect(await f.run()).toEqual({ kind: "recording" });
    expect(f.api.status).toHaveBeenCalledTimes(3);
  });

  test("stops waiting when the person leaves the screen", async () => {
    const f = fakes({
      api: { status: jest.fn(async () => status("pending")) },
    });
    expect(await f.run({ isCancelled: () => true })).toEqual({
      kind: "recording",
    });
    expect(f.api.status).not.toHaveBeenCalled();
  });
});

describe("things going wrong before any money moves", () => {
  test("the server refusing to start the payment is shown, and nothing else runs", async () => {
    const f = fakes({
      api: {
        start: jest.fn(async () => {
          throw new Error("Nothing is owing on this booking");
        }),
      },
    });
    expect(await f.run()).toEqual({
      kind: "failed",
      message: "Nothing is owing on this booking",
    });
    expect(f.terminal.connect).not.toHaveBeenCalled();
  });

  test("the reader failing to connect stops the payment", async () => {
    const f = fakes({
      terminal: {
        connect: jest.fn(async () => ({
          error: { message: "Tap to Pay is not available on this iPhone." },
        })),
      },
    });
    expect(await f.run()).toEqual({
      kind: "failed",
      message: "Tap to Pay is not available on this iPhone.",
    });
    expect(f.terminal.retrieve).not.toHaveBeenCalled();
  });

  test("the customer cancelling is a cancellation, not an error", async () => {
    const f = fakes({
      terminal: {
        collect: jest.fn(async () => ({
          error: { code: "CANCELED", message: "Canceled" },
        })),
      },
    });
    expect(await f.run()).toEqual({ kind: "cancelled" });
    expect(f.terminal.confirm).not.toHaveBeenCalled();
  });

  test("a declined card says so in plain words, and is not confirmed", async () => {
    const f = fakes({
      terminal: {
        confirm: jest.fn(async () => ({
          error: { code: "CARD_DECLINED", message: "Your card was declined." },
        })),
      },
    });
    expect(await f.run()).toEqual({
      kind: "failed",
      message: "The card was declined. Try another card.",
    });
    expect(f.api.status).not.toHaveBeenCalled();
  });

  test("a missing intent from the SDK is treated as a failure, never as success", async () => {
    const f = fakes({ terminal: { retrieve: jest.fn(async () => ({})) } });
    expect((await f.run()).kind).toBe("failed");
  });
});

describe("describeSdkError and isCancellation", () => {
  test.each([
    [{ code: "CARD_DECLINED" }, "The card was declined. Try another card."],
    [
      { message: "PIN required" },
      "This card needs a PIN or another way to pay. Try another card.",
    ],
    [
      { message: "Network request failed" },
      "There is no connection right now. Check your signal and try again.",
    ],
    [{ message: "Reader is busy" }, "Reader is busy"],
    [undefined, "The payment did not go through. Nothing was charged."],
    [{ message: "  " }, "The payment did not go through. Nothing was charged."],
  ])("%j", (error, text) => expect(describeSdkError(error)).toBe(text));

  test("recognises cancellation by code or message, case-insensitively", () => {
    expect(isCancellation({ code: "CANCELED" })).toBe(true);
    expect(
      isCancellation({ message: "Payment was cancelled by the user" }),
    ).toBe(true);
    expect(isCancellation({ message: "Declined" })).toBe(false);
    expect(isCancellation(undefined)).toBe(false);
  });
});
