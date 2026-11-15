import { Switch, View } from "react-native";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Text } from "@/components/ui/Text";
import type { Resources } from "@/lib/api/schemas";
import { dayHeading, duration, money, shortDate, time } from "@/lib/format";
import { summarise, type Draft } from "@/lib/new-booking";
import { space, useTheme } from "@/theme";

interface Props {
  resources: Resources;
  draft: Draft;
  onChange: (draft: Draft) => void;
}

export function ReviewStep({ resources, draft, onChange }: Props) {
  const t = useTheme();
  const zone = resources.timezone;
  const summary = summarise(draft, resources);
  const slot = draft.slot;
  const stylist = resources.staff.find((s) => s.id === slot?.staffId)?.name;
  const clientName =
    draft.client?.kind === "existing"
      ? draft.client.name
      : `${draft.client?.details.firstName ?? ""} ${draft.client?.details.lastName ?? ""}`.trim();

  return (
    <View style={{ gap: space.md }}>
      <Card>
        <Text variant="title">{clientName}</Text>
        {slot ? (
          <Text tone="muted">
            {dayHeading(slot.start, zone)}, {shortDate(slot.start, zone)} ·{" "}
            {time(slot.start, zone)}
            {stylist ? ` · ${stylist}` : ""}
          </Text>
        ) : null}
        <Text>{summary.names.join(" + ")}</Text>
        <Text tone="muted">
          {duration(slot?.durationMin ?? summary.durationMin)} ·{" "}
          {money(slot?.totalCents ?? summary.listPriceCents)}
        </Text>
      </Card>

      <Field
        label="Note (optional)"
        value={draft.comments}
        onChangeText={(comments) => onChange({ ...draft, comments })}
        multiline
        style={{
          minHeight: 72,
          paddingTop: space.sm,
          textAlignVertical: "top",
        }}
      />

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
              Sends the usual confirmation and a reminder. Turn off for a quiet
              booking.
            </Text>
          </View>
          <Switch
            accessibilityLabel="Tell the client"
            value={draft.notifyClient}
            onValueChange={(notifyClient) =>
              onChange({ ...draft, notifyClient })
            }
            trackColor={{ true: t.success }}
          />
        </View>
      </Card>
      <Text variant="caption" tone="subtle">
        No deposit is taken for appointments you make here. Take payment from
        the appointment after.
      </Text>
    </View>
  );
}
