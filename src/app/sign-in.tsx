import { useState } from "react";
import { TextInput, View } from "react-native";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { config } from "@/lib/config";
import { useSession } from "@/lib/auth/session";
import { radius, space, useTheme } from "@/theme";

export default function SignIn() {
  const { state, signInWithGoogle, signInWithToken } = useSession();
  const t = useTheme();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devToken, setDevToken] = useState("");

  const notice = state.status === "signedOut" ? state.notice : undefined;

  async function run(action: () => Promise<string | null>) {
    setBusy(true);
    setError(null);
    const message = await action();
    setBusy(false);
    if (message) setError(message);
  }

  return (
    <Screen
      contentStyle={{ flexGrow: 1, justifyContent: "center", gap: space.xl }}
    >
      <View style={{ gap: space.sm }}>
        <Text variant="display" uppercase>
          HairMate
        </Text>
        <Text tone="muted">
          Your day, your clients and payments, in your pocket.
        </Text>
      </View>

      {notice ? <Text tone="muted">{notice}</Text> : null}
      {error ? (
        <Text tone="danger" accessibilityRole="alert">
          {error}
        </Text>
      ) : null}

      <View style={{ gap: space.sm }}>
        <Button
          title="Continue with Google"
          loading={busy}
          onPress={() => run(signInWithGoogle)}
        />
        <Text variant="caption" tone="subtle">
          Use the Google account Ryan added for you. There is no password.
        </Text>
      </View>

      {config.devSignIn ? (
        <View style={{ gap: space.sm }}>
          <Text variant="label">Development: paste a session token</Text>
          <TextInput
            value={devToken}
            onChangeText={setDevToken}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Bearer token from staging"
            placeholderTextColor={t.inkSubtle}
            style={{
              borderWidth: 1,
              borderColor: t.lineStrong,
              borderRadius: radius.control,
              padding: space.md,
              color: t.ink,
              backgroundColor: t.surface,
            }}
          />
          <Button
            title="Use token"
            variant="secondary"
            disabled={devToken.trim().length === 0}
            onPress={() => run(() => signInWithToken(devToken))}
          />
        </View>
      ) : null}
    </Screen>
  );
}
