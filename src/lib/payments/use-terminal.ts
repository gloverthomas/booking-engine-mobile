import {
  useStripeTerminal,
  type PaymentIntent,
} from "@stripe/stripe-terminal-react-native";
import { useEffect, useMemo, useRef } from "react";
import { config } from "@/lib/config";
import type { SdkError, TerminalPort } from "./tap-to-pay";

const asError = (
  error: { code?: string; message?: string } | undefined,
): SdkError | undefined =>
  error
    ? { code: String(error.code ?? ""), message: error.message }
    : undefined;

/**
 * The only place the real Stripe Terminal SDK is touched. Everything it returns is mapped onto
 * TerminalPort, which is what the tested payment logic works against.
 */
export function useTerminalPort() {
  const terminal = useStripeTerminal();
  // The SDK's connected-reader value changes between renders; read it fresh at call time.
  const connected = useRef(terminal.connectedReader);
  useEffect(() => {
    connected.current = terminal.connectedReader;
  }, [terminal.connectedReader]);

  const {
    easyConnect,
    retrievePaymentIntent,
    collectPaymentMethod,
    confirmPaymentIntent,
  } = terminal;

  const port = useMemo<TerminalPort>(
    () => ({
      isConnected: () => connected.current != null,
      async connect(locationId) {
        const result = await easyConnect({
          discoveryMethod: "tapToPay",
          locationId,
          simulated: config.simulatedReader,
          merchantDisplayName: "Ryan Kennedy Hairdressing",
        });
        return { error: asError(result.error) };
      },
      async retrieve(clientSecret) {
        const result = await retrievePaymentIntent(clientSecret);
        return { error: asError(result.error), value: result.paymentIntent };
      },
      async collect(intent) {
        const result = await collectPaymentMethod({
          paymentIntent: intent as PaymentIntent.Type,
        });
        return { error: asError(result.error), value: result.paymentIntent };
      },
      async confirm(intent) {
        const result = await confirmPaymentIntent({
          paymentIntent: intent as PaymentIntent.Type,
        });
        return { error: asError(result.error), value: result.paymentIntent };
      },
    }),
    [
      easyConnect,
      retrievePaymentIntent,
      collectPaymentMethod,
      confirmPaymentIntent,
    ],
  );

  return {
    port,
    cancelCollect: terminal.cancelCollectPaymentMethod,
    initialize: terminal.initialize,
  };
}
