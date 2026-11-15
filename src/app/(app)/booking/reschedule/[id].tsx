import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, ScrollView, Switch, View } from "react-native";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Screen } from "@/components/ui/Screen";
import { EmptyState, ErrorState, Loading } from "@/components/ui/States";
import { Text } from "@/components/ui/Text";
import { keys, useBooking } from "@/hooks/queries";
import { api } from "@/lib/api";
import { messageFor } from "@/lib/api/client";
import { useMe } from "@/lib/auth/session";
import { upcomingDays } from "@/lib/days";
import { dayHeading, localDate, shortDate, time } from "@/lib/format";
import { initialDay, isMove, isSameInstant, moveLabel } from "@/lib/reschedule";
import { space, useTheme } from "@/theme";

export default function RescheduleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const t = useTheme();
  const zone = useMe().business.timezone;
  const booking = useBooking(id);
  const days = useMemo(() => upcomingDays(zone), [zone]);

  const [date, setDate] = useState<string | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [notifyClient, setNotifyClient] = useState(true);

  const day =
    date ??
    (booking.data
      ? initialDay(localDate(booking.data.start, zone), days)
      : null);
  const slots = useQuery({
    queryKey: ["reschedule-slots", id, day],
    queryFn: () => api.rescheduleSlots(id, day ?? "", day ?? ""),
    enabled: day !== null && booking.isSuccess && booking.data.allowed.move,
    staleTime: 10_000,
  });

  const move = useMutation({
    mutationFn: (start: string) => api.reschedule(id, start, notifyClient),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: keys.booking(id) }),
        qc.invalidateQueries({ queryKey: keys.allCalendar }),
        qc.invalidateQueries({ queryKey: ["reschedule-slots", id] }),
      ]);
      router.back();
    },
    onError: (error) => {
      // Most often the time was taken a moment ago: show why, and refresh the choices.
      Alert.alert("Couldn't move it", messageFor(error));
      setChosen(null);
      void slots.refetch();
    },
  });

  if (booking.isPending) return <Loading />;
  if (booking.isError) {
    return (
      <Screen>
        <ErrorState
          error={booking.error}
          onRetry={() => void booking.refetch()}
        />
      </Screen>
    );
  }
  const b = booking.data;

  if (!b.allowed.move) {
    return (
      <Screen>
        <EmptyState
          title="This appointment can't be moved"
          hint="Only a confirmed appointment can be moved."
        />
        <Button
          title="Back"
          variant="secondary"
          onPress={() => router.back()}
        />
      </Screen>
    );
  }

  const ready = isMove(b.start, chosen);
  return (
    <Screen>
      <Card tone="peach">
        <Text variant="label" tone="muted">
          {b.client.name} · {b.staff.name}
        </Text>
        <Text variant="heading">
          Now {dayHeading(b.start, zone)}, {shortDate(b.start, zone)} at{" "}
          {time(b.start, zone)}
        </Text>
      </Card>

      <View style={{ gap: space.sm }}>
        <Text variant="label">Day</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: space.sm }}
        >
          {days.map((d) => (
            <Chip
              key={d.date}
              label={d.label}
              selected={day === d.date}
              onPress={() => {
                setDate(d.date);
                setChosen(null);
              }}
            />
          ))}
        </ScrollView>
      </View>

      <View style={{ gap: space.sm }}>
        <Text variant="label">New time</Text>
        {slots.isPending ? <Loading /> : null}
        {slots.isError ? (
          <ErrorState
            error={slots.error}
            onRetry={() => void slots.refetch()}
          />
        ) : null}

        {slots.data?.reason === "services_not_in_catalogue" ? (
          <Card>
            <Text variant="heading">Times can&rsquo;t be suggested</Text>
            <Text tone="muted">
              This appointment has a service that isn&rsquo;t in your catalogue
              (it may have come from an import). Move it from the calendar on
              the web.
            </Text>
          </Card>
        ) : null}

        {slots.isSuccess &&
        !slots.data.reason &&
        slots.data.slots.length === 0 ? (
          <EmptyState title="Nothing free that day" hint="Try another day." />
        ) : null}

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
          {slots.data?.slots.map((s) => {
            const isCurrent = isSameInstant(s.start, b.start);
            return (
              <Chip
                key={s.start}
                label={
                  isCurrent
                    ? `${time(s.start, zone)} (now)`
                    : time(s.start, zone)
                }
                selected={chosen !== null && isSameInstant(chosen, s.start)}
                onPress={() => setChosen(s.start)}
              />
            );
          })}
        </View>
      </View>

      <Card>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: space.md,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text variant="heading">Tell the client</Text>
            <Text variant="caption" tone="muted">
              Sends them the new time. Turn off for a quiet change.
            </Text>
          </View>
          <Switch
            accessibilityLabel="Tell the client"
            value={notifyClient}
            onValueChange={setNotifyClient}
            trackColor={{ true: t.success }}
          />
        </View>
      </Card>

      <Button
        title={
          chosen && ready ? moveLabel(chosen, zone) : "Choose a different time"
        }
        loading={move.isPending}
        disabled={!ready}
        onPress={() => chosen && move.mutate(chosen)}
      />
    </Screen>
  );
}
