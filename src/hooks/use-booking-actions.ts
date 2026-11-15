import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";
import { api } from "@/lib/api";
import { messageFor } from "@/lib/api/client";
import type { DepositMode, ManualMethod } from "@/lib/api/endpoints";
import { describeOutcome } from "@/lib/outcome";
import { keys } from "./queries";

/** Everything you can do to one booking. Each action refreshes the screens that show it, and reports plainly. */
export function useBookingActions(id: string, onGone?: () => void) {
  const qc = useQueryClient();

  const refresh = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: keys.booking(id) }),
      qc.invalidateQueries({ queryKey: keys.allCalendar }),
      qc.invalidateQueries({ queryKey: ["clients"] }),
      qc.invalidateQueries({ queryKey: ["client"] }),
    ]);
  };
  const fail = (error: unknown) =>
    Alert.alert("That didn't work", messageFor(error));

  const cancel = useMutation({
    mutationFn: (v: { mode: DepositMode; reason?: string }) =>
      api.cancelBooking(id, v.mode, v.reason),
    onSuccess: async (outcome) => {
      await refresh();
      Alert.alert("Appointment cancelled", describeOutcome(outcome), [
        { text: "OK", onPress: onGone },
      ]);
    },
    onError: fail,
  });

  const noShow = useMutation({
    mutationFn: () => api.markNoShow(id),
    onSuccess: async (outcome) => {
      await refresh();
      Alert.alert("Marked as no-show", describeOutcome(outcome));
    },
    onError: fail,
  });

  const paid = useMutation({
    mutationFn: (method: ManualMethod) => api.checkout(id, method),
    onSuccess: async () => {
      await refresh();
      Alert.alert("Payment recorded", "The appointment is completed.");
    },
    onError: fail,
  });

  return { cancel, noShow, paid };
}
