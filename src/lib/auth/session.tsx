import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { api, sessionBridge } from "../api";
import { NetworkError, messageFor } from "../api/client";
import type { Me } from "../api/schemas";
import { signInWithGoogle, signOutOfGoogle } from "./google";
import { tokenStore } from "./token-store";

export type SessionState =
  | { status: "loading" }
  | { status: "signedOut"; notice?: string }
  /** A saved token exists but the server cannot be reached to check it. */
  | { status: "offline" }
  | { status: "signedIn"; me: Me };

export interface SessionApi {
  state: SessionState;
  /** Native Google sign-in, then exchange for a session. Returns an error message to show, or null. */
  signInWithGoogle: () => Promise<string | null>;
  /** Development builds only: use a token copied from staging. */
  signInWithToken: (token: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  retry: () => void;
}

const Context = createContext<SessionApi | null>(null);

export function useSession(): SessionApi {
  const value = use(Context);
  if (!value)
    throw new Error("useSession must be used inside <SessionProvider>");
  return value;
}

/** The signed-in person. Only call from screens that are behind the sign-in gate. */
export function useMe(): Me {
  const { state } = useSession();
  if (state.status !== "signedIn")
    throw new Error("useMe called while signed out");
  return state.me;
}

export function SessionProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<SessionState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const queryClient = useQueryClient();

  const endSession = useCallback(
    async (notice?: string) => {
      sessionBridge.setToken(null);
      await tokenStore.clear();
      queryClient.clear();
      setState({ status: "signedOut", notice });
    },
    [queryClient],
  );

  // The server said 401 on a request that carried our token: the session ended (signed out elsewhere,
  // expired, or the person was removed from the team).
  useEffect(() => {
    sessionBridge.onEnded(() => {
      void endSession("Your session ended. Please sign in again.");
    });
  }, [endSession]);

  // On launch (and on retry): load the saved token and check it with the server.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = await tokenStore.read();
      if (!saved) {
        if (!cancelled) setState({ status: "signedOut" });
        return;
      }
      sessionBridge.setToken(saved);
      try {
        const me = await api.me();
        if (!cancelled) setState({ status: "signedIn", me });
      } catch (error) {
        if (cancelled) return;
        if (error instanceof NetworkError) setState({ status: "offline" });
        // A 401 already ended the session through the bridge; anything else is a real failure.
        else
          setState((s) =>
            s.status === "loading" ? { status: "signedOut" } : s,
          );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const adopt = useCallback(async (token: string): Promise<string | null> => {
    sessionBridge.setToken(token);
    try {
      const me = await api.me();
      await tokenStore.write(token);
      setState({ status: "signedIn", me });
      return null;
    } catch (error) {
      sessionBridge.setToken(null);
      return messageFor(error);
    }
  }, []);

  const value = useMemo<SessionApi>(
    () => ({
      state,
      async signInWithGoogle() {
        const google = await signInWithGoogle();
        if (google.status === "cancelled") return null;
        if (google.status === "error") return google.message;
        try {
          const result = await api.signInWithGoogle(google.idToken);
          return await adopt(result.token);
        } catch (error) {
          await signOutOfGoogle();
          return messageFor(error);
        }
      },
      signInWithToken: (token) => adopt(token.trim()),
      async signOut() {
        try {
          await api.signOut();
        } catch {
          // Offline or already ended: we still forget the token on this phone.
        }
        await signOutOfGoogle();
        await endSession();
      },
      retry: () => {
        setState({ status: "loading" });
        setAttempt((n) => n + 1);
      },
    }),
    [state, adopt, endSession],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}
