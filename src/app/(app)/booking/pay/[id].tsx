import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { ErrorState, Loading } from "@/components/ui/States";
import { Text } from "@/components/ui/Text";
import { keys, useBooking } from "@/hooks/queries";
import { api } from "@/lib/api";
import { money } from "@/lib/format";
import {
  takeTapToPayPayment,
  type Outcome,
  type Stage,
} from "@/lib/payments/tap-to-pay";
import { useTerminalPort } from "@/lib/payments/use-terminal";
import { space } from "@/theme";

const STAGE_TEXT: Record<Stage, string> = {
  starting: "Getting ready…",
  connecting: "Preparing this iPhone to take cards…",
  ready: "Hold the card or phone near the top of this iPhone.",
  processing: "Reading the card…",
  confirming: "Paid. Recording it…",
};

export default function PayScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const booking = useBooking(id);
  const config = useQuery({
    queryKey: ["terminal"],
    queryFn: api.terminalConfig,
  });
  const { port, cancelCollect } = useTerminalPort();

  const [stage, setStage] = useState<Stage | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  if (booking.isPending || config.isPending) return <Loading />;
  if (booking.isError || config.isError) {
    const error = booking.error ?? config.error;
    return (
      <Screen>
        <ErrorState
          error={error}
          onRetry={() => {
            void booking.refetch();
            void config.refetch();
          }}
        />
      </Screen>
    );
  }

  const { locationId } = config.data;
  const owing = booking.data.balanceDueCents;
  const running = stage !== null && outcome === null;

  async function start() {
    if (!locationId) return;
    setOutcome(null);
    const result = await takeTapToPayPayment({
      bookingId: id,
      locationId,
      terminal: port,
      api: {
        start: api.startCardPayment,
        status: api.cardPaymentStatus,
      },
      onStage: (s) => mounted.current && setStage(s),
      isCancelled: () => !mounted.current,
    });
    await Promise.all([
      qc.invalidateQueries({ queryKey: keys.booking(id) }),
      qc.invalidateQueries({ queryKey: keys.allCalendar }),
    ]);
    if (mounted.current) {
      setOutcome(result);
      setStage(null);
    }
  }

  async function cancel() {
    await cancelCollect();
  }

  if (!locationId) {
    return (
      <Screen>
        <Card>
          <Text variant="heading">Tap to Pay isn&rsquo;t set up yet</Text>
          <Text tone="muted">
            The owner needs to finish the Stripe setup. You can still mark the
            balance as paid by cash or EFTPOS from the appointment.
          </Text>
        </Card>
        <Button
          title="Back"
          variant="secondary"
          onPress={() => router.back()}
        />
      </Screen>
    );
  }

  return (
    <Screen
      contentStyle={{ flexGrow: 1, justifyContent: "center", gap: space.xl }}
    >
      <View style={{ alignItems: "center", gap: space.xs }}>
        <Text variant="caption" tone="muted" uppercase>
          {booking.data.client.name}
        </Text>
        <Text variant="display">
          {money(outcome?.kind === "paid" ? booking.data.paidCents : owing)}
        </Text>
      </View>

      {running ? (
        <Card tone="peach">
          <Text
            variant="heading"
            style={{ textAlign: "center" }}
            accessibilityLiveRegion="polite"
          >
            {stage ? STAGE_TEXT[stage] : ""}
          </Text>
        </Card>
      ) : null}

      {outcome?.kind === "paid" ? (
        <Card tone="peach">
          <Text
            variant="title"
            tone="success"
            style={{ textAlign: "center" }}
            accessibilityLiveRegion="polite"
          >
            Paid ✓
          </Text>
          <Text tone="muted" style={{ textAlign: "center" }}>
            The appointment is complete. A receipt goes to the client if they
            have an email on file.
          </Text>
        </Card>
      ) : null}

      {outcome?.kind === "recording" ? (
        <Card>
          <Text variant="heading">Payment taken</Text>
          <Text tone="muted">
            The card was charged. It is still being recorded and the appointment
            will close in a moment. Do not take the payment again.
          </Text>
        </Card>
      ) : null}

      {outcome?.kind === "failed" ? (
        <Card>
          <Text variant="heading" tone="danger" accessibilityRole="alert">
            Not taken
          </Text>
          <Text>{outcome.message}</Text>
        </Card>
      ) : null}

      {outcome?.kind === "cancelled" ? (
        <Text tone="muted" style={{ textAlign: "center" }}>
          Cancelled. Nothing was charged.
        </Text>
      ) : null}

      <View style={{ gap: space.sm }}>
        {outcome?.kind === "paid" || outcome?.kind === "recording" ? (
          <Button title="Done" onPress={() => router.back()} />
        ) : running ? (
          stage === "ready" ? (
            <Button
              title="Cancel"
              variant="secondary"
              onPress={() => void cancel()}
            />
          ) : null
        ) : (
          <>
            <Button
              title={outcome ? "Try again" : `Take ${money(owing)}`}
              disabled={owing <= 0}
              onPress={() => void start()}
            />
            <Button
              title="Back"
              variant="ghost"
              onPress={() => router.back()}
            />
          </>
        )}
      </View>
    </Screen>
  );
}
