import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, View } from "react-native";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Text } from "@/components/ui/Text";
import { keys } from "@/hooks/queries";
import { useNow } from "@/hooks/use-now";
import { api } from "@/lib/api";
import { messageFor } from "@/lib/api/client";
import { elapsedMinutes, formatElapsed } from "@/lib/roster";
import { space } from "@/theme";

const BREAKS = [0, 15, 30, 45] as const;

/** Clock in and out of a shift. Hidden for logins with no staff profile, and while it cannot be loaded. */
export function ClockCard() {
  const qc = useQueryClient();
  const clock = useQuery({
    queryKey: keys.clock,
    queryFn: api.clock,
    staleTime: 30_000,
  });
  const now = useNow();
  const refresh = () => qc.invalidateQueries({ queryKey: keys.clock });
  const fail = (error: unknown) =>
    Alert.alert("That didn't work", messageFor(error));

  const clockIn = useMutation({
    mutationFn: (locationId?: string) => api.clockIn(locationId),
    onSuccess: refresh,
    onError: fail,
  });
  const clockOut = useMutation({
    mutationFn: (breakMinutes: number) => api.clockOut(breakMinutes),
    onSuccess: refresh,
    onError: fail,
  });

  if (!clock.data?.available) return null;
  const { open, locations, serverNow } = clock.data;
  const busy = clockIn.isPending || clockOut.isPending;

  function askClockIn() {
    if (locations.length <= 1) {
      clockIn.mutate(locations[0]?.id);
      return;
    }
    Alert.alert("Where are you working?", undefined, [
      ...locations.map((l) => ({
        text: l.name,
        onPress: () => clockIn.mutate(l.id),
      })),
      { text: "Cancel", style: "cancel" as const },
    ]);
  }

  function askClockOut() {
    Alert.alert("Clock out", "Any unpaid break to take off?", [
      ...BREAKS.map((m) => ({
        text: m === 0 ? "No break" : `${m} min break`,
        onPress: () => clockOut.mutate(m),
      })),
      { text: "Cancel", style: "cancel" as const },
    ]);
  }

  if (!open) {
    return (
      <Card>
        <View style={{ gap: space.sm }}>
          <Text variant="heading">Not on a shift</Text>
          <Button
            title="Clock in"
            variant="secondary"
            loading={clockIn.isPending}
            disabled={busy}
            onPress={askClockIn}
          />
        </View>
      </Card>
    );
  }

  const mins = elapsedMinutes({
    since: open.since,
    serverNow,
    fetchedAtMs: clock.dataUpdatedAt,
    nowMs: now,
  });
  return (
    <Card tone="peach">
      <View style={{ gap: space.sm }}>
        <Text variant="heading" accessibilityLiveRegion="polite">
          On shift · {formatElapsed(mins)}
        </Text>
        <Text tone="muted">
          Since {open.sinceLabel}
          {open.locationName ? ` at ${open.locationName}` : ""}
        </Text>
        <Button
          title="Clock out"
          variant="secondary"
          loading={clockOut.isPending}
          disabled={busy}
          onPress={askClockOut}
        />
      </View>
    </Card>
  );
}
