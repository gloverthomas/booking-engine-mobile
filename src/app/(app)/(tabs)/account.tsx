import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { Alert } from "react-native";
import { NotificationStatus } from "@/components/NotificationStatus";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { useMe, useSession } from "@/lib/auth/session";

const ROLE_LABEL = {
  owner: "Owner",
  manager: "Manager",
  stylist: "Stylist",
  reception: "Reception",
} as const;

export default function Account() {
  const me = useMe();
  const { signOut } = useSession();
  const router = useRouter();
  const canWaitlist = me.permissions.includes("waitlist.manage");

  function confirmSignOut() {
    Alert.alert("Sign out?", "You will need to sign in with Google again.", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => void signOut() },
    ]);
  }

  return (
    <Screen>
      <Card>
        <Text variant="title">{me.name ?? me.email}</Text>
        <Text tone="muted">{me.email}</Text>
        <Text variant="label">{ROLE_LABEL[me.role]}</Text>
      </Card>
      <Card>
        <Text variant="heading">{me.business.name}</Text>
        <Text tone="muted">
          Times shown in {me.business.timezone.replace("_", " ")}
        </Text>
      </Card>
      <Button
        title="My hours"
        variant="secondary"
        onPress={() => router.push("/hours")}
      />
      {canWaitlist ? (
        <Button
          title="Waitlist"
          variant="secondary"
          onPress={() => router.push("/waitlist")}
        />
      ) : null}
      <NotificationStatus />
      <Button title="Sign out" variant="secondary" onPress={confirmSignOut} />
      <Text variant="caption" tone="subtle" style={{ textAlign: "center" }}>
        HairMate {Constants.expoConfig?.version ?? ""}
      </Text>
    </Screen>
  );
}
