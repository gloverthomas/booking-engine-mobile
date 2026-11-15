import { useQuery } from "@tanstack/react-query";
import { Link, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { AppointmentCard } from "@/components/booking/AppointmentCard";
import { ClockCard } from "@/components/ClockCard";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { EmptyState, ErrorState, Loading } from "@/components/ui/States";
import { Text } from "@/components/ui/Text";
import { keys, useResources } from "@/hooks/queries";
import { api } from "@/lib/api";
import { dayHeading, dayRange, shortDate, time } from "@/lib/format";
import { useMe } from "@/lib/auth/session";
import { LIVE } from "@/lib/status";
import { space, useTheme } from "@/theme";

export default function Today() {
  const me = useMe();
  const router = useRouter();
  const t = useTheme();
  const zone = me.business.timezone;
  const [offset, setOffset] = useState(0);
  const range = useMemo(
    () => dayRange(zone, new Date(), offset),
    [zone, offset],
  );

  const resources = useResources();
  const day = useQuery({
    queryKey: keys.calendar(range.from),
    queryFn: () => api.calendar(range.from, range.to),
  });

  const staff = new Map((resources.data?.staff ?? []).map((s) => [s.id, s]));
  const seesAll = resources.data?.viewer.seesAll ?? false;
  const events = [...(day.data?.events ?? [])]
    .filter((e) => e.kind !== "booking" || e.status !== "expired")
    .sort((a, b) => a.start.localeCompare(b.start));
  const live = events.filter(
    (e) => e.kind === "booking" && LIVE.has(e.status),
  ).length;

  return (
    <Screen onRefresh={() => void day.refetch()} refreshing={day.isRefetching}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous day"
          hitSlop={12}
          onPress={() => setOffset((n) => n - 1)}
        >
          <Text variant="title">‹</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to today"
          onPress={() => setOffset(0)}
        >
          <View style={{ alignItems: "center" }}>
            <Text variant="title">{dayHeading(range.from, zone)}</Text>
            <Text variant="caption" tone="muted">
              {shortDate(range.from, zone)} · {live} appointment
              {live === 1 ? "" : "s"}
            </Text>
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next day"
          hitSlop={12}
          onPress={() => setOffset((n) => n + 1)}
        >
          <Text variant="title">›</Text>
        </Pressable>
      </View>

      <ClockCard />

      <Button
        title="New appointment"
        onPress={() => router.push("/booking/new")}
      />

      {day.isPending ? <Loading /> : null}
      {day.isError ? (
        <ErrorState error={day.error} onRetry={() => void day.refetch()} />
      ) : null}
      {day.isSuccess && events.length === 0 ? (
        <EmptyState
          title="Nothing booked"
          hint="A quiet day. Pull down to refresh."
        />
      ) : null}

      {events.map((event) => {
        if (event.kind !== "booking") {
          return (
            <View
              key={event.id}
              style={{
                padding: space.md,
                borderRadius: 10,
                backgroundColor: t.sunken,
                gap: 2,
              }}
            >
              <Text variant="label" tone="muted">
                {time(event.start, zone)} – {time(event.end, zone)}
              </Text>
              <Text tone="muted">
                {event.reason ??
                  (event.kind === "external" ? "Busy" : "Blocked")}
              </Text>
            </View>
          );
        }
        return (
          <Link
            key={event.id}
            href={{ pathname: "/booking/[id]", params: { id: event.id } }}
            asChild
          >
            <Pressable accessibilityRole="link">
              <AppointmentCard
                start={event.start}
                end={event.end}
                zone={zone}
                clientName={event.clientName}
                services={event.services}
                status={event.status}
                totalCents={event.totalCents}
                stylist={seesAll ? staff.get(event.staffId) : undefined}
              />
            </Pressable>
          </Link>
        );
      })}
    </Screen>
  );
}
