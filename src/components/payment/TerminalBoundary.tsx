import {
  StripeTerminalProvider,
  useStripeTerminal,
} from "@stripe/stripe-terminal-react-native";
import { useEffect, type PropsWithChildren } from "react";
import { api } from "@/lib/api";

/** The SDK asks for a fresh connection token whenever it needs one; the server mints it per request. */
async function fetchConnectionToken(): Promise<string> {
  const { secret } = await api.connectionToken();
  return secret;
}

function Initialise() {
  const { initialize } = useStripeTerminal();
  useEffect(() => {
    void initialize();
  }, [initialize]);
  return null;
}

/** Wrap the signed-in part of the app: the token provider needs an authenticated session. */
export function TerminalBoundary({ children }: PropsWithChildren) {
  return (
    <StripeTerminalProvider
      tokenProvider={fetchConnectionToken}
      // Error messages from the SDK are shown to the person at the till: use Australian English.
      localeConfig={{ type: "hardcoded", locale: "en-AU" }}
    >
      <>
        <Initialise />
        {children}
      </>
    </StripeTerminalProvider>
  );
}
