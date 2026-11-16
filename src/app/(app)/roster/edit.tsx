import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, ScrollView, View } from "react-native";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Field } from "@/components/ui/Field";
import { Screen } from "@/components/ui/Screen";
import { ErrorState, Loading } from "@/components/ui/States";
import { Text } from "@/components/ui/Text";
import { keys, useResources } from "@/hooks/queries";
import { api } from "@/lib/api";
import { messageFor } from "@/lib/api/client";
import { dayHeading, shortDate } from "@/lib/format";
import {
  conflictWarning,
  describeException,
  hourOptions,
  hoursProblem,
} from "@/lib/roster-edit";
import { space } from "@/theme";

const ZONE_FALLBACK = "Australia/Melbourne";

export default function RosterEditScreen() {
  const { staffId, staffName, date } = useLocalSearchParams<{
    staffId: string;
    staffName: string;
    date: string;
  }>();
  const router = useRouter();
  const qc = useQueryClient();
  const resources = useResources();
  const existing = useQuery({
    queryKey: keys.rosterExceptions(date),
    queryFn: () => api.rosterExceptions(date),
  });

  const [mode, setMode] = useState<"off" | "custom">("off");
  const [locationId, setLocationId] = useState<string | null>(null);
  const [start, setStart] = useState<number | null>(null);
  const [end, setEnd] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const options = useMemo(() => hourOptions(), []);

  const refresh = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: keys.allRoster }),
      qc.invalidateQueries({ queryKey: ["roster-exceptions"] }),
      qc.invalidateQueries({ queryKey: keys.allCalendar }),
    ]);

  const save = useMutation({
    mutationFn: () => {
      const trimmed = note.trim() || undefined;
      if (mode === "off")
        return api.setDayOff({ staffId, date, locationId, note: trimmed });
      return api.setCustomHours({
        staffId,
        date,
        locationId: locationId ?? places[0]?.id ?? "",
        ranges: [{ startMinute: start ?? 0, endMinute: end ?? 0 }],
        note: trimmed,
      });
    },
    onSuccess: async (result) => {
      await refresh();
      const warning = conflictWarning(result.conflictingBookings);
      if (warning)
        Alert.alert("Saved", warning, [
          { text: "OK", onPress: () => router.back() },
        ]);
      else router.back();
    },
    onError: (error) => Alert.alert("Couldn't save that", messageFor(error)),
  });

  const restore = useMutation({
    mutationFn: (id: string) => api.removeRosterException(id),
    onSuccess: async () => {
      await refresh();
      router.back();
    },
    onError: (error) => Alert.alert("That didn't work", messageFor(error)),
  });

  if (resources.isPending || existing.isPending) return <Loading />;
  if (resources.isError || existing.isError) {
    const error = resources.error ?? existing.error;
    return (
      <Screen>
        <ErrorState
          error={error}
          onRetry={() => {
            void resources.refetch();
            void existing.refetch();
          }}
        />
      </Screen>
    );
  }

  const zone = resources.data.timezone ?? ZONE_FALLBACK;
  const places = resources.data.locations;
  const current = existing.data.exceptions.filter(
    (e) => e.staffId === staffId && e.date === date,
  );
  const problem = mode === "custom" ? hoursProblem(start, end) : null;
  const heading = `${dayHeading(`${date}T12:00:00`, zone)}, ${shortDate(`${date}T12:00:00`, zone)}`;
  const busy = save.isPending || restore.isPending;

  return (
    <Screen>
      <View style={{ gap: space.xs }}>
        <Text variant="title">{staffName}</Text>
        <Text tone="muted">{heading}</Text>
      </View>

      {current.length > 0 ? (
        <Card tone="peach">
          <Text variant="heading">Already changed</Text>
          {current.map((e) => (
            <View key={e.id} style={{ gap: space.sm }}>
              <Text>{describeException(e)}</Text>
              <Button
                title="Back to weekly hours"
                variant="secondary"
                loading={restore.isPending}
                disabled={busy}
                onPress={() => restore.mutate(e.id)}
              />
            </View>
          ))}
          <Text variant="caption" tone="muted">
            Saving below replaces this.
          </Text>
        </Card>
      ) : null}

      <View style={{ flexDirection: "row", gap: space.sm }}>
        <Chip
          label="Day off"
          selected={mode === "off"}
          onPress={() => setMode("off")}
        />
        <Chip
          label="Different hours"
          selected={mode === "custom"}
          onPress={() => setMode("custom")}
        />
      </View>

      {places.length > 1 ? (
        <View style={{ gap: space.sm }}>
          <Text variant="label">
            {mode === "off" ? "Where" : "Which location"}
          </Text>
          <View
            style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}
          >
            {mode === "off" ? (
              <Chip
                label="All locations"
                selected={locationId === null}
                onPress={() => setLocationId(null)}
              />
            ) : null}
            {places.map((l) => (
              <Chip
                key={l.id}
                label={l.name}
                selected={
                  mode === "off"
                    ? locationId === l.id
                    : (locationId ?? places[0].id) === l.id
                }
                onPress={() => setLocationId(l.id)}
              />
            ))}
          </View>
        </View>
      ) : null}

      {mode === "custom" ? (
        <View style={{ gap: space.md }}>
          {(
            [
              ["Starts", start, setStart],
              ["Finishes", end, setEnd],
            ] as const
          ).map(([label, value, set]) => (
            <View key={label} style={{ gap: space.sm }}>
              <Text variant="label">{label}</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: space.sm }}
              >
                {options.map((o) => (
                  <Chip
                    key={o.minute}
                    label={o.label}
                    selected={value === o.minute}
                    onPress={() => set(o.minute)}
                  />
                ))}
              </ScrollView>
            </View>
          ))}
        </View>
      ) : null}

      <Field
        label="Note (optional)"
        value={note}
        onChangeText={setNote}
        placeholder={
          mode === "off" ? "Holiday, sick, training…" : "Why the change"
        }
        maxLength={200}
      />

      {mode === "custom" && problem && (start !== null || end !== null) ? (
        <Text tone="danger" accessibilityRole="alert">
          {problem}
        </Text>
      ) : null}
      <Text variant="caption" tone="subtle">
        Existing appointments are not moved. If any end up outside their hours
        you will be told how many.
      </Text>

      <Button
        title={
          mode === "off" ? `Mark ${staffName.split(" ")[0]} off` : "Save hours"
        }
        loading={save.isPending}
        disabled={busy || problem !== null}
        onPress={() => save.mutate()}
      />
    </Screen>
  );
}
