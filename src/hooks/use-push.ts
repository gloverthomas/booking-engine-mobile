import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  bookingIdFromNotification,
  type RegistrationResult,
} from "@/lib/notifications/registration";
import { registerThisPhone } from "@/lib/notifications/platform";

// Show notifications that arrive while the app is open, as a banner.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/** Register this phone once per sign-in, and report how it went (the Account screen shows it). */
export function usePushRegistration(): RegistrationResult | null {
  const [result, setResult] = useState<RegistrationResult | null>(null);
  useEffect(() => {
    let cancelled = false;
    void registerThisPhone().then((r) => {
      if (!cancelled) setResult(r);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return result;
}

/** Tapping a notification opens the appointment it is about, including when it launched the app. */
export function useNotificationTaps() {
  const router = useRouter();
  const last = Notifications.useLastNotificationResponse();
  useEffect(() => {
    if (
      !last ||
      last.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER
    )
      return;
    const id = bookingIdFromNotification(
      last.notification.request.content.data,
    );
    if (id) router.push({ pathname: "/booking/[id]", params: { id } });
    void Notifications.clearLastNotificationResponseAsync();
  }, [last, router]);
}
