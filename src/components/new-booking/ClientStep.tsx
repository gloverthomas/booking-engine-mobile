import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { ErrorState, Loading } from "@/components/ui/States";
import { Text } from "@/components/ui/Text";
import { keys } from "@/hooks/queries";
import { useDebounced } from "@/hooks/use-debounced";
import { api } from "@/lib/api";
import { blankClient, type ClientChoice } from "@/lib/new-booking";
import { space } from "@/theme";

interface Props {
  value: ClientChoice | null;
  onChange: (value: ClientChoice | null) => void;
}

export function ClientStep({ value, onChange }: Props) {
  const [mode, setMode] = useState<"search" | "new">(
    value?.kind === "new" ? "new" : "search",
  );
  const [text, setText] = useState("");
  const q = useDebounced(text.trim(), 250);
  const results = useQuery({
    queryKey: keys.clients(q),
    queryFn: () => api.searchClients(q),
    enabled: mode === "search",
  });

  if (mode === "new") {
    const d = value?.kind === "new" ? value.details : blankClient();
    const set = (patch: Partial<typeof d>) =>
      onChange({ kind: "new", details: { ...d, ...patch } });
    return (
      <View style={{ gap: space.md }}>
        <Field
          label="First name"
          value={d.firstName}
          onChangeText={(v) => set({ firstName: v })}
          autoCapitalize="words"
          textContentType="givenName"
        />
        <Field
          label="Last name"
          value={d.lastName}
          onChangeText={(v) => set({ lastName: v })}
          autoCapitalize="words"
          textContentType="familyName"
        />
        <Field
          label="Mobile"
          value={d.phone}
          onChangeText={(v) => set({ phone: v })}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          placeholder="0412 345 678"
        />
        <Field
          label="Email (optional)"
          value={d.email}
          onChangeText={(v) => set({ email: v })}
          keyboardType="email-address"
          autoCapitalize="none"
          textContentType="emailAddress"
        />
        <Button
          title="Search existing clients instead"
          variant="ghost"
          onPress={() => {
            setMode("search");
            onChange(null);
          }}
        />
      </View>
    );
  }

  return (
    <View style={{ gap: space.md }}>
      {value?.kind === "existing" ? (
        <Card tone="peach">
          <Text variant="label">Booking for</Text>
          <Text variant="heading">{value.name}</Text>
          <Button
            title="Choose someone else"
            variant="ghost"
            onPress={() => onChange(null)}
          />
        </Card>
      ) : (
        <>
          <Field
            label="Find a client"
            value={text}
            onChangeText={setText}
            placeholder="Name, mobile or email"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {results.isPending ? <Loading /> : null}
          {results.isError ? (
            <ErrorState
              error={results.error}
              onRetry={() => void results.refetch()}
            />
          ) : null}
          {results.data?.clients.map((c) => (
            <Pressable
              key={c.id}
              accessibilityRole="button"
              onPress={() =>
                onChange({ kind: "existing", id: c.id, name: c.name })
              }
            >
              <Card>
                <Text variant="heading">{c.name}</Text>
                <Text tone="muted">
                  {c.phone ?? c.email ?? "No contact details"}
                </Text>
                {c.blocked ? (
                  <Text tone="danger">Blocked from online booking</Text>
                ) : null}
              </Card>
            </Pressable>
          ))}
          <Button
            title="New client"
            variant="secondary"
            onPress={() => {
              setMode("new");
              onChange({ kind: "new", details: blankClient() });
            }}
          />
        </>
      )}
    </View>
  );
}
