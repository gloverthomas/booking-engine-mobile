import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { EmptyState, ErrorState, Loading } from "@/components/ui/States";
import { Text } from "@/components/ui/Text";
import { keys } from "@/hooks/queries";
import { api } from "@/lib/api";
import { dayName, describeDay, shiftWeek, weekLabel } from "@/lib/roster";
import { space } from "@/theme";

export default function RosterScreen() {
  const [week, setWeek] = useState<string | undefined>(undefined);
  const query = useQuery({
    queryKey: keys.roster(week),
    queryFn: () => api.roster(week),
  });

  if (query.isPending) return <Loading />;
  if (query.isError) {
    return (
      <Screen>
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      </Screen>
    );
  }
  const r = query.data;
  const own = r.scope === "own";
  const showPlace = r.locations.length > 1;
  const thisWeek = r.dates.includes(r.today);

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
          onPress={() => setWeek(shiftWeek(r.weekStart, -1))}
        >
          <Text variant="title">‹</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to this week"
          onPress={() => setWeek(undefined)}
        >
          <View style={{ alignItems: "center" }}>
            <Text variant="title">
              {thisWeek ? "This week" : weekLabel(r.weekStart)}
            </Text>
            <Text variant="caption" tone="muted">
              {thisWeek ? weekLabel(r.weekStart) : "Tap for this week"}
            </Text>
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next week"
          hitSlop={12}
          onPress={() => setWeek(shiftWeek(r.weekStart, 1))}
        >
          <Text variant="title">›</Text>
        </Pressable>
      </View>

      {r.rows.length === 0 ? (
        <EmptyState
          title="No roster to show"
          hint={
            own
              ? "Your login is not linked to a stylist profile yet. Ask the owner."
              : "Weekly hours are set per stylist and location on the web."
          }
        />
      ) : null}

      {r.rows.map((row) => (
        <Card key={row.staffId}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: space.sm,
            }}
          >
            {row.colour ? (
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: row.colour,
                }}
              />
            ) : null}
            <Text variant="heading">{own ? "Your week" : row.name}</Text>
          </View>
          {row.days.map((day) => {
            const line = describeDay(day, showPlace);
            const today = day.date === r.today;
            return (
              <View
                key={day.date}
                accessible
                accessibilityLabel={`${dayName(day.date)}, ${line.text}${line.detail ? `, ${line.detail}` : ""}${today ? ", today" : ""}`}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  gap: space.md,
                  paddingVertical: 2,
                }}
              >
                <Text variant="label" style={{ width: 64 }}>
                  {dayName(day.date)}
                  {today ? " •" : ""}
                </Text>
                <View style={{ flex: 1, alignItems: "flex-end" }}>
                  <Text tone={line.working ? "default" : "subtle"}>
                    {line.text}
                  </Text>
                  {line.detail ? (
                    <Text variant="caption" tone="muted">
                      {line.detail}
                    </Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </Card>
      ))}
      {r.canEdit ? (
        <Text variant="caption" tone="subtle" style={{ textAlign: "center" }}>
          Change hours and days off on the web.
        </Text>
      ) : null}
    </Screen>
  );
}
