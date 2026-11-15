import { useQuery } from "@tanstack/react-query";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { Linking, Pressable, View } from "react-native";
import { AppointmentCard } from "@/components/booking/AppointmentCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { ErrorState, Loading } from "@/components/ui/States";
import { Text } from "@/components/ui/Text";
import { keys } from "@/hooks/queries";
import { api } from "@/lib/api";
import { useMe } from "@/lib/auth/session";
import { money } from "@/lib/format";
import { space } from "@/theme";

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Text variant="title">{value}</Text>
      <Text variant="caption" tone="muted">
        {label}
      </Text>
    </View>
  );
}

export default function ClientScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const zone = useMe().business.timezone;
  const query = useQuery({
    queryKey: keys.client(id),
    queryFn: () => api.client(id),
  });

  if (query.isPending) return <Loading />;
  if (query.isError) {
    return (
      <Screen>
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      </Screen>
    );
  }
  const c = query.data;

  return (
    <Screen>
      <View style={{ gap: space.xs }}>
        <Text variant="title">{c.name}</Text>
        {c.isVip ? <Text variant="label">VIP</Text> : null}
        <Text tone="muted">{c.phone ?? c.email ?? "No contact details"}</Text>
        {c.blocked ? (
          <Text tone="danger">Blocked from online booking</Text>
        ) : null}
      </View>

      <View style={{ flexDirection: "row", gap: space.sm }}>
        {c.phone ? (
          <View style={{ flex: 1 }}>
            <Button
              title="Call"
              variant="secondary"
              onPress={() => void Linking.openURL(`tel:${c.phone}`)}
            />
          </View>
        ) : null}
        <View style={{ flex: 1 }}>
          <Button
            title="Book"
            onPress={() =>
              router.push({
                pathname: "/booking/new",
                params: { clientId: c.id, clientName: c.name },
              })
            }
          />
        </View>
      </View>

      <Card>
        <View style={{ flexDirection: "row", gap: space.md }}>
          <Stat value={c.stats.completedCount} label="visits" />
          <Stat value={c.stats.upcomingCount} label="upcoming" />
          <Stat value={money(c.stats.lifetimeSpendCents)} label="spent" />
        </View>
        {c.stats.noShowCount + c.stats.lateCancelCount > 0 ? (
          <Text tone="danger">
            {c.stats.noShowCount} no-show{c.stats.noShowCount === 1 ? "" : "s"},{" "}
            {c.stats.lateCancelCount} late cancel
            {c.stats.lateCancelCount === 1 ? "" : "s"}
          </Text>
        ) : null}
      </Card>

      {c.notes ? (
        <Card tone="peach">
          <Text variant="label">Notes</Text>
          <Text>{c.notes}</Text>
        </Card>
      ) : null}

      <Text variant="heading">History</Text>
      {c.history.length === 0 ? (
        <Text tone="muted">No appointments yet.</Text>
      ) : null}
      {c.history.map((h) => (
        <Link
          key={h.id}
          href={{ pathname: "/booking/[id]", params: { id: h.id } }}
          asChild
        >
          <Pressable accessibilityRole="link">
            <AppointmentCard
              start={h.start}
              end={h.end}
              zone={zone}
              clientName={h.staffName}
              services={h.services}
              status={h.status}
              totalCents={h.totalCents}
            />
          </Pressable>
        </Link>
      ))}
    </Screen>
  );
}
