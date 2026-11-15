import { Pressable, View } from "react-native";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Text } from "@/components/ui/Text";
import { duration, money } from "@/lib/format";
import type { Resources } from "@/lib/api/schemas";
import {
  servicesAt,
  summarise,
  toggleService,
  withLocation,
  type Draft,
} from "@/lib/new-booking";
import { space } from "@/theme";

interface Props {
  resources: Resources;
  draft: Draft;
  onChange: (draft: Draft) => void;
}

export function ServicesStep({ resources, draft, onChange }: Props) {
  const services = servicesAt(resources, draft.locationId);
  const summary = summarise(draft, resources);

  return (
    <View style={{ gap: space.md }}>
      {resources.locations.length > 1 ? (
        <View style={{ gap: space.sm }}>
          <Text variant="label">Where</Text>
          <View
            style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}
          >
            {resources.locations.map((l) => (
              <Chip
                key={l.id}
                label={l.name}
                selected={draft.locationId === l.id}
                onPress={() => onChange(withLocation(draft, l.id))}
              />
            ))}
          </View>
        </View>
      ) : null}

      <Text variant="label">Services</Text>
      {draft.locationId === null ? (
        <Text tone="muted">Choose a location first.</Text>
      ) : (
        services.map((s) => {
          const selected = draft.serviceIds.includes(s.id);
          return (
            <Pressable
              key={s.id}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => onChange(toggleService(draft, s.id))}
            >
              <Card tone={selected ? "peach" : "default"}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <Text variant="heading">
                    {selected ? "✓ " : ""}
                    {s.name}
                  </Text>
                  <Text variant="label">{money(s.priceCents)}</Text>
                </View>
                <Text tone="muted">{duration(s.durationMin)}</Text>
              </Card>
            </Pressable>
          );
        })
      )}

      {summary.names.length > 0 ? (
        <Text tone="muted">
          {summary.names.length} selected · {duration(summary.durationMin)} ·
          from {money(summary.listPriceCents)}. Stylist prices can differ; you
          will see the exact price when you choose a time.
        </Text>
      ) : null}
    </View>
  );
}
