import { Stack } from "expo-router";
import { TerminalBoundary } from "@/components/payment/TerminalBoundary";
import { useTheme } from "@/theme";

export default function AppLayout() {
  const t = useTheme();
  return (
    <TerminalBoundary>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: t.paper },
          headerTintColor: t.ink,
          headerTitleStyle: { color: t.ink },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: t.paper },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="booking/[id]" options={{ title: "Appointment" }} />
        <Stack.Screen
          name="booking/new"
          options={{ title: "New appointment", presentation: "modal" }}
        />
        <Stack.Screen name="client/[id]" options={{ title: "Client" }} />
        <Stack.Screen
          name="booking/pay/[id]"
          options={{
            title: "Take payment",
            presentation: "modal",
            gestureEnabled: false,
          }}
        />
      </Stack>
    </TerminalBoundary>
  );
}
