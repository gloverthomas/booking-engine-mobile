import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Alert, Linking, View } from "react-native";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { ErrorState, Loading } from "@/components/ui/States";
import { Text } from "@/components/ui/Text";
import { useBooking } from "@/hooks/queries";
import { api } from "@/lib/api";
import { useBookingActions } from "@/hooks/use-booking-actions";
import { useMe } from "@/lib/auth/session";
import {
  dayHeading,
  duration,
  money,
  shortDate,
  time,
  totalDuration,
} from "@/lib/format";
import { statusStyle } from "@/lib/status";
import { space } from "@/theme";

function Line({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        gap: space.md,
      }}
    >
      <Text tone="muted">{label}</Text>
      <Text variant={strong ? "heading" : "body"}>{value}</Text>
    </View>
  );
}

export default function BookingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const zone = useMe().business.timezone;
  const query = useBooking(id);
  const { cancel, noShow, paid } = useBookingActions(id, () => router.back());
  const terminal = useQuery({
    queryKey: ["terminal"],
    queryFn: api.terminalConfig,
    staleTime: 5 * 60_000,
  });

  if (query.isPending) return <Loading />;
  if (query.isError) {
    return (
      <Screen>
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      </Screen>
    );
  }
  const b = query.data;
  const busy = cancel.isPending || noShow.isPending || paid.isPending;

  function askCancel() {
    const reason = undefined;
    if (b.depositCents <= 0) {
      Alert.alert("Cancel this appointment?", "The client will be told.", [
        { text: "Keep it", style: "cancel" },
        {
          text: "Cancel appointment",
          style: "destructive",
          onPress: () => cancel.mutate({ mode: "keep", reason }),
        },
      ]);
      return;
    }
    Alert.alert(
      "Cancel this appointment?",
      `A ${money(b.depositCents)} deposit was taken. What should happen to it?`,
      [
        { text: "Keep it", style: "cancel" },
        {
          text: "Cancel and refund deposit",
          onPress: () => cancel.mutate({ mode: "refund", reason }),
        },
        {
          text: "Cancel and keep deposit",
          style: "destructive",
          onPress: () => cancel.mutate({ mode: "keep", reason }),
        },
      ],
    );
  }

  function askNoShow() {
    Alert.alert(
      "Mark as a no-show?",
      "Your no-show policy applies: the deposit is kept and any fee is charged to their saved card.",
      [
        { text: "Not yet", style: "cancel" },
        {
          text: "Mark no-show",
          style: "destructive",
          onPress: () => noShow.mutate(),
        },
      ],
    );
  }

  function askPaid() {
    Alert.alert(
      "Paid how?",
      `Balance ${money(b.balanceDueCents)}. This closes the appointment.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Cash", onPress: () => paid.mutate("cash") },
        { text: "EFTPOS", onPress: () => paid.mutate("eftpos") },
        { text: "Other", onPress: () => paid.mutate("other") },
      ],
    );
  }

  const phone = b.client.phone;
  return (
    <Screen>
      <View style={{ gap: space.xs }}>
        <Badge {...statusStyle(b.status)} />
        <Text variant="title">{b.client.name}</Text>
        <Text tone="muted">
          {dayHeading(b.start, zone)}, {shortDate(b.start, zone)} ·{" "}
          {time(b.start, zone)} – {time(b.end, zone)}
        </Text>
        <Text tone="muted">
          {b.staff.name} · {b.location.name}
        </Text>
      </View>

      {phone ? (
        <View style={{ flexDirection: "row", gap: space.sm }}>
          <View style={{ flex: 1 }}>
            <Button
              title="Call"
              variant="secondary"
              onPress={() => void Linking.openURL(`tel:${phone}`)}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              title="Text"
              variant="secondary"
              onPress={() => void Linking.openURL(`sms:${phone}`)}
            />
          </View>
        </View>
      ) : null}

      <Card>
        <Text variant="heading">
          Services · {duration(totalDuration(b.services))}
        </Text>
        {b.services.map((s) => (
          <Line key={s.id} label={s.name} value={money(s.priceCents)} />
        ))}
      </Card>

      <Card>
        <Line label="Total" value={money(b.totalCents)} />
        <Line label="Deposit" value={money(b.depositCents)} />
        <Line label="Paid so far" value={money(b.paidCents)} />
        <Line label="Balance due" value={money(b.balanceDueCents)} strong />
      </Card>

      {b.comments ? (
        <Card>
          <Text variant="label">Booking note</Text>
          <Text>{b.comments}</Text>
        </Card>
      ) : null}
      {b.client.notes ? (
        <Card tone="peach">
          <Text variant="label">About {b.client.name.split(" ")[0]}</Text>
          <Text>{b.client.notes}</Text>
        </Card>
      ) : null}

      <View style={{ gap: space.sm }}>
        {b.allowed.checkout &&
        b.balanceDueCents > 0 &&
        terminal.data?.configured ? (
          <Button
            title={`Take ${money(b.balanceDueCents)} by card`}
            disabled={busy}
            onPress={() =>
              router.push({ pathname: "/booking/pay/[id]", params: { id } })
            }
          />
        ) : null}
        {b.allowed.checkout && b.balanceDueCents > 0 ? (
          <Button
            title={`Mark ${money(b.balanceDueCents)} as paid`}
            variant={terminal.data?.configured ? "secondary" : "primary"}
            loading={paid.isPending}
            disabled={busy}
            onPress={askPaid}
          />
        ) : null}
        {b.allowed.move ? (
          <Button
            title="Move to another time"
            variant="secondary"
            disabled={busy}
            onPress={() =>
              router.push({
                pathname: "/booking/reschedule/[id]",
                params: { id },
              })
            }
          />
        ) : null}
        {b.allowed.noShow ? (
          <Button
            title="No-show"
            variant="secondary"
            loading={noShow.isPending}
            disabled={busy}
            onPress={askNoShow}
          />
        ) : null}
        {b.allowed.cancel ? (
          <Button
            title="Cancel appointment"
            variant="danger"
            loading={cancel.isPending}
            disabled={busy}
            onPress={askCancel}
          />
        ) : null}
      </View>

      {b.status === "cancelled_by_staff" ||
      b.status === "cancelled_by_client" ? (
        <Text tone="muted">
          {b.cancelReason
            ? `Cancelled: ${b.cancelReason}`
            : "This appointment was cancelled."}
        </Text>
      ) : null}
    </Screen>
  );
}
