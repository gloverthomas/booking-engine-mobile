import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { ClientStep } from "@/components/new-booking/ClientStep";
import { ReviewStep } from "@/components/new-booking/ReviewStep";
import { ServicesStep } from "@/components/new-booking/ServicesStep";
import { TimeStep } from "@/components/new-booking/TimeStep";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { ErrorState, Loading } from "@/components/ui/States";
import { Text } from "@/components/ui/Text";
import { keys, useResources } from "@/hooks/queries";
import { api } from "@/lib/api";
import { messageFor } from "@/lib/api/client";
import { dayRange } from "@/lib/format";
import {
  canContinue,
  emptyDraft,
  nextStep,
  prevStep,
  toRequest,
  type Draft,
  type Step,
} from "@/lib/new-booking";
import { space } from "@/theme";

const TITLES: Record<Step, string> = {
  client: "Who is it for?",
  services: "What are they having?",
  time: "When?",
  review: "Check and confirm",
};

export default function NewBooking() {
  const router = useRouter();
  const navigation = useNavigation();
  const qc = useQueryClient();
  const params = useLocalSearchParams<{
    clientId?: string;
    clientName?: string;
  }>();
  const resources = useResources();

  const [step, setStep] = useState<Step>(
    params.clientId ? "services" : "client",
  );
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Build the starting draft once the business's time zone and locations are known.
  const initial = useMemo(() => {
    if (!resources.data) return null;
    const base = emptyDraft(dayRange(resources.data.timezone).date);
    const only =
      resources.data.locations.length === 1
        ? resources.data.locations[0].id
        : null;
    return {
      ...base,
      locationId: only,
      client:
        params.clientId && params.clientName
          ? ({
              kind: "existing",
              id: params.clientId,
              name: params.clientName,
            } as const)
          : null,
    } satisfies Draft;
  }, [resources.data, params.clientId, params.clientName]);
  const current = draft ?? initial;

  useEffect(() => {
    navigation.setOptions({ title: "New appointment" });
  }, [navigation]);

  const create = useMutation({
    mutationFn: () => {
      const body = current ? toRequest(current) : null;
      if (!body) throw new Error("incomplete");
      return api.createBooking(body);
    },
    onSuccess: async ({ bookingId }) => {
      await qc.invalidateQueries({ queryKey: keys.allCalendar });
      router.replace({ pathname: "/booking/[id]", params: { id: bookingId } });
    },
    onError: (e) => setError(messageFor(e)),
  });

  if (resources.isPending || !current) return <Loading />;
  if (resources.isError) {
    return (
      <Screen>
        <ErrorState
          error={resources.error}
          onRetry={() => void resources.refetch()}
        />
      </Screen>
    );
  }

  const onChange = (next: Draft) => {
    setError(null);
    setDraft(next);
  };
  const last = step === "review";

  return (
    <Screen>
      <Text variant="title">{TITLES[step]}</Text>

      {step === "client" ? (
        <ClientStep
          value={current.client}
          onChange={(client) => onChange({ ...current, client })}
        />
      ) : null}
      {step === "services" ? (
        <ServicesStep
          resources={resources.data}
          draft={current}
          onChange={onChange}
        />
      ) : null}
      {step === "time" ? (
        <TimeStep
          resources={resources.data}
          draft={current}
          onChange={onChange}
        />
      ) : null}
      {step === "review" ? (
        <ReviewStep
          resources={resources.data}
          draft={current}
          onChange={onChange}
        />
      ) : null}

      {error ? (
        <Text tone="danger" accessibilityRole="alert">
          {error}
        </Text>
      ) : null}

      <View style={{ flexDirection: "row", gap: space.sm }}>
        {step !== "client" ? (
          <View style={{ flex: 1 }}>
            <Button
              title="Back"
              variant="secondary"
              onPress={() => setStep(prevStep(step))}
            />
          </View>
        ) : null}
        <View style={{ flex: 2 }}>
          <Button
            title={last ? "Book it" : "Continue"}
            loading={create.isPending}
            disabled={!canContinue(step, current)}
            onPress={() => (last ? create.mutate() : setStep(nextStep(step)))}
          />
        </View>
      </View>
    </Screen>
  );
}
