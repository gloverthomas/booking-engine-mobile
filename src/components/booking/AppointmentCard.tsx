import { View } from "react-native";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Text } from "@/components/ui/Text";
import { money, time } from "@/lib/format";
import { statusStyle } from "@/lib/status";
import type { BookingStatus } from "@/lib/api/schemas";
import { space } from "@/theme";

export interface AppointmentCardProps {
  start: string;
  end: string;
  zone: string;
  clientName: string;
  services: readonly string[];
  status: BookingStatus;
  totalCents: number;
  /** Shown when the viewer can see more than one stylist. */
  stylist?: { name: string; colour: string };
}

export function AppointmentCard(p: AppointmentCardProps) {
  const summary = p.services.join(" + ") || "Appointment";
  return (
    <Card
      accessible
      accessibilityLabel={`${time(p.start, p.zone)} to ${time(p.end, p.zone)}, ${p.clientName}, ${summary}, ${statusStyle(p.status).label}`}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Text variant="label" tone="muted">
          {time(p.start, p.zone)} – {time(p.end, p.zone)}
        </Text>
        <Badge {...statusStyle(p.status)} />
      </View>
      <Text variant="heading">{p.clientName}</Text>
      <Text tone="muted" numberOfLines={2}>
        {summary}
      </Text>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginTop: space.xs,
        }}
      >
        {p.stylist ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: space.sm,
            }}
          >
            <View
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: p.stylist.colour,
              }}
            />
            <Text variant="caption" tone="muted">
              {p.stylist.name}
            </Text>
          </View>
        ) : (
          <View />
        )}
        <Text variant="label">{money(p.totalCents)}</Text>
      </View>
    </Card>
  );
}
