import { useQuery } from "@tanstack/react-query";
import { Link } from "expo-router";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Screen } from "@/components/ui/Screen";
import { EmptyState, ErrorState, Loading } from "@/components/ui/States";
import { Text } from "@/components/ui/Text";
import { keys } from "@/hooks/queries";
import { api } from "@/lib/api";
import { entryStatus, windowLabel } from "@/lib/waitlist";
import { space } from "@/theme";

export default function WaitlistScreen() {
  const [view, setView] = useState<"active" | "history">("active");
  const query = useQuery({
    queryKey: keys.waitlist(view),
    queryFn: () => api.waitlist(view),
  });

  return (
    <Screen
      onRefresh={() => void query.refetch()}
      refreshing={query.isRefetching}
    >
      <View style={{ flexDirection: "row", gap: space.sm }}>
        <Chip
          label="Waiting"
          selected={view === "active"}
          onPress={() => setView("active")}
        />
        <Chip
          label="History"
          selected={view === "history"}
          onPress={() => setView("history")}
        />
      </View>

      {query.isPending ? <Loading /> : null}
      {query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : null}
      {query.isSuccess && query.data.entries.length === 0 ? (
        <EmptyState
          title={view === "active" ? "Nobody is waiting" : "Nothing here yet"}
          hint={
            view === "active"
              ? "When a client asks to be told about a cancellation, they appear here."
              : undefined
          }
        />
      ) : null}

      {query.data?.entries.map((e) => (
        <Link
          key={e.id}
          href={{ pathname: "/waitlist/[id]", params: { id: e.id } }}
          asChild
        >
          <Pressable accessibilityRole="link">
            <Card>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text variant="heading">{e.clientName}</Text>
                <Badge {...entryStatus(e)} />
              </View>
              <Text tone="muted">{e.serviceNames.join(" + ")}</Text>
              <Text variant="caption" tone="muted">
                {windowLabel(e)}
                {e.staffName ? ` · ${e.staffName}` : ""}
              </Text>
            </Card>
          </Pressable>
        </Link>
      ))}
    </Screen>
  );
}
