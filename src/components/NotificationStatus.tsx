import { useQuery } from "@tanstack/react-query";
import * as Notifications from "expo-notifications";
import { Linking } from "react-native";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Text } from "@/components/ui/Text";

/** Whether this phone will be notified, with a way to fix it when it will not. */
export function NotificationStatus() {
  const permission = useQuery({
    queryKey: ["notification-permission"],
    queryFn: () => Notifications.getPermissionsAsync(),
    staleTime: 0,
  });
  if (!permission.data) return null;

  const on = permission.data.granted;
  return (
    <Card tone={on ? "default" : "peach"}>
      <Text variant="heading">Notifications {on ? "are on" : "are off"}</Text>
      <Text tone="muted">
        {on
          ? "You will be told when a client books or cancels."
          : "Turn them on in Settings to be told when a client books or cancels."}
      </Text>
      {on ? null : (
        <Button
          title="Open Settings"
          variant="secondary"
          onPress={() => void Linking.openSettings()}
        />
      )}
    </Card>
  );
}
