import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { EmptyState, ErrorState, Loading } from "@/components/ui/States";
import { Text } from "@/components/ui/Text";
import { keys } from "@/hooks/queries";
import { api } from "@/lib/api";
import { useMe } from "@/lib/auth/session";
import { time } from "@/lib/format";
import { differenceLabel, entryStatusLabel, hoursLabel } from "@/lib/hours";
import { dayName, shiftWeek, weekLabel } from "@/lib/roster";

export default function HoursScreen() {
  const zone = useMe().business.timezone;
  const [week, setWeek] = useState<string | undefined>(undefined);
  const query = useQuery({
    queryKey: keys.myWeek(week),
    queryFn: () => api.myWeek(week),
  });

  if (query.isPending) return <Loading />;
  if (query.isError) {
    return (
      <Screen>
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      </Screen>
    );
  }
  if (!query.data.available) {
    return (
      <Screen>
        <EmptyState
          title="No timesheet"
          hint="Your login isn't linked to a staff profile yet. Ask the owner."
        />
      </Screen>
    );
  }
  const sheet = query.data.sheet;
  const diff = differenceLabel(sheet.differenceMinutes);

  return (
    <Screen
      onRefresh={() => void query.refetch()}
      refreshing={query.isRefetching}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous week"
          hitSlop={12}
          onPress={() => setWeek(shiftWeek(sheet.weekStart, -1))}
        >
          <Text variant="title">‹</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to this week"
          onPress={() => setWeek(undefined)}
        >
          <Text variant="title">{weekLabel(sheet.weekStart)}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next week"
          hitSlop={12}
          onPress={() => setWeek(shiftWeek(sheet.weekStart, 1))}
        >
          <Text variant="title">›</Text>
        </Pressable>
      </View>

      <Card tone="peach">
        <Text variant="display">{hoursLabel(sheet.workedMinutes)}</Text>
        <Text tone="muted">
          worked · {hoursLabel(sheet.rosteredMinutes)} rostered
          {diff ? ` (${diff})` : ""}
        </Text>
        {sheet.pendingCount > 0 ? (
          <Text variant="caption" tone="muted">
            {sheet.pendingCount} shift{sheet.pendingCount === 1 ? "" : "s"}{" "}
            awaiting approval
          </Text>
        ) : null}
        {sheet.hasOpenEntry ? (
          <Text variant="caption">You are on a shift now.</Text>
        ) : null}
      </Card>

      {sheet.days.map((day) => (
        <Card key={day.date}>
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <Text variant="heading">{dayName(day.date)}</Text>
            <Text tone="muted">
              {hoursLabel(day.workedMinutes)} /{" "}
              {hoursLabel(day.rosteredMinutes)}
            </Text>
          </View>
          {day.entries.length === 0 ? (
            <Text variant="caption" tone="subtle">
              No shift
            </Text>
          ) : null}
          {day.entries.map((e) => (
            <View key={e.id} style={{ gap: 2 }}>
              <Text>
                {time(e.clockIn, zone)} –{" "}
                {e.clockOut ? time(e.clockOut, zone) : "now"}
                {e.locationName ? ` · ${e.locationName}` : ""}
              </Text>
              <Text variant="caption" tone="muted">
                {hoursLabel(e.netMinutes)}
                {e.breakMinutes > 0
                  ? ` after a ${e.breakMinutes} min break`
                  : ""}{" "}
                · {entryStatusLabel(e.status)}
                {e.source === "manual" ? " · added by hand" : ""}
              </Text>
            </View>
          ))}
        </Card>
      ))}
      <Text variant="caption" tone="subtle" style={{ textAlign: "center" }}>
        Fixing a shift or approving hours is done on the web, where a reason is
        recorded.
      </Text>
    </Screen>
  );
}
