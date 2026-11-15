import * as SecureStore from "expo-secure-store";

const KEY = "hairmate.session";

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
};
