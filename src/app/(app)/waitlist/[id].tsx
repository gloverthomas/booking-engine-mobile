import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Alert, Linking, View } from "react-native";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Screen } from "@/components/ui/Screen";
import { EmptyState, ErrorState, Loading } from "@/components/ui/States";
import { Text } from "@/components/ui/Text";
import { keys } from "@/hooks/queries";
import { api } from "@/lib/api";
import { messageFor } from "@/lib/api/client";
import type { OfferableSlot } from "@/lib/api/schemas";
import { shortDate, time } from "@/lib/format";
import {
  entryStatus,
  groupSlotsByDay,
  slotLabel,
  windowLabel,
} from "@/lib/waitlist";
import { space } from "@/theme";

export default function WaitlistEntryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: keys.waitlistSlots(id),
    queryFn: () => api.waitlistSlots(id),
  });

  const refresh = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: keys.allWaitlist }),
      qc.invalidateQueries({ queryKey: keys.waitlistSlots(id) }),
    ]);

  const offer = useMutation({
    mutationFn: (slot: OfferableSlot) =>
      api.offerWaitlistSlot(id, {
        staffId: slot.staffId,
        start: slot.start,
        end: slot.end,
      }),
    onSuccess: async () => {
      await refresh();
      Alert.alert(
        "Offer sent",
        "They have been told. The first to accept gets the time.",
      );
    },
    onError: async (error) => {
      Alert.alert("Couldn't send the offer", messageFor(error));
      await refresh(); // the time may just have been taken: show what is still free
    },
  });

  const remove = useMutation({
    mutationFn: () => api.removeFromWaitlist(id),
    onSuccess: async () => {
      await refresh();
      router.back();
    },
    onError: (error) => Alert.alert("That didn't work", messageFor(error)),
  });

  if (query.isPending) return <Loading />;
  if (query.isError) {
    return (
      <Screen>
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      </Screen>
    );
  }
  const { entry, timezone: zone, slots } = query.data;
  const open = entry.status === "waiting" || entry.status === "offered";
  const manyStylists = new Set(slots.map((s) => s.staffId)).size > 1;
  const groups = groupSlotsByDay(slots, zone);

  function askOffer(slot: OfferableSlot) {
    Alert.alert(
      "Offer this time?",
      `${entry.clientName}: ${shortDate(slot.start, zone)} at ${time(slot.start, zone)} with ${slot.staffName}. They will be told straight away.`,
      [
        { text: "Not yet", style: "cancel" },
        { text: "Offer it", onPress: () => offer.mutate(slot) },
      ],
    );
  }

  function askRemove() {
    Alert.alert(
      "Take them off the waitlist?",
      "Any open offers to them are withdrawn.",
      [
        { text: "Keep them", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => remove.mutate(),
        },
      ],
    );
  }

  return (
    <Screen>
      <View style={{ gap: space.xs }}>
        <Badge {...entryStatus(entry)} />
        <Text variant="title">{entry.clientName}</Text>
        <Text tone="muted">{entry.serviceNames.join(" + ")}</Text>
        <Text tone="muted">{windowLabel(entry)}</Text>
        <Text variant="caption" tone="muted">
          {entry.locationName}
          {entry.staffName
            ? ` · asked for ${entry.staffName}`
            : " · any stylist"}
        </Text>
      </View>

      {entry.clientPhone ? (
        <View style={{ flexDirection: "row", gap: space.sm }}>
          <View style={{ flex: 1 }}>
            <Button
              title="Call"
              variant="secondary"
              onPress={() => void Linking.openURL(`tel:${entry.clientPhone}`)}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              title="Text"
              variant="secondary"
              onPress={() => void Linking.openURL(`sms:${entry.clientPhone}`)}
            />
          </View>
        </View>
      ) : null}

      {entry.notes ? (
        <Card tone="peach">
          <Text variant="label">Their note</Text>
          <Text>{entry.notes}</Text>
        </Card>
      ) : null}

      {entry.offers.length > 0 ? (
        <Card>
          <Text variant="heading">Offers so far</Text>
          {entry.offers.map((o) => (
            <Text key={o.id} tone="muted">
              {shortDate(o.start, zone)} at {time(o.start, zone)} with{" "}
              {o.staffName}:{" "}
              {o.status === "sent"
                ? "waiting for a reply"
                : o.status.replace("_", " ")}
            </Text>
          ))}
        </Card>
      ) : null}

      {open ? (
        <View style={{ gap: space.md }}>
          <Text variant="heading">Offer a time</Text>
          {groups.length === 0 ? (
            <EmptyState
              title="Nothing free that suits them"
              hint="Times that fit their dates, days and hours appear here as they open up."
            />
          ) : null}
          {groups.map((g) => (
            <View key={g.date} style={{ gap: space.sm }}>
              <Text variant="label">{g.heading}</Text>
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: space.sm,
                }}
              >
                {g.slots.map((s) => (
                  <Chip
                    key={`${s.staffId}-${s.start}`}
                    label={slotLabel(s, zone, manyStylists)}
                    selected={false}
                    disabled={offer.isPending}
                    onPress={() => askOffer(s)}
                  />
                ))}
              </View>
            </View>
          ))}
          <Button
            title="Remove from waitlist"
            variant="danger"
            loading={remove.isPending}
            disabled={offer.isPending}
            onPress={askRemove}
          />
        </View>
      ) : null}
    </Screen>
  );
}
