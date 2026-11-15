/**
 * Build-time configuration. EXPO_PUBLIC_* values are inlined into the bundle, so nothing secret goes here:
 * a base URL and OAuth client ids are public by design.
 */
export const config = {
  apiUrl: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000",
  googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? "",
  /** Optional. When set, Google issues ID tokens for the web client; the server accepts either. */
  googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "",
  /** Use Stripe's simulated reader (works in the iOS Simulator, with test keys). Development builds only. */
  simulatedReader: __DEV__ && process.env.EXPO_PUBLIC_SIMULATED_READER === "1",
  /** A sign-in that skips Google, for development builds against staging. Never true in a release build. */
  devSignIn: __DEV__ && process.env.EXPO_PUBLIC_DEV_SIGN_IN === "1",
} as const;
