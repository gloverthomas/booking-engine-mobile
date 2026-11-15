import {
  GoogleSignin,
  isErrorWithCode,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import { config } from "../config";

let configured = false;

function ensureConfigured() {
  if (configured) return;
  GoogleSignin.configure({
    iosClientId: config.googleIosClientId || undefined,
    webClientId: config.googleWebClientId || undefined,
    scopes: ["email", "profile"],
  });
  configured = true;
}

export type GoogleResult =
  | { status: "ok"; idToken: string }
  | { status: "cancelled" }
  | { status: "error"; message: string };

/** Native Google sign-in. Returns the ID token the server exchanges for a session. */
export async function signInWithGoogle(): Promise<GoogleResult> {
  if (!config.googleIosClientId) {
    return {
      status: "error",
      message: "Google sign-in is not set up in this build yet.",
    };
  }
  try {
    ensureConfigured();
    await GoogleSignin.hasPlayServices();
    const result = await GoogleSignin.signIn();
    if (result.type !== "success" || !result.data.idToken)
      return { status: "cancelled" };
    return { status: "ok", idToken: result.data.idToken };
  } catch (error) {
    if (
      isErrorWithCode(error) &&
      error.code === statusCodes.SIGN_IN_CANCELLED
    ) {
      return { status: "cancelled" };
    }
    return {
      status: "error",
      message: "Google sign-in did not complete. Please try again.",
    };
  }
}

export async function signOutOfGoogle(): Promise<void> {
  try {
    ensureConfigured();
    await GoogleSignin.signOut();
  } catch {
    // Not signed in with Google on this device; nothing to clear.
  }
}
