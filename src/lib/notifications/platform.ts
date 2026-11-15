import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { api } from "@/lib/api";
import { tokenStore } from "@/lib/auth/token-store";
import {
  registerForPush,
  type PermissionState,
  type RegistrationDeps,
} from "./registration";

const toState = (
  p: Notifications.NotificationPermissionsStatus,
): PermissionState =>
  p.granted ? "granted" : p.canAskAgain ? "undetermined" : "denied";

/** The real phone, wired to registerForPush. */
export function registerThisPhone() {
  const deps: RegistrationDeps = {
    isPhysicalDevice: Device.isDevice,
    projectId:
      (Constants.expoConfig?.extra?.eas as { projectId?: string } | undefined)
        ?.projectId ??
      Constants.easConfig?.projectId ??
      null,
    getPermission: async () =>
      toState(await Notifications.getPermissionsAsync()),
    requestPermission: async () =>
      toState(await Notifications.requestPermissionsAsync()),
    getToken: async (projectId) =>
      (await Notifications.getExpoPushTokenAsync({ projectId })).data,
    registerWithServer: async (token) => {
      await api.registerDevice(token);
    },
    rememberToken: tokenStore.writePushToken,
  };
  return registerForPush(deps);
}

/** On sign-out: stop notifying this phone, then forget the token. Never blocks signing out. */
export async function unregisterThisPhone(): Promise<void> {
  const token = await tokenStore.readPushToken();
  if (token) {
    try {
      await api.removeDevice(token);
    } catch {
      // Offline or already signed out: the server drops dead tokens itself when delivery fails.
    }
  }
  await tokenStore.clearPushToken();
}
