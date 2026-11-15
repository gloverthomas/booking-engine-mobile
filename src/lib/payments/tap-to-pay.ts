import type { CardPayment, CardPaymentStatus } from "@/lib/api/schemas";

/**
 * Taking a card with Tap to Pay, as a sequence of steps the screen can narrate. All Stripe SDK calls go
 * through `TerminalPort`, so this logic is tested with a fake reader and the real SDK is only touched by
 * the thin adapter in use-terminal.ts.
 */

export type Stage =
  | "starting" // asking the server to open the payment
  | "connecting" // preparing the iPhone's built-in reader
  | "ready" // waiting for the card
  | "processing" // card read, Stripe is authorising
  | "confirming"; // authorised, waiting for the server to record it

export type Outcome =
  | { kind: "paid" }
  | { kind: "recording" } // taken by Stripe; the server has not finished recording it yet
  | { kind: "cancelled" }
  | { kind: "failed"; message: string };

export interface SdkError {
  code?: string;
  message?: string;
}

interface Result<T> {
  error?: SdkError;
  value?: T;
}

/** What we need from the Stripe Terminal SDK. The adapter maps the real hook onto this. */
export interface TerminalPort {
  isConnected(): boolean;
  connect(locationId: string): Promise<Result<void>>;
  retrieve(clientSecret: string): Promise<Result<unknown>>;
  collect(intent: unknown): Promise<Result<unknown>>;
  confirm(intent: unknown): Promise<Result<unknown>>;
}

export interface PaymentApi {
  start(bookingId: string): Promise<CardPayment>;
  status(bookingId: string, paymentId: string): Promise<CardPaymentStatus>;
}

export interface TapToPayInput {
  bookingId: string;
  locationId: string;
  terminal: TerminalPort;
  api: PaymentApi;
  onStage: (stage: Stage) => void;
  /** Polling for the server to record the payment. */
  poll?: { attempts: number; delayMs: number };
  sleep?: (ms: number) => Promise<void>;
  isCancelled?: () => boolean;
}

const DEFAULT_POLL = { attempts: 15, delayMs: 1000 };
const realSleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Stripe reports a cancelled collection as an error; that is not a failure. */
export function isCancellation(error: SdkError | undefined): boolean {
  return /cancel/i.test(`${error?.code ?? ""} ${error?.message ?? ""}`);
}

/** Words for the person at the till. The SDK's own messages are kept when they are readable. */
export function describeSdkError(error: SdkError | undefined): string {
  const text = `${error?.code ?? ""} ${error?.message ?? ""}`.toLowerCase();
  if (/declin/.test(text)) return "The card was declined. Try another card.";
  if (/pin/.test(text))
    return "This card needs a PIN or another way to pay. Try another card.";
  if (/network|internet|connect/.test(text)) {
    return "There is no connection right now. Check your signal and try again.";
  }
  return (
    error?.message?.trim() ||
    "The payment did not go through. Nothing was charged."
  );
}

export async function takeTapToPayPayment(
  input: TapToPayInput,
): Promise<Outcome> {
  const { terminal, api, bookingId, onStage } = input;
  const sleep = input.sleep ?? realSleep;
  const poll = input.poll ?? DEFAULT_POLL;

  const failed = (error: SdkError | undefined): Outcome =>
    isCancellation(error)
      ? { kind: "cancelled" }
      : { kind: "failed", message: describeSdkError(error) };

  onStage("starting");
  let payment: CardPayment;
  try {
    payment = await api.start(bookingId);
  } catch (error) {
    return {
      kind: "failed",
      message:
        error instanceof Error ? error.message : "Could not start the payment.",
    };
  }

  if (!terminal.isConnected()) {
    onStage("connecting");
    const connected = await terminal.connect(input.locationId);
    if (connected.error) return failed(connected.error);
  }

  const retrieved = await terminal.retrieve(payment.clientSecret);
  if (retrieved.error || !retrieved.value) return failed(retrieved.error);

  onStage("ready");
  const collected = await terminal.collect(retrieved.value);
  if (collected.error || !collected.value) return failed(collected.error);

  onStage("processing");
  const confirmed = await terminal.confirm(collected.value);
  if (confirmed.error) return failed(confirmed.error);

  // The money has moved. Wait for the server (Stripe's webhook) to record it and close the appointment.
  onStage("confirming");
  for (let attempt = 0; attempt < poll.attempts; attempt += 1) {
    if (input.isCancelled?.()) break;
    try {
      const status = await api.status(bookingId, payment.paymentId);
      if (status.status === "succeeded") return { kind: "paid" };
    } catch {
      // A blip on the network does not undo the payment; keep waiting.
    }
    await sleep(poll.delayMs);
  }
  return { kind: "recording" };
}
