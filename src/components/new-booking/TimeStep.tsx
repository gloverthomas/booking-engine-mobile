import { useQuery } from "@tanstack/react-query";
import { ScrollView, View } from "react-native";
import { Chip } from "@/components/ui/Chip";
import { EmptyState, ErrorState, Loading } from "@/components/ui/States";
import { Text } from "@/components/ui/Text";
import { keys } from "@/hooks/queries";
import { api } from "@/lib/api";
import type { Resources } from "@/lib/api/schemas";
import { upcomingDays } from "@/lib/days";
import { money, time } from "@/lib/format";
import { withDate, withStaff, type Draft } from "@/lib/new-booking";
import { space } from "@/theme";

interface Props {
  resources: Resources;
  draft: Draft;
  onChange: (draft: Draft) => void;
}

export function TimeStep({ resources, draft, onChange }: Props) {
  const zone = resources.timezone;
  const days = upcomingDays(zone);
  const canPickStylist = resources.viewer.seesAll && resources.staff.length > 1;

  const slots = useQuery({
    queryKey: keys.availability(
      [
        draft.locationId,
        draft.serviceIds.join(","),
        draft.staffId,
        draft.date,
      ].join("|"),
    ),
    queryFn: () =>
      api.availability({
        locationId: draft.locationId ?? "",
        serviceIds: draft.serviceIds,
        fromDate: draft.date,
        toDate: draft.date,
        staffId: draft.staffId ?? undefined,
      }),
    enabled: draft.locationId !== null && draft.serviceIds.length > 0,
    staleTime: 10_000,
  });

  const staffName = new Map(resources.staff.map((s) => [s.id, s.name]));

  return (
    <View style={{ gap: space.md }}>
      {canPickStylist ? (
        <View style={{ gap: space.sm }}>
          <Text variant="label">Stylist</Text>
          <View
            style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}
          >
            <Chip
              label="First available"
              selected={draft.staffId === null}
              onPress={() => onChange(withStaff(draft, null))}
            />
            {resources.staff.map((s) => (
              <Chip
                key={s.id}
                label={s.name}
                selected={draft.staffId === s.id}
                onPress={() => onChange(withStaff(draft, s.id))}
              />
            ))}
          </View>
        </View>
      ) : null}

      <View style={{ gap: space.sm }}>
        <Text variant="label">Day</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: space.sm }}
        >
          {days.map((d) => (
            <Chip
              key={d.date}
              label={d.label}
              selected={draft.date === d.date}
              onPress={() => onChange(withDate(draft, d.date))}
            />
          ))}
        </ScrollView>
      </View>

      <View style={{ gap: space.sm }}>
        <Text variant="label">Time</Text>
        {slots.isPending ? <Loading /> : null}
        {slots.isError ? (
          <ErrorState
            error={slots.error}
            onRetry={() => void slots.refetch()}
          />
        ) : null}
        {slots.isSuccess && slots.data.slots.length === 0 ? (
          <EmptyState
            title="Nothing free that day"
            hint="Try another day, or another stylist."
          />
        ) : null}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
          {slots.data?.slots.map((s) => (
            <Chip
              key={`${s.staffId}-${s.start}`}
              label={time(s.start, zone)}
              selected={
                draft.slot?.start === s.start &&
                draft.slot.staffId === s.staffId
              }
              onPress={() => onChange({ ...draft, slot: s })}
            />
          ))}
        </View>
        {draft.slot ? (
          <Text tone="muted">
            {staffName.get(draft.slot.staffId) ?? "Stylist"}
            {draft.slot.totalCents !== undefined
              ? ` · ${money(draft.slot.totalCents)}`
              : ""}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
