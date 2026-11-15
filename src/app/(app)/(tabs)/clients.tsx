import { useQuery } from "@tanstack/react-query";
import { Link } from "expo-router";
import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { EmptyState, ErrorState, Loading } from "@/components/ui/States";
import { Text } from "@/components/ui/Text";
import { keys } from "@/hooks/queries";
import { useDebounced } from "@/hooks/use-debounced";
import { api } from "@/lib/api";
import { radius, space, useTheme } from "@/theme";

const DEBOUNCE_MS = 250;

export default function Clients() {
  const t = useTheme();
  const [text, setText] = useState("");
  const q = useDebounced(text.trim(), DEBOUNCE_MS);
  const result = useQuery({
    queryKey: keys.clients(q),
    queryFn: () => api.searchClients(q),
  });

  return (
    <Screen>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="Search name, mobile or email"
        placeholderTextColor={t.inkSubtle}
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
        accessibilityLabel="Search clients"
        style={{
          minHeight: 48,
          borderWidth: 1,
          borderColor: t.lineStrong,
          borderRadius: radius.control,
          paddingHorizontal: space.md,
          color: t.ink,
          backgroundColor: t.surface,
          fontSize: 16,
        }}
      />
      {result.isPending ? <Loading /> : null}
      {result.isError ? (
        <ErrorState
          error={result.error}
          onRetry={() => void result.refetch()}
        />
      ) : null}
      {result.isSuccess && result.data.clients.length === 0 ? (
        <EmptyState
          title="No clients found"
          hint="Try a different spelling, or part of the number."
        />
      ) : null}
      {result.data?.clients.map((c) => (
        <Link
          key={c.id}
          href={{ pathname: "/client/[id]", params: { id: c.id } }}
          asChild
        >
          <Pressable accessibilityRole="link">
            <Card>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <Text variant="heading">{c.name}</Text>
                {c.isVip ? <Text variant="label">VIP</Text> : null}
              </View>
              <Text tone="muted">
                {c.phone ?? c.email ?? "No contact details"}
              </Text>
              {c.blocked ? (
                <Text tone="danger">Blocked from online booking</Text>
              ) : null}
            </Card>
          </Pressable>
        </Link>
      ))}
    </Screen>
  );
}
