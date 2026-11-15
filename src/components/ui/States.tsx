import { ActivityIndicator, View } from "react-native";
import { messageFor } from "@/lib/api/client";
import { space, useTheme } from "@/theme";
import { Button } from "./Button";
import { Text } from "./Text";

export function Loading({ label = "Loading" }: { label?: string }) {
  const t = useTheme();
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      style={{ padding: space.xxl, alignItems: "center" }}
    >
      <ActivityIndicator color={t.inkSubtle} />
    </View>
  );
}

export function ErrorState({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry?: () => void;
}) {
  return (
    <View style={{ padding: space.xl, gap: space.md, alignItems: "center" }}>
      <Text variant="heading">That didn&rsquo;t load</Text>
      <Text tone="muted" style={{ textAlign: "center" }}>
        {messageFor(error)}
      </Text>
      {onRetry ? (
        <Button title="Try again" variant="secondary" onPress={onRetry} />
      ) : null}
    </View>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <View style={{ padding: space.xxl, gap: space.xs, alignItems: "center" }}>
      <Text variant="heading">{title}</Text>
      {hint ? (
        <Text tone="muted" style={{ textAlign: "center" }}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}
