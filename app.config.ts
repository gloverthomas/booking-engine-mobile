import type { ExpoConfig } from "expo/config";

/**
 * The iOS OAuth client id looks like 1234-abcd.apps.googleusercontent.com. Google Sign-In needs its
 * reversed form registered as a URL scheme. Until the client exists the placeholder keeps `expo config`
 * and type checks working; sign-in then shows "not set up in this build yet".
 */
const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? "";
const iosUrlScheme = iosClientId
  ? `com.googleusercontent.apps.${iosClientId.replace(".apps.googleusercontent.com", "")}`
  : "com.googleusercontent.apps.not-configured";

/**
 * Apple's Tap to Pay on iPhone entitlement. Only add it once Apple has granted it for this app: a build
 * that declares an entitlement the provisioning profile lacks fails to sign. Until then the simulated
 * reader still works for development (EXPO_PUBLIC_SIMULATED_READER=1).
 */
const tapToPayEntitled = process.env.TAP_TO_PAY_ENTITLED === "1";

const config: ExpoConfig = {
  name: "HairMate",
  slug: "hairmate",
  version: "0.1.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "hairmate",
  userInterfaceStyle: "automatic",
  platforms: ["ios"],
  ios: {
    // Placeholder until Ryan's Apple Developer account exists; the bundle id is registered there.
    bundleIdentifier: "world.hairmate.app",
    supportsTablet: false,
    icon: "./assets/expo.icon",
    ...(tapToPayEntitled
      ? {
          entitlements: {
            "com.apple.developer.proximity-reader.payment.acceptance": true,
          },
        }
      : {}),
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSFaceIDUsageDescription: "Unlock HairMate with Face ID.",
    },
  },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        backgroundColor: "#fff8f1",
        image: "./assets/images/splash-icon.png",
        imageWidth: 76,
      },
    ],
    "expo-secure-store",
    "expo-notifications",
    "expo-local-authentication",
    [
      // The plugin throws if it is given no options object at all.
      "@stripe/stripe-terminal-react-native",
      {
        locationWhenInUsePermission:
          "HairMate uses your location to take card payments.",
      },
    ],
    ["@react-native-google-signin/google-signin", { iosUrlScheme }],
  ],
  experiments: { typedRoutes: true, reactCompiler: true },
};

export default config;
