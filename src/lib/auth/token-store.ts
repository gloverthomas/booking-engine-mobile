import * as SecureStore from "expo-secure-store";

const KEY = "hairmate.session";
const PUSH_KEY = "hairmate.pushToken";

/** The session token lives in the iOS Keychain, never in AsyncStorage or the bundle. */
export const tokenStore = {
  async read(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(KEY);
    } catch {
      return null;
    }
  },
  async write(token: string): Promise<void> {
    await SecureStore.setItemAsync(KEY, token, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
    });
  },
  async clear(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(KEY);
    } catch {
      // Nothing stored, or the keychain is unavailable: either way there is no token to keep.
    }
  },

  /** The push token this phone registered, so sign-out can tell the server to stop notifying it. */
  async readPushToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(PUSH_KEY);
    } catch {
      return null;
    }
  },
  async writePushToken(token: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(PUSH_KEY, token);
    } catch {
      // The phone still gets notifications; sign-out just cannot tell the server to stop.
    }
  },
  async clearPushToken(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(PUSH_KEY);
    } catch {
      // Nothing stored.
    }
  },
};
